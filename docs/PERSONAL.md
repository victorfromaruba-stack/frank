# Personal: the app for Frank's own clients

The membership app sells generated plans to anyone. **Personal** is the other half: the
app Frank's one-to-one clients get as part of training with him. It should feel like a
premium coaching service: the client always knows what to do today and why, and sees
Frank behind every part of it. Frank sees all his clients at a glance and spends his
time coaching, not chasing.

Frank trains in The Hague. He meets clients in person, starting with an assessment of
about 40 minutes, and the app carries the work between sessions. He coaches at several
gyms and trains each client at the one they go to, so every in-person session in the app
names its gym.

## What a client gets

| Part | What it does |
|---|---|
| **Welcome** | Frank invites them by link. Their own home screen: "Personal · with Frank", their goal and their week |
| **Assessment** | The results of Frank's first-session assessment: posture and mobility notes, strength tests, measurements, goals, Frank's summary. Re-tested every 4 to 6 weeks, side by side with the start |
| **This week** | Frank's plan for the week: in-person sessions (day, time, place), home sessions he wrote, walking or cardio targets, rest days |
| **Sessions** | Each home session opens in the player with Frank's video for every move, the weights to use and his note for this client ("left knee: stay above parallel") |
| **Check-in** | Once a week: weight, waist, sleep, energy, stress, soreness, how many sessions they did, a win, a struggle, optional progress photos. Frank answers and adjusts the next week |
| **Food** | Frank's meal plan for them, his guides on eating and recovery, his cooking videos, a shopping list |
| **Progress** | Assessment re-tests, weights lifted, measurements, photos and weight over time |
| **Frank** | One tap to message him, the next session, his notes |

Nutrition advice stays inside Frank's training: no diet plans for anyone who is
pregnant, under 18 or has a medical condition that affects food. Those clients are
referred to a dietitian or doctor, as in the membership app.

## What Frank gets: Coach mode

| Part | What it does |
|---|---|
| **Today** | Who he sees today, where, what they're doing, his prep notes |
| **Clients** | One card each: program week, sessions done this week, last check-in and whether one is overdue, flags (pain, missed sessions) |
| **Client page** | Their gym, assessment, goals, history, notes, program, food plan, check-ins, progress |
| **Program builder** | Weeks built from the 80 moves (and his own videos): copy last week, raise the dose, schedule the in-person sessions |
| **Assessment form** | The same tests every time, so re-tests compare cleanly |
| **Food builder** | Meal plan templates, his guides and videos, assigned per client |
| **Business** | Active clients, renewals, what came through the app |

## How it works: two ways

**A. No server (possible now).** Like today's session links: Frank sends each client
their program as a link, and the client's weekly check-in goes back to Frank as a link
on WhatsApp, which his Coach mode reads in. It's free and private, but manual both ways.
There are no photos (too big for a link), and Frank only sees what clients send.

**B. Accounts and a small server (recommended for Personal).** Clients and Frank sign
in with an email link. Programs, check-ins, photos and status sync by themselves, so
Frank's client cards are always current. That's what makes it feel premium. Supabase
does this with servers in the EU (Frankfurt), free to start, then about $25 a month.
Payments go through the same account (see `docs/ACCOUNTS-AND-PAYMENTS.md`).

## Privacy: health data in the EU

Check-ins, assessments, injuries and photos are health data. Under the GDPR (article 9)
that needs:
- the client's explicit consent;
- a clear privacy notice;
- data kept in the EU;
- a data processing agreement with the hosting company;
- a way for clients to export and delete everything.

Frank is the controller, because these are his clients. Whoever runs the app for him
processes the data for him. Option B needs all of this before the first real client signs
in. Option A keeps data on the phones, but WhatsApp still carries it.

## Decisions needed

1. A or B (or A now, B later).
2. Who pays for and owns the server account and the client data.
3. The Personal price, and whether in-person sessions are booked in the app or by
   message.
4. Frank's video list for Personal: his explanations, his cooking videos.

## Build order

1. A clickable prototype of Personal and Coach mode on example data, to agree on how it
   looks and works. **Done:** `personal/` (serve the repo and open `personal/index.html`),
   or one file to send: `node tools/build-personal.mjs` writes `dist/personal.html`.
   Switch between the client and Frank at the top. A check-in sent as the client shows up
   in Coach mode, Frank's reply and his plan for next week show up for the client. The
   clients, gyms and numbers in it are made up.
2. The data model and screens on the chosen option, A or B.
3. Frank's videos as they're filmed (`docs/FILMING-GUIDE.md`).
