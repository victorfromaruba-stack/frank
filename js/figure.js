/* Wellness by Frank: the moving skeleton that demonstrates every exercise.

   Coordinates: x points forward (+x is where the figure faces), y points up,
   the floor is y = 0 and a standing figure is about 97 units tall.
   Angles: 0 points down, 90 forward, 180 up, -90 back.

   A pose:
     p   pelvis point [x, y]
     t   torso angle (pelvis to shoulders), or s: a shoulder point to aim at
     h   head angle (defaults to the torso's, a neutral neck)
     sp  spine curve: + rounds the back, - arches it
     aN, aF  near and far arm; lN, lF  near and far leg. Each is either
             [upper, lower] angles (a free limb; optional 3rd/4th values scale
             a bone that points at the viewer) or {ik: [x, y], b: [x, y]}:
             a planted hand or foot, b = which way the elbow or knee points.
     fN, fF  foot angles; hN, hF  hand angles (sensible defaults)
     v: 'f'  seen from the front: limb angles are relative to the torso, and
             the far (left) side mirrors the near (right) side.
   Figures always face right when upright: lie on the back with the head to
   the left, on the front with the head to the right. */
(function (W) {
  'use strict';

  var L = { torso: 30, neck: 11, headR: 6.2, ua: 15.5, fa: 14.5, hand: 3.6,
            th: 24, sh: 23, foot: 8, heel: 2.4, hip: 5.8, shoulder: 10.8 };

  function rad(d) { return d * Math.PI / 180; }
  function dir(a) { return [Math.sin(rad(a)), -Math.cos(rad(a))]; }
  function add(a, b, k) { if (k == null) k = 1; return [a[0] + b[0] * k, a[1] + b[1] * k]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function len(v) { return Math.hypot(v[0], v[1]); }
  function unit(v) { var d = len(v) || 1; return [v[0] / d, v[1] / d]; }
  function angOf(v) { return Math.atan2(v[0], -v[1]) * 180 / Math.PI; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function lerp2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
  function wrap180(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }

  // Two-bone IK: root to target with bone lengths a, b; pref picks the bend side.
  function ik(root, target, a, b, pref) {
    var v = sub(target, root), d = len(v);
    var u = d < 1e-6 ? [0, -1] : [v[0] / d, v[1] / d];
    var dc = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, d));
    var cosA = (a * a + dc * dc - b * b) / (2 * a * dc);
    var A = Math.acos(Math.max(-1, Math.min(1, cosA)));
    var n = [-u[1], u[0]];                       // left of the root-target line
    var side = (n[0] * pref[0] + n[1] * pref[1]) >= 0 ? 1 : -1;
    var c = Math.cos(A), s = Math.sin(A) * side;
    var m = [u[0] * c - u[1] * s, u[0] * s + u[1] * c];
    var mid = add(root, m, a);
    var end = add(mid, unit(sub(target, mid)), b);
    return [mid, end];
  }

  function chain(root, spec, a, b, pref) {
    if (Array.isArray(spec)) {
      var mid = add(root, dir(spec[0]), a * (spec[2] == null ? 1 : spec[2]));
      var end = add(mid, dir(spec[1]), b * (spec[3] == null ? 1 : spec[3]));
      return { root: root, mid: mid, end: end, a1: spec[0], a2: spec[1] };
    }
    var r = ik(root, spec.ik, a, b, spec.b || pref);
    return { root: root, mid: r[0], end: r[1], a1: angOf(sub(r[0], root)), a2: angOf(sub(r[1], r[0])) };
  }

  function resolve(P) {
    var front = P.v === 'f';
    var pel = P.p;
    var t = P.t != null ? P.t : (P.s ? angOf(sub(P.s, pel)) : 180);
    var td = dir(t);
    var fw = [td[1], -td[0]];                   // the body's front (side) or its right (front view)
    var sc = add(pel, td, L.torso);
    var h = P.h != null ? P.h : t;
    var head = add(sc, dir(h), L.neck);
    var ctrl = add(add(pel, td, L.torso * 0.5), fw, -(P.sp || 0) * 7);
    var J = { front: front, pel: pel, sc: sc, head: head, h: h, ctrl: ctrl, t: t, fw: fw, back: [-fw[0], -fw[1]] };
    var arm, leg;
    if (!front) {
      J.aN = chain(sc, P.aN || [3, 1], L.ua, L.fa, J.back);
      J.aF = chain(sc, P.aF || P.aN || [3, 1], L.ua, L.fa, J.back);
      J.lN = chain(pel, P.lN || [0, 0], L.th, L.sh, fw);
      J.lF = chain(pel, P.lF || P.lN || [0, 0], L.th, L.sh, fw);
    } else {
      var rel = function (spec, side) {
        return Array.isArray(spec) ? [t - 180 + side * spec[0], t - 180 + side * spec[1], spec[2], spec[3]] : spec;
      };
      J.shR = add(sc, fw, L.shoulder); J.shL = add(sc, fw, -L.shoulder);
      J.hpR = add(pel, fw, L.hip); J.hpL = add(pel, fw, -L.hip);
      J.aN = chain(J.shR, rel(P.aN || [8, 4], 1), L.ua, L.fa, fw);
      J.aF = chain(J.shL, rel(P.aF || P.aN || [8, 4], -1), L.ua, L.fa, J.back);
      J.lN = chain(J.hpR, rel(P.lN || [2, 0], 1), L.th, L.sh, fw);
      J.lF = chain(J.hpL, rel(P.lF || P.lN || [2, 0], -1), L.th, L.sh, J.back);
    }
    ['aN', 'aF'].forEach(function (k, i) {
      var arm = J[k], given = i ? (P.hF != null ? P.hF : P.hN) : P.hN;
      var ha = given != null ? given : (!front && arm.end[1] < 4.5 ? 90 : arm.a2);
      arm.hand = add(arm.end, dir(ha), L.hand);
    });
    ['lN', 'lF'].forEach(function (k, i) {
      var leg = J[k], given = i ? (P.fF != null ? P.fF : P.fN) : P.fN;
      if (front) {
        var out = i ? -1 : 1;
        leg.heel = add(leg.end, fw, -out * 1);
        leg.toe = add(add(leg.end, fw, out * 4.5), [0, -1.2]);
        return;
      }
      var fa = given != null ? given
        : (leg.end[1] < 4.5 && Math.abs(wrap180(leg.a2)) < 55 ? 90 : leg.a2 + 90);
      var fd = dir(fa);
      leg.heel = add(leg.end, fd, -L.heel);
      leg.toe = add(leg.end, fd, L.foot);
    });
    J.props = P.props;
    return J;
  }

  // ---- animation -------------------------------------------------------

  function limbAt(spec, which, J) {
    // a limb spec as an IK spec (target + bend) using its resolved joints
    var c = J[which];
    if (!Array.isArray(spec)) return spec;
    var mid = c.mid, lineMid = lerp2(c.root, c.end, 0.5);
    return { ik: c.end, b: unit(sub(mid, lineMid)) };
  }

  function mixLimb(A, B, ka, kb, which, JA, JB, k) {
    var a = A[which] || (which === 'aF' ? A.aN : which === 'lF' ? A.lN : null);
    var b = B[which] || (which === 'aF' ? B.aN : which === 'lF' ? B.lN : null);
    if (!a && !b) return undefined;
    if (!a) a = b; if (!b) b = a;
    if (Array.isArray(a) && Array.isArray(b)) {
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k),
              lerp(a[2] == null ? 1 : a[2], b[2] == null ? 1 : b[2], k),
              lerp(a[3] == null ? 1 : a[3], b[3] == null ? 1 : b[3], k)];
    }
    var ia = limbAt(a, which, JA), ib = limbAt(b, which, JB);
    var ba = ia.b || (which[0] === 'a' ? JA.back : JA.fw), bb = ib.b || (which[0] === 'a' ? JB.back : JB.fw);
    return { ik: lerp2(ia.ik, ib.ik, k), b: unit(lerp2(ba, bb, k)) };
  }

  function mixNum(a, b, k, fa, fb) {
    var x = a != null ? a : fa, y = b != null ? b : fb;
    if (x == null && y == null) return undefined;
    if (x == null) x = y; if (y == null) y = x;
    return lerp(x, y, k);
  }

  function mix(A, B, k) {
    if (k <= 0) return A;
    if (k >= 1) return B;
    var JA = resolve(A), JB = resolve(B);
    var out = { v: A.v, p: lerp2(A.p, B.p, k), t: lerp(JA.t, JB.t, k), h: lerp(JA.h, JB.h, k),
                sp: lerp(A.sp || 0, B.sp || 0, k), props: A.props };
    ['aN', 'aF', 'lN', 'lF'].forEach(function (w) {
      var m = mixLimb(A, B, null, null, w, JA, JB, k);
      if (m) out[w] = m;
    });
    ['fN', 'fF', 'hN', 'hF'].forEach(function (w) {
      if (A[w] == null && B[w] == null) return;
      var leg = w[0] === 'f', side = w[1] === 'N' ? (leg ? 'lN' : 'aN') : (leg ? 'lF' : 'aF');
      var fa = leg ? JA[side].a2 + 90 : JA[side].a2, fb = leg ? JB[side].a2 + 90 : JB[side].a2;
      if (leg && JA[side].end[1] < 4.5) fa = 90;
      if (leg && JB[side].end[1] < 4.5) fb = 90;
      out[w] = mixNum(A[w], B[w], k, fa, fb);
    });
    return out;
  }

  function ease(k) { return 0.5 - 0.5 * Math.cos(Math.PI * k); }

  // anim: { k: [pose...], d: [seconds per move], h: [seconds held at each pose] }
  // seconds to move from pose i to the next; wrap: the last pose jumps back to the first
  function segment(an, i) {
    if (an.wrap && i === an.k.length - 1) return 0;
    return an.d ? (an.d[i] != null ? an.d[i] : an.d[an.d.length - 1]) : 1;
  }
  function cycleLength(an) {
    var n = an.k.length, s = 0;
    for (var i = 0; i < n; i++) s += segment(an, i) + (an.h ? (an.h[i] || 0) : 0);
    return s;
  }
  function sample(an, time) {
    var n = an.k.length;
    if (n === 1) return an.k[0];
    var T = cycleLength(an);
    var t = ((time % T) + T) % T;
    for (var i = 0; i < n; i++) {
      var hold = an.h ? (an.h[i] || 0) : 0;
      if (t < hold) return an.k[i];
      t -= hold;
      var d = segment(an, i);
      if (t < d) return mix(an.k[i], an.k[(i + 1) % n], an.lin ? t / d : ease(t / d));
      t -= d;
    }
    return an.k[0];
  }

  // ---- geometry for fitting ---------------------------------------------

  function points(J) {
    var out = [J.pel, J.sc, J.head, [J.head[0], J.head[1] + L.headR], [J.head[0], J.head[1] - L.headR],
               [J.head[0] + L.headR, J.head[1]], [J.head[0] - L.headR, J.head[1]]];
    ['aN', 'aF', 'lN', 'lF'].forEach(function (k) {
      var c = J[k]; out.push(c.mid, c.end);
      if (c.hand) out.push(c.hand);
      if (c.toe) out.push(c.toe, c.heel);
    });
    return out;
  }
  function propBox(props) {
    var pts = [];
    (props || []).forEach(function (pr) {
      if (pr.k === 'box' || pr.k === 'pad' || pr.k === 'wedge') { pts.push([pr.x, 0], [pr.x + pr.w, pr.h]); }
      if (pr.k === 'wall') { pts.push([pr.x, 0], [pr.x + (pr.side || 1) * 3, 60]); }
      if (pr.k === 'table') { pts.push([pr.x, 0], [pr.x + pr.w, pr.h]); }
    });
    return pts;
  }
  function fit(an, opt) {
    opt = opt || {};
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var T = cycleLength(an), steps = Math.max(12, an.k.length * 8);
    var take = function (p) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    };
    for (var i = 0; i < steps; i++) {
      var J = resolve(sample(an, (i / steps) * T));
      points(J).forEach(take);
    }
    propBox(an.props).forEach(take);
    take([minX, 0]);
    var pad = opt.pad == null ? 7 : opt.pad;
    minX -= pad; maxX += pad; maxY += pad; minY = Math.min(minY, 0) - (opt.floor == null ? 6 : opt.floor);
    var w = maxX - minX, h = maxY - minY;
    var minW = opt.minW || 0, minH = opt.minH || 0;
    if (w < minW) { minX -= (minW - w) / 2; w = minW; }
    if (h < minH) { maxY += (minH - h); h = minH; }
    var ar = opt.aspect;                           // width / height
    if (ar) {
      if (w / h < ar) { var nw = h * ar; minX -= (nw - w) / 2; w = nw; }
      else { var nh = w / ar; maxY += nh - h; h = nh; }
    }
    return { x: minX, y: -maxY, w: w, h: h };      // SVG coordinates (y down)
  }

  // ---- drawing -------------------------------------------------------------

  function f2(n) { return Math.round(n * 100) / 100; }
  function pt(p) { return f2(p[0]) + ',' + f2(-p[1]); }
  function poly(ps) { return 'M' + ps.map(pt).join('L'); }

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function hexPath(c, r, rot) {
    var s = '';
    for (var i = 0; i < 6; i++) {
      var a = rad(rot + i * 60);
      s += (i ? 'L' : 'M') + pt([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
    return s + 'Z';
  }

  function propsMarkup(props, vb) {
    var s = '';
    (props || []).forEach(function (pr) {
      if (pr.k === 'box') {
        s += '<rect class="fp-solid" x="' + f2(pr.x) + '" y="' + f2(-pr.h) + '" width="' + f2(pr.w) + '" height="' + f2(pr.h) + '" rx="1.5"/>';
      } else if (pr.k === 'pad') {
        s += '<rect class="fp-soft" x="' + f2(pr.x) + '" y="' + f2(-pr.h) + '" width="' + f2(pr.w) + '" height="' + f2(pr.h) + '" rx="1.6"/>';
      } else if (pr.k === 'wedge') {
        s += '<path class="fp-solid" d="' + poly([[pr.x, 0], [pr.x + pr.w, 0], [pr.x, pr.h]]) + 'Z"/>';
      } else if (pr.k === 'wall') {
        var x = pr.x, sd = pr.side || -1, top = -vb.y;
        s += '<path class="fp-line" d="M' + f2(x) + ',0V' + f2(-top) + '"/>';
        for (var y = 6; y < top; y += 7) s += '<path class="fp-hatch" d="M' + f2(x) + ',' + f2(-y) + 'l' + f2(sd * 3.5) + ',3.5"/>';
      } else if (pr.k === 'table') {
        s += '<path class="fp-line" d="M' + f2(pr.x) + ',' + f2(-pr.h) + 'h' + f2(pr.w) + 'M' + f2(pr.x + 2) + ',' + f2(-pr.h) + 'V0M' + f2(pr.x + pr.w - 2) + ',' + f2(-pr.h) + 'V0"/>';
      }
    });
    return s;
  }

  // A figure bound to an exercise's animation.
  function Figure(an, opt) {
    opt = opt || {};
    this.an = an;
    this.opt = opt;
    this.vb = fit(an, { aspect: opt.aspect, minW: opt.minW, minH: opt.minH, pad: opt.pad });
    this.speed = opt.speed || 1;
    this.t0 = 0;
    this.offset = opt.phase || 0;
    this.playing = false;
    this.build();
  }

  Figure.prototype.build = function () {
    var vb = this.vb, o = this.opt;
    var svg = el('svg', { viewBox: [f2(vb.x), f2(vb.y), f2(vb.w), f2(vb.h)].join(' '),
                          class: 'fig' + (o.className ? ' ' + o.className : ''), 'aria-hidden': 'true',
                          preserveAspectRatio: o.align || 'xMidYMax meet' });
    this.svg = svg;
    el('path', { class: 'fg-floor', d: 'M' + f2(vb.x) + ',0H' + f2(vb.x + vb.w) }, svg);
    this.shadow = el('ellipse', { class: 'fg-shadow', cx: 0, cy: 1.2, rx: 16, ry: 1.8 }, svg);
    var stage = el('g', {}, svg);
    if (o.flip) stage.setAttribute('transform', 'translate(' + f2(2 * vb.x + vb.w) + ',0) scale(-1,1)');
    this.stage = stage;
    var props = el('g', { class: 'fg-props' }, stage);
    props.innerHTML = propsMarkup(this.an.props, vb);
    this.ghost = o.ghost ? el('g', { class: 'fg-ghost' }, stage) : null;
    var parts = {};
    var mk = function (name, cls, parent) { parts[name] = el('path', { class: cls }, parent || stage); };
    mk('strapF', 'fg-strap'); mk('strapN', 'fg-strap');
    mk('lF', 'fg-bone fg-far'); mk('fF', 'fg-bone fg-far fg-foot'); mk('aF', 'fg-bone fg-far');
    mk('girdle', 'fg-bone fg-girdle');
    mk('spine', 'fg-spine');
    parts.head = el('circle', { class: 'fg-head', r: L.headR }, stage);
    parts.eye = el('circle', { class: 'fg-eye', r: 0.95 }, stage);
    mk('lN', 'fg-bone fg-near'); mk('fN', 'fg-bone fg-near fg-foot'); mk('aN', 'fg-bone fg-near');
    mk('dbF', 'fg-db'); mk('dbN', 'fg-db');
    parts.ringF = el('circle', { class: 'fg-ring', r: 3 }, stage);
    parts.ringN = el('circle', { class: 'fg-ring', r: 3 }, stage);
    if (!o.bare) {
      parts.joints = el('g', { class: 'fg-joints' }, stage);
      this.jointEls = [];
      for (var i = 0; i < 6; i++) this.jointEls.push(el('circle', { r: 1.75 }, parts.joints));
    }
    this.parts = parts;
    if (o.note && this.an.focus) {
      var g = el('g', { class: 'fg-note' }, svg);
      this.noteArrow = el('path', { class: 'fg-note-line' }, g);
      this.noteHead = el('path', { class: 'fg-note-line' }, g);
      var f = this.an.focus, pos = f.at || 'tr';
      var right = pos[1] === 'r', top = pos[0] === 't';
      var u = vb.w / 100;
      var lx = right ? vb.x + vb.w - 3 * u : vb.x + 3 * u;
      var ly = top ? vb.y + 7 * u : vb.y + vb.h - 9 * u;
      this.noteText = el('text', { class: 'fg-note-text', x: f2(lx), y: f2(ly), 'text-anchor': right ? 'end' : 'start',
                                   'font-size': f2(vb.w * 0.052) }, g);
      this.noteText.textContent = f.label;
      this.noteFrom = [lx + (right ? -4 * u : 4 * u), ly + (top ? 3 * u : -7 * u)];
      this.noteUnit = u;
    }
    if (this.ghost && this.an.k.length > 1) this.drawGhost();
  };

  Figure.prototype.drawGhost = function () {
    // a faint outline of the other end of the movement
    var J = resolve(this.an.k[this.opt.ghostKey == null ? 1 : this.opt.ghostKey]);
    var s = '';
    s += '<path d="' + poly([J.lN.root, J.lN.mid, J.lN.end]) + '"/>';
    s += '<path d="' + poly([J.aN.root, J.aN.mid, J.aN.end, J.aN.hand]) + '"/>';
    s += '<path d="M' + pt(J.pel) + 'Q' + pt(J.ctrl) + ' ' + pt(J.sc) + '"/>';
    s += '<circle cx="' + f2(J.head[0]) + '" cy="' + f2(-J.head[1]) + '" r="' + L.headR + '"/>';
    this.ghost.innerHTML = s;
  };

  Figure.prototype.draw = function (P) {
    var J = resolve(P), p = this.parts, o = this.opt;
    var limb = function (c) { return poly([c.root, c.mid, c.end, c.hand]); };
    var leg = function (c) { return poly([c.root, c.mid, c.end]); };
    var foot = function (c) { return poly([c.heel, c.toe]); };
    p.lF.setAttribute('d', leg(J.lF)); p.fF.setAttribute('d', foot(J.lF));
    p.lN.setAttribute('d', leg(J.lN)); p.fN.setAttribute('d', foot(J.lN));
    p.aF.setAttribute('d', limb(J.aF)); p.aN.setAttribute('d', limb(J.aN));
    p.spine.setAttribute('d', 'M' + pt(J.pel) + 'Q' + pt(J.ctrl) + ' ' + pt(J.sc));
    p.girdle.setAttribute('d', J.front ? poly([J.shL, J.shR]) + poly([J.hpL, J.hpR]) : '');
    p.head.setAttribute('cx', f2(J.head[0])); p.head.setAttribute('cy', f2(-J.head[1]));
    if (J.front) p.eye.setAttribute('r', 0);
    else {
      var hd = dir(J.h), eye = add(add(J.head, [hd[1], -hd[0]], 2.7), hd, 1.3);
      p.eye.setAttribute('cx', f2(eye[0])); p.eye.setAttribute('cy', f2(-eye[1]));
    }
    this.shadow.setAttribute('cx', f2(o.flip ? 2 * this.vb.x + this.vb.w - J.pel[0] : J.pel[0]));
    // equipment that moves with the hands
    var eq = this.an.hold || {};
    var dbd = function (c) { return hexPath(c.end, 4.1, 0); };
    p.dbN.setAttribute('d', eq.db === 'both' || eq.db === 'near' ? dbd(J.aN) : '');
    p.dbF.setAttribute('d', eq.db === 'both' || eq.db === 'far' ? dbd(J.aF) : '');
    if (eq.rings) {
      var top = -this.vb.y;
      p.strapN.setAttribute('d', poly([[J.aN.end[0] + 0.5, top], [J.aN.end[0], J.aN.end[1] + 3]]));
      p.strapF.setAttribute('d', poly([[J.aF.end[0] - 0.5, top], [J.aF.end[0], J.aF.end[1] + 3]]));
      p.ringN.setAttribute('cx', f2(J.aN.end[0])); p.ringN.setAttribute('cy', f2(-J.aN.end[1]));
      p.ringF.setAttribute('cx', f2(J.aF.end[0])); p.ringF.setAttribute('cy', f2(-J.aF.end[1]));
    } else {
      p.ringN.setAttribute('r', 0); p.ringF.setAttribute('r', 0);
    }
    if (this.jointEls) {
      var js = J.front ? [J.aN.mid, J.aF.mid, J.lN.mid, J.lF.mid, J.hpR, J.hpL]
                       : [J.sc, J.aN.mid, J.pel, J.lN.mid, J.lN.end, J.aN.end];
      for (var i = 0; i < js.length; i++) {
        this.jointEls[i].setAttribute('cx', f2(js[i][0]));
        this.jointEls[i].setAttribute('cy', f2(-js[i][1]));
      }
    }
    if (this.noteArrow) this.drawNote(J);
  };

  Figure.prototype.target = function (J) {
    var f = this.an.focus, j = f.j;
    var m = { hip: J.pel, shoulder: J.sc, scapula: lerp2(J.sc, J.pel, 0.12), knee: J.lN.mid,
              ankle: J.lN.end, elbow: J.aN.mid, wrist: J.aN.end, head: J.head,
              ribs: lerp2(J.sc, J.pel, 0.35), spine: J.ctrl, kneeF: J.lF.mid, hipF: J.pel,
              foot: lerp2(J.lN.end, J.lN.toe, 0.4), glute: J.pel, core: lerp2(J.sc, J.pel, 0.6) };
    var p = m[j] || J.pel;
    if (this.opt.flip) p = [2 * this.vb.x + this.vb.w - p[0], p[1]];
    return p;
  };

  Figure.prototype.drawNote = function (J) {
    var to = this.target(J), from = [this.noteFrom[0], -this.noteFrom[1]];
    var v = sub(to, from), d = len(v);
    if (d < 1) return;
    var u = [v[0] / d, v[1] / d];
    var nu = this.noteUnit;
    var end = add(from, u, d - 4.2 * nu);          // stop short of the joint
    var nrm = [-u[1], u[0]];
    var bow = (this.an.focus.bow == null ? 0.22 : this.an.focus.bow) * d;
    var c = add(lerp2(from, end, 0.5), nrm, bow);
    this.noteArrow.setAttribute('d', 'M' + pt(end) + 'Q' + pt(c) + ' ' + pt(from));
    // the head sits at the label: Frank's arrows run from the body part toward its name
    var tan = unit(sub(from, c));
    var l = add(from, [(-tan[0] * 3 - tan[1] * 2) * nu * 0.7, (-tan[1] * 3 + tan[0] * 2) * nu * 0.7]);
    var r = add(from, [(-tan[0] * 3 + tan[1] * 2) * nu * 0.7, (-tan[1] * 3 - tan[0] * 2) * nu * 0.7]);
    this.noteHead.setAttribute('d', poly([l, from, r]));
  };

  Figure.prototype.frame = function (now) {
    if (!this.svg.isConnected) { live.delete(this); return; }
    if (!this.t0) this.t0 = now;
    var t = this.offset + (now - this.t0) / 1000 * this.speed;
    this.draw(sample(this.an, t));
  };

  Figure.prototype.still = function (key) {
    this.draw(this.an.k[key == null ? (this.an.still == null ? 0 : this.an.still) : key]);
    return this;
  };

  Figure.prototype.play = function () {
    if (this.playing) return this;
    this.playing = true;
    this.t0 = 0;
    live.add(this);
    wake();
    return this;
  };
  Figure.prototype.pause = function () {
    if (!this.playing) return this;
    this.playing = false;
    this.offset += this.t0 ? (performance.now() - this.t0) / 1000 * this.speed : 0;
    live.delete(this);
    return this;
  };
  Figure.prototype.mount = function (host) {
    host.textContent = '';
    host.appendChild(this.svg);
    this.still();
    return this;
  };

  var live = new Set(), raf = 0;
  function tick(now) {
    raf = 0;
    if (document.hidden || !live.size) return;
    live.forEach(function (f) { f.frame(now); });
    if (live.size) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && live.size && !document.hidden) raf = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', wake);

  // Helpers for writing poses.
  var H = {
    // a straight body line from a planted point (ankle or knee) to the shoulders at height y
    line: function (anchor, shoulderY, legLen) {
      legLen = legLen == null ? L.th + L.sh : legLen;
      var total = legLen + L.torso, dy = shoulderY - anchor[1];
      var dx = Math.sqrt(Math.max(0, total * total - dy * dy));
      var u = [dx / total, dy / total];
      return { p: add(anchor, u, legLen), s: add(anchor, u, total) };
    },
    // shoulder point for a pelvis point and torso angle
    shoulder: function (p, t) { return add(p, dir(t), L.torso); },
    // angle of the line from a to b
    ang: function (a, b) { return angOf(sub(b, a)); },
    L: L
  };

  W.WBF = W.WBF || {};
  W.WBF.fig = { Figure: Figure, resolve: resolve, sample: sample, fit: fit, H: H, dir: dir, cycle: cycleLength };
})(window);
