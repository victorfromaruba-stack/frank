-- Wellness by Frank: free booking requests for the 2-hour in-person session (js/booking.js).
-- Supabase project cdkopyphjvfxjqhasrae (shared with the Circle and Pidi): this file creates frank_* objects only.
--
-- Who may do what:
--   anon (the app, with the publishable key)  frank_slots(), frank_request(): see open times, send a request.
--                                              Never a SELECT on any frank_* table: RLS is on with no policies,
--                                              and the tables are not granted to anon or authenticated.
--   Frank (anon + his PIN)                     frank_login() gives a session token; frank_admin(), frank_decide(),
--                                              frank_delete(), frank_set_hours(), frank_set_pin(), frank_logout()
--                                              check it. Same pattern as pidi_kitchen_login / pidi_kitchen_ok:
--                                              a bcrypt PIN, a failure count with a lock, an advisory lock around the
--                                              check; the session token is random and stored as a SHA-256 hash.
--
-- Times: the session is 2 hours; Frank's weekly hours are local times in Europe/Amsterdam. A request needs 12 hours'
-- notice and can be up to 28 days ahead. A pending or confirmed request holds its time (the exclusion constraint makes
-- an overlap impossible, also between two requests sent at the same moment); a declined one frees it.
-- Retention (the privacy notice in js/booking.js says so): a request is deleted 30 days after its session date; the
-- spam counter (a salted hash of the caller's IP) after 1 hour.
-- ponytail: the purge runs inside the frank_* calls (every visit to the booking screen and Frank's screen), so with no
-- visits at all it waits for the next one. pg_cron would make it exact if that ever matters.
--
-- The PIN is never in this file: frank_settings.pin_hash starts empty (frank_login says so) and is set apart, with
--   update public.frank_settings set pin_hash = extensions.crypt('<6 digits>', extensions.gen_salt('bf', 8));

create table if not exists public.frank_settings (
  id boolean primary key default true check (id),           -- one row
  pin_hash text not null default '',
  pin_failures integer not null default 0,
  pin_locked_until timestamptz,
  hours jsonb not null default '{}'::jsonb,                 -- {"6": ["09:00", "15:00"]}: ISO weekday (1 Monday) -> from, to
  salt text not null default encode(extensions.gen_random_bytes(16), 'hex')
);
insert into public.frank_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.frank_sessions (
  token_hash text primary key,
  expires_at timestamptz not null
);

create table if not exists public.frank_bookings (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  first_name text not null check (char_length(first_name) between 1 and 60),
  contact text not null check (char_length(contact) between 5 and 120),
  goal text not null default '' check (char_length(goal) <= 500),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (ends_at > starts_at),
  constraint frank_bookings_no_overlap exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status <> 'declined')
);
create index if not exists frank_bookings_created_at on public.frank_bookings (created_at);
create index if not exists frank_bookings_ends_at on public.frank_bookings (ends_at);

create table if not exists public.frank_hits (
  ip_hash text not null,
  at timestamptz not null default now()
);
create index if not exists frank_hits_ip_at on public.frank_hits (ip_hash, at);

alter table public.frank_settings enable row level security;
alter table public.frank_sessions enable row level security;
alter table public.frank_bookings enable row level security;
alter table public.frank_hits enable row level security;
revoke all on public.frank_settings, public.frank_sessions, public.frank_bookings, public.frank_hits from public, anon, authenticated;

-- ---- helpers (not callable through the API) ---------------------------------------------------------------------

create or replace function public.frank_purge()
returns void language sql security definer set search_path = public, extensions as $$
  delete from public.frank_bookings where ends_at < now() - interval '30 days';
  delete from public.frank_hits where at < now() - interval '1 hour';
  delete from public.frank_sessions where expires_at < now();
$$;

-- every open start time: Frank's weekly hours, cut into back-to-back 2-hour sessions from the start of each window,
-- from 12 hours ahead to 28 days ahead, without the times a pending or confirmed request holds
create or replace function public.frank_open_slots()
returns setof timestamptz language sql stable security definer set search_path = public, extensions as $$
  with d as (
    select (now() at time zone 'Europe/Amsterdam')::date + i as day from generate_series(0, 28) i
  ), w as (
    select d.day, s.hours -> extract(isodow from d.day)::int::text as win
    from d cross join public.frank_settings s
  ), m as (
    select day,
           split_part(win ->> 0, ':', 1)::int * 60 + split_part(win ->> 0, ':', 2)::int as a,
           split_part(win ->> 1, ':', 1)::int * 60 + split_part(win ->> 1, ':', 2)::int as b
    from w where jsonb_typeof(win) = 'array'
  ), st as (
    select (m.day + make_interval(mins => m.a + 120 * k)) at time zone 'Europe/Amsterdam' as t
    from m cross join lateral generate_series(0, (m.b - m.a) / 120 - 1) k
  )
  select st.t from st
  where st.t >= now() + interval '12 hours'
    and st.t < now() + interval '28 days'
    and not exists (
      select 1 from public.frank_bookings b
      where b.status <> 'declined' and tstzrange(b.starts_at, b.ends_at) && tstzrange(st.t, st.t + interval '2 hours'))
  order by st.t
$$;

create or replace function public.frank_session_ok(p_token text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select p_token is not null and length(p_token) >= 32 and exists (
    select 1 from public.frank_sessions
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and expires_at > now())
$$;

-- ---- for everyone ---------------------------------------------------------------------------------------------------

create or replace function public.frank_slots()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.frank_purge();
  return jsonb_build_object('ok', true, 'minutes', 120,
    'slots', coalesce((select jsonb_agg(t order by t) from public.frank_open_slots() t), '[]'::jsonb));
end
$$;

-- a request: {ok: true, starts_at, ends_at} or {ok: false, error: privacy | name | contact | goal | busy | slot}
create or replace function public.frank_request(p_start timestamptz, p_name text, p_contact text, p_goal text, p_privacy boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_goal text := btrim(coalesce(p_goal, ''));
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip text;
  v_hash text;
begin
  if p_privacy is not true then return jsonb_build_object('ok', false, 'error', 'privacy'); end if;
  if char_length(v_name) not between 1 and 60 or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'error', 'name');
  end if;
  if char_length(v_contact) > 120 or v_contact ~ '[[:cntrl:]]' or not (
       v_contact ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
       or (v_contact ~ '^\+?[0-9 ().-]+$' and char_length(regexp_replace(v_contact, '[^0-9]', '', 'g')) between 7 and 15)) then
    return jsonb_build_object('ok', false, 'error', 'contact');
  end if;
  if char_length(v_goal) > 500 or v_goal ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' then
    return jsonb_build_object('ok', false, 'error', 'goal');
  end if;

  -- spam: 5 requests an hour from one address, 20 an hour from everyone together
  perform pg_advisory_xact_lock(hashtext('frank-request'));
  v_ip := coalesce(nullif(v_headers ->> 'cf-connecting-ip', ''), btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)));
  select encode(extensions.digest(s.salt || '|' || v_ip, 'sha256'), 'hex') into v_hash from public.frank_settings s;
  if (select count(*) from public.frank_hits where ip_hash = v_hash and at > now() - interval '1 hour') >= 5
     or (select count(*) from public.frank_bookings where created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;
  insert into public.frank_hits (ip_hash) values (v_hash);
  perform public.frank_purge();

  if p_start is null or not exists (select 1 from public.frank_open_slots() t where t = p_start) then
    return jsonb_build_object('ok', false, 'error', 'slot');
  end if;
  begin
    insert into public.frank_bookings (starts_at, ends_at, first_name, contact, goal)
    values (p_start, p_start + interval '2 hours', v_name, v_contact, v_goal);
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'slot');
  end;
  return jsonb_build_object('ok', true, 'starts_at', p_start, 'ends_at', p_start + interval '2 hours');
end
$$;

-- ---- for Frank (PIN, then a session token) --------------------------------------------------------------------------

-- {ok: true, token, expires_at} or {ok: false, error: nopin | locked | pin}. 5 wrong PINs lock it for 15 minutes
create or replace function public.frank_login(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.frank_settings;
  v_token text;
begin
  perform pg_advisory_xact_lock(hashtext('frank-login'));
  select * into s from public.frank_settings where id;
  if s.pin_hash is null or s.pin_hash = '' then return jsonb_build_object('ok', false, 'error', 'nopin'); end if;
  if s.pin_locked_until > now() then return jsonb_build_object('ok', false, 'error', 'locked', 'until', s.pin_locked_until); end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' or extensions.crypt(p_pin, s.pin_hash) is distinct from s.pin_hash then
    update public.frank_settings set
      pin_locked_until = case when pin_failures + 1 >= 5 then now() + interval '15 minutes' else pin_locked_until end,
      pin_failures = case when pin_failures + 1 >= 5 then 0 else pin_failures + 1 end
    where id;
    return jsonb_build_object('ok', false, 'error', 'pin');
  end if;
  update public.frank_settings set pin_failures = 0, pin_locked_until = null where id;
  perform public.frank_purge();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.frank_sessions (token_hash, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '12 hours');
  return jsonb_build_object('ok', true, 'token', v_token, 'expires_at', now() + interval '12 hours');
end
$$;

create or replace function public.frank_logout(p_token text)
returns jsonb language sql security definer set search_path = public, extensions as $$
  delete from public.frank_sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  select '{"ok": true}'::jsonb;
$$;

-- everything Frank's screen shows: every request still kept, and his weekly hours
create or replace function public.frank_admin(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.frank_session_ok(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  perform public.frank_purge();
  return jsonb_build_object('ok', true,
    'hours', (select hours from public.frank_settings where id),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'first_name', b.first_name,
                                          'contact', b.contact, 'goal', b.goal, 'status', b.status, 'created_at', b.created_at)
                       order by b.starts_at)
      from public.frank_bookings b), '[]'::jsonb));
end
$$;

-- confirm a pending request, or decline a pending or confirmed one (that frees its time)
create or replace function public.frank_decide(p_token text, p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.frank_session_ok(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if p_status is null or p_status not in ('confirmed', 'declined') then return jsonb_build_object('ok', false, 'error', 'status'); end if;
  update public.frank_bookings set status = p_status, decided_at = now()
  where id = p_id and (status = 'pending' or (p_status = 'declined' and status = 'confirmed'));
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  return jsonb_build_object('ok', true);
end
$$;

-- a request deleted at once (someone asked Frank to delete their details)
create or replace function public.frank_delete(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.frank_session_ok(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  delete from public.frank_bookings where id = p_id;
  return jsonb_build_object('ok', found);
end
$$;

-- Frank's weekly hours: {"1".."7": ["HH:MM", "HH:MM"]}, from before to; a day left out is not open
create or replace function public.frank_set_hours(p_token text, p_hours jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.frank_session_ok(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if p_hours is null or jsonb_typeof(p_hours) <> 'object' or exists (
       select 1 from jsonb_each(p_hours) e(k, v)
       where k !~ '^[1-7]$' or jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 2
          or jsonb_typeof(v -> 0) <> 'string' or jsonb_typeof(v -> 1) <> 'string'
          or (v ->> 0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (v ->> 1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          or (v ->> 0) >= (v ->> 1)) then
    return jsonb_build_object('ok', false, 'error', 'hours');
  end if;
  update public.frank_settings set hours = p_hours where id;
  return jsonb_build_object('ok', true, 'hours', p_hours);
end
$$;

-- a new 6-digit PIN; every other signed-in phone is signed out
create or replace function public.frank_set_pin(p_token text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.frank_session_ok(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if p_new is null or p_new !~ '^[0-9]{6}$' then return jsonb_build_object('ok', false, 'error', 'pin'); end if;
  perform pg_advisory_xact_lock(hashtext('frank-login'));
  update public.frank_settings set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 8)), pin_failures = 0, pin_locked_until = null where id;
  delete from public.frank_sessions where token_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end
$$;

-- ---- who may call what ----------------------------------------------------------------------------------------------
revoke all on function public.frank_purge(), public.frank_open_slots(), public.frank_session_ok(text) from public, anon, authenticated;
revoke all on function public.frank_slots(), public.frank_request(timestamptz, text, text, text, boolean), public.frank_login(text),
  public.frank_logout(text), public.frank_admin(text), public.frank_decide(text, uuid, text), public.frank_delete(text, uuid),
  public.frank_set_hours(text, jsonb), public.frank_set_pin(text, text) from public, anon, authenticated;
grant execute on function public.frank_slots(), public.frank_request(timestamptz, text, text, text, boolean), public.frank_login(text),
  public.frank_logout(text), public.frank_admin(text), public.frank_decide(text, uuid, text), public.frank_delete(text, uuid),
  public.frank_set_hours(text, jsonb), public.frank_set_pin(text, text) to anon;

notify pgrst, 'reload schema';
