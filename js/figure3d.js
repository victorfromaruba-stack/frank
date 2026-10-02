/* Wellness by Frank: the 3D coach.
   A realistic human (Universal Base Characters by Quaternius, CC0), fitted to the 2D
   engine's proportions and dressed by tools/coach/build_coach.py. Every frame it takes
   the pose the 2D solver in figure.js found for the same keyframes: each bone is aimed
   at the next joint, and the arms reach their targets with two-bone IK, so hands and
   feet stay planted. One WebGL renderer draws every figure, then copies the picture
   into that figure's own 2D canvas, so a page can show many figures without running
   out of GPU contexts. Without WebGL, or until the model has loaded, the app keeps the
   2D skeleton.

   Coordinates: the scene uses the 2D engine's units (x forward, y up, the floor at 0,
   +z the figure's right). The model sits in a holder that turns it to face +x and
   scales its metres to engine units; bone maths happens in the model's own space
   (+z forward, +y up, +x its left). */
(function (W) {
  'use strict';
  var F = W.WBF.fig;
  var T = null, R = null, C = null;
  var SH_W = 10.8, HIP_W = 5.8;                // half shoulder and hip widths, the same as the 3D coach's
  var KIT = 0x3e7fb0, KIT_HI = 0x9fd4f3, MAT = 0x0b4a27;
  var MUSCLES = ['none', 'chest', 'abs', 'obliques', 'front-deltoids', 'back-deltoids', 'biceps', 'triceps',
                 'forearm', 'trapezius', 'upper-back', 'lower-back', 'gluteal', 'abductors', 'adductor',
                 'quadriceps', 'hamstring', 'calves', 'neck', 'head', 'hands', 'feet', 'shins'];
  var V, Yv, Zv, M4;

  function rad(d) { return d * Math.PI / 180; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function warn(what, e) { if (W.console) W.console.warn('3D coach: ' + what, e); }

  // ---- shared renderer and scene ---------------------------------------------------
  function init() {
    if (R) {
      if (R.failed) return false;
      if (!C) loadCoach();
      return !!C;
    }
    if (!W.THREE) return false;
    T = W.THREE;
    V = function (x, y, z) { return new T.Vector3(x, y, z); };
    Yv = V(0, 1, 0); Zv = V(0, 0, 1); M4 = new T.Matrix4();
    try {
      var canvas = document.createElement('canvas');
      var gl = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      gl.setPixelRatio(1);
      gl.setSize(512, 512, false);
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = T.PCFSoftShadowMap;
      gl.outputColorSpace = T.SRGBColorSpace;
      gl.toneMapping = T.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      var scene = new T.Scene();
      if (W.WBF_ROOM) {
        var pm = new T.PMREMGenerator(gl);
        scene.environment = pm.fromScene(new W.WBF_ROOM(), 0.04).texture;
        scene.environmentIntensity = 0.5;
        pm.dispose();
      }
      var cam = new T.PerspectiveCamera(30, 1, 1, 2000);
      scene.add(new T.HemisphereLight(0xffffff, 0xd6dad6, 0.75));
      var key = new T.DirectionalLight(0xfff4ea, 2.4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.5;
      key.shadow.radius = 6;
      scene.add(key); scene.add(key.target);
      var rim = new T.DirectionalLight(0xdcefff, 1.0);
      scene.add(rim); scene.add(rim.target);
      var ground = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.ShadowMaterial({ opacity: 0.2 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.7;
      ground.receiveShadow = true;
      scene.add(ground);
      R = { canvas: canvas, gl: gl, scene: scene, cam: cam, key: key, rim: rim, ground: ground, w: 512, h: 512 };
      R.mat = materials();
      R.kit = kit();
      scene.add(R.kit.group);
      loadCoach();
      return false;
    } catch (e) {
      warn('no WebGL', e);
      R = { failed: true };
      return false;
    }
  }

  // two coaches: m and f. One is shown; the other loads when someone picks it.
  var coaches = {}, want = 'm', pending = {};
  function urlFor(id) {
    var U = W.WBF_COACH_URLS || {};
    return U[id] || (W.WBF_COACH && id === 'm' ? W.WBF_COACH : 'assets/coach-' + id + '.glb');
  }
  function loadCoach() {
    if (C || !W.WBF_GLTF) return;
    fetchCoach(want);
  }
  function fetchCoach(id) {
    if (coaches[id] || pending[id] || !W.WBF_GLTF || !R || R.failed) return;
    pending[id] = true;
    new W.WBF_GLTF().load(urlFor(id), function (g) {
      pending[id] = false;
      var c;
      try { c = coach(g); c.id = id; } catch (e) { warn('model', e); if (!C) R.failed = true; return; }
      coaches[id] = c;
      c.holder.visible = false;
      if (id === want || !C) use(id);
      W.dispatchEvent(new Event('wbf-three'));
    }, undefined, function (e) { pending[id] = false; warn('load', e); if (!C) R.failed = true; });
  }
  function use(id) {
    if (!coaches[id]) return;
    if (C) C.holder.visible = false;
    C = coaches[id];
    C.holder.visible = true;
  }
  // pick the coach figure: 'm' or 'f'. Returns true when it is already showing.
  function setCoach(id) {
    id = id === 'f' ? 'f' : 'm';
    want = id;
    if (coaches[id]) { use(id); return true; }
    fetchCoach(id);
    return false;
  }

  function materials() {
    var m = function (color, extra) {
      var o = { color: color, roughness: 0.62, metalness: 0 };
      for (var k in extra || {}) o[k] = extra[k];
      return new T.MeshStandardMaterial(o);
    };
    return { kit: m(KIT, { roughness: 0.7 }), kitHi: m(KIT_HI, { roughness: 0.55 }), wall: m(0xeceeeb, { roughness: 0.95 }),
             mat: m(MAT, { roughness: 0.9 }), strap: m(0x2c3631, { roughness: 0.85 }), iron: m(0x2b2f2d, { roughness: 0.45, metalness: 0.3 }) };
  }

  function kit() {
    var g = new T.Group(), M = R.mat, parts = {};
    function dumbbell() {
      var d = new T.Group();
      var handle = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 9, 14), M.iron);
      handle.rotation.z = Math.PI / 2;
      d.add(handle);
      [-5.4, 5.4].forEach(function (x) {
        var plate = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 3.2, 6), M.kit);
        plate.rotation.z = Math.PI / 2;
        plate.position.x = x;
        d.add(plate);
      });
      d.traverse(function (o) { o.castShadow = true; });
      return d;
    }
    parts.dbl = dumbbell(); parts.dbr = dumbbell();
    g.add(parts.dbl); g.add(parts.dbr);
    ['l', 'r'].forEach(function (s) {
      var strap = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 1, 8), M.strap);
      strap.castShadow = true;
      var ring = new T.Mesh(new T.TorusGeometry(3.1, 0.6, 10, 28), M.kitHi);
      ring.castShadow = true;
      g.add(strap); g.add(ring);
      parts['strap' + s] = strap; parts['ring' + s] = ring;
    });
    return { group: g, parts: parts };
  }

  // props such as a chair, wall or table: built once per animation
  function propsFor(an) {
    if (an._p3 !== undefined) return an._p3;
    if (!an.props || !an.props.length) { an._p3 = null; return null; }
    var g = new T.Group(), M = R.mat;
    an.props.forEach(function (p) {
      var mesh;
      if (p.k === 'box' || p.k === 'pad') {
        mesh = new T.Mesh(new T.BoxGeometry(p.w, p.h, p.k === 'pad' ? 22 : 34), p.k === 'pad' ? M.kitHi : M.kit);
        mesh.position.set(p.x + p.w / 2, p.h / 2, 0);
      } else if (p.k === 'wedge') {
        var sh = new T.Shape();
        sh.moveTo(p.x, 0); sh.lineTo(p.x + p.w, 0); sh.lineTo(p.x, p.h); sh.closePath();
        mesh = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 26, bevelEnabled: false }), M.kitHi);
        mesh.position.z = -13;
      } else if (p.k === 'wall') {
        mesh = new T.Mesh(new T.BoxGeometry(3, 130, 80), M.wall);
        mesh.position.set(p.x + (p.side === 1 ? 1.5 : -1.5), 65, 0);
      } else if (p.k === 'table') {
        mesh = new T.Group();
        var top = new T.Mesh(new T.BoxGeometry(p.w, 2.6, 64), M.kit);
        top.position.set(p.x + p.w / 2, p.h - 1.3, 0);
        mesh.add(top);
        [[p.x + 2, -29], [p.x + p.w - 2, -29], [p.x + 2, 29], [p.x + p.w - 2, 29]].forEach(function (c) {
          var leg = new T.Mesh(new T.BoxGeometry(2.4, p.h - 2.6, 2.4), M.kit);
          leg.position.set(c[0], (p.h - 2.6) / 2, c[1]);
          mesh.add(leg);
        });
      }
      if (mesh) {
        mesh.traverse(function (o) { o.castShadow = true; o.receiveShadow = true; });
        g.add(mesh);
      }
    });
    an._p3 = g;
    return g;
  }

  // an exercise mat under floor work (lying, kneeling, hands down)
  function matFor(fig) {
    var an = fig.an;
    if (an._m3 !== undefined) return an._m3;
    var T0 = F.cycle(an), n = Math.max(12, an.k.length * 6), floor = false, x0 = Infinity, x1 = -Infinity;
    for (var i = 0; i < n; i++) {
      var J = F.resolve(F.sample(an, (i / n) * T0));
      if ((J.sc[1] < 40 && J.pel[1] < 32) || Math.min(J.lN.mid[1], J.lF.mid[1]) < 4.6 || Math.min(J.aN.end[1], J.aF.end[1]) < 4.6) floor = true;
      [J.pel, J.sc, J.head, J.aN.end, J.aF.end, J.aN.hand, J.aF.hand, J.lN.end, J.lF.end, J.lN.toe, J.lF.toe, J.lN.heel, J.lF.heel].forEach(function (p) {
        if (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
      });
    }
    if (!floor) { an._m3 = null; return null; }
    // a real mat is about 183 x 61 cm: 93 x 31 units
    var mid = (x0 + x1) / 2, len = Math.max(93, x1 - x0 + 14);
    x0 = mid - len / 2; x1 = mid + len / 2;
    (an.props || []).forEach(function (p) {
      if (p.k !== 'wall') return;
      if (p.side === 1) x1 = Math.min(x1, p.x - 1); else x0 = Math.max(x0, p.x + 1);
    });
    len = x1 - x0;
    var front = an.k[0].v === 'f';
    var mesh = new T.Mesh(new T.BoxGeometry(front ? 31 : len, 0.7, front ? len : 31), R.mat.mat);
    mesh.position.set(front ? 0 : (x0 + x1) / 2, -0.35, front ? (x0 + x1) / 2 * (fig.flip ? -1 : 1) : 0);
    mesh.receiveShadow = true;
    an._m3 = mesh;
    return mesh;
  }

  // ---- the model ------------------------------------------------------------------------
  function coach(g) {
    var root = g.scene, json = g.parser.json, ex = json.extras || {};
    var unit = ex.unit || 0.0196;
    var holder = new T.Group();
    holder.rotation.y = Math.PI / 2;
    holder.scale.setScalar(1 / unit);
    holder.add(root);
    R.scene.add(holder);
    var bones = {}, body = null, others = [];
    root.traverse(function (o) {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
        if (o.name === 'Body') body = o; else others.push(o);
      }
    });
    if (!body || !bones.root) throw new Error('unexpected model');
    var order = [], rest = {};
    (function walk(b) { order.push(b.name); b.children.forEach(function (k) { if (k.isBone) walk(k); }); })(bones.root);
    order.forEach(function (n) {
      var b = bones[n], p = b.parent && b.parent.isBone ? rest[b.parent.name] : null;
      var lq = b.quaternion.clone(), lp = b.position.clone();
      rest[n] = { b: b, parent: p ? b.parent.name : null, lq: lq, lp: lp,
                  wq: p ? p.wq.clone().multiply(lq) : lq.clone(),
                  wp: p ? lp.clone().applyQuaternion(p.wq).add(p.wp) : lp.clone() };
    });
    var P = function (n) { return rest[n].wp; };
    var c = { unit: unit, holder: holder, body: body, others: others, rest: rest, order: order,
              palm: ex.palm || 0.033, len: {}, dir: {}, fing: {}, mid: {} };
    (ex.muscles || MUSCLES).forEach(function (m, i) { c.mid[m] = i; });
    c.hipOff = P('thigh_l').clone().add(P('thigh_r')).multiplyScalar(0.5).sub(P('pelvis'));
    ['l', 'r'].forEach(function (sd) {
      var seg = function (a, b) { return P(b + '_' + sd).clone().sub(P(a + '_' + sd)); };
      c.len['ua' + sd] = seg('upperarm', 'lowerarm').length();
      c.len['fa' + sd] = seg('lowerarm', 'hand').length();
      c.dir['ua' + sd] = seg('upperarm', 'lowerarm').normalize();
      c.dir['fa' + sd] = seg('lowerarm', 'hand').normalize();
      c.dir['hd' + sd] = seg('hand', 'middle_01').normalize();
      c.dir['th' + sd] = seg('thigh', 'calf').normalize();
      c.dir['sh' + sd] = seg('calf', 'foot').normalize();
      // fingers curl toward the palm, which faces down in the rest pose
      ['index', 'middle', 'ring', 'pinky', 'thumb'].forEach(function (f) {
        for (var k = 1; k <= 3; k++) {
          var n = f + '_0' + k + '_' + sd, nx = f + (k === 3 ? '_04_leaf_' : '_0' + (k + 1) + '_') + sd;
          if (!rest[n] || !rest[nx]) continue;
          var d = P(nx).clone().sub(P(n)).normalize();
          var toward = f === 'thumb' ? P('middle_01_' + sd).clone().sub(P(n)).normalize().add(V(0, -1, 0)) : V(0, -1, 0);
          var axis = V(0, 0, 0).crossVectors(d, toward);
          if (axis.lengthSq() < 1e-8) continue;
          c.fing[n] = axis.normalize().applyQuaternion(rest[n].wq.clone().invert());
        }
      });
    });
    // skin colour for the muscle view; the dressed texture is the default
    c.cloth = body.material.map;
    var mx = json.materials && json.materials[0] && json.materials[0].extras;
    if (mx && mx.skinTexture != null) {
      g.parser.getDependency('texture', mx.skinTexture).then(function (t) {
        t.colorSpace = T.SRGBColorSpace; t.flipY = false; c.skin = t;
      }).catch(function () { /* the dressed model still works */ });
    }
    // muscle highlight: every vertex carries its muscle group (_muscle)
    c.hl = { value: new Float32Array(32) };
    c.mode = { value: 0 };
    var m = body.material;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uHL = c.hl;
      sh.uniforms.uMode = c.mode;
      sh.vertexShader = 'attribute float _muscle;\nuniform float uHL[32];\nvarying float vHL;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvHL = uHL[int(_muscle + 0.5)];');
      sh.fragmentShader = 'uniform float uMode;\nvarying float vHL;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' +
          '\tfloat lu = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));\n' +
          '\tif (uMode > 1.5) { diffuseColor.rgb = vec3(0.035, 0.05, 0.042) * (0.7 + lu); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.36, 0.66), clamp(vHL, 0.0, 1.0)); }\n' +
          '\telse { if (uMode > 0.5) diffuseColor.rgb = vec3(0.62, 0.64, 0.67) * (0.55 + lu);\n' +
          '\t  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.04, 0.02), clamp(vHL, 0.0, 1.0) * 0.92); }');
    };
    m.customProgramCacheKey = function () { return 'wbf-coach-3'; };
    m.needsUpdate = true;
    // vertices that find the floor
    var count = body.geometry.attributes.position.count, step = Math.max(1, Math.floor(count / 500));
    c.probe = [];
    for (var i = 0; i < count; i += step) c.probe.push(i);
    return c;
  }

  // ---- pose: from the 2D solver's joints to bone rotations ------------------------------
  function frameQ(u, f) {
    // the rotation whose y axis is u and whose z axis is f (made perpendicular)
    var y = u.clone().normalize();
    var z = f.clone().addScaledVector(y, -f.dot(y));
    if (z.lengthSq() < 1e-8) { z = Math.abs(y.z) < 0.9 ? V(0, 0, 1) : V(1, 0, 0); z.addScaledVector(y, -z.dot(y)); }
    z.normalize();
    var x = V(0, 0, 0).crossVectors(y, z);
    M4.makeBasis(x, y, z);
    return new T.Quaternion().setFromRotationMatrix(M4);
  }
  // the turn that takes a rest frame (ur, fr) onto a target frame (ut, ft)
  function delta(ut, ft, ur, fr) { return frameQ(ut, ft).multiply(frameQ(ur, fr).invert()); }
  function perp(v, u) { return v.clone().addScaledVector(u, -v.dot(u)); }
  // where a limb's front faces: carried along by the swing from hanging straight down
  function swingRef(from, to, ref, fallbackAxis) {
    var axis = V(0, 0, 0).crossVectors(from, to), sn = axis.length(), cs = from.dot(to);
    if (sn < 1e-4) {
      if (cs > 0) return ref.clone();
      axis = fallbackAxis.clone();
    } else axis.divideScalar(sn);
    return ref.clone().applyAxisAngle(axis, Math.atan2(sn, cs));
  }

  // 3D joint positions for a resolved 2D pose (engine units)
  function joints(J, an, flip) {
    var out = {}, front = J.front, mz = flip ? -1 : 1;
    var P = front ? function (p, d) { return V(d || 0, p[1], p[0] * mz); }
                  : function (p, z) { return V(p[0], p[1], (z || 0) * mz); };
    var hz = an.handsZ != null ? an.handsZ : SH_W, fz = an.feetZ != null ? an.feetZ : HIP_W;
    out.pel = P(J.pel); out.ctrl = P(J.ctrl); out.sc = P(J.sc); out.head = P(J.head);
    ['N', 'F'].forEach(function (s, i) {
      var sg = i ? -1 : 1, arm = J['a' + s], leg = J['l' + s];
      if (front) {
        out['sh' + s] = P(arm.root); out['el' + s] = P(arm.mid); out['wr' + s] = P(arm.end); out['hd' + s] = P(arm.hand);
        out['hp' + s] = P(leg.root); out['kn' + s] = P(leg.mid); out['an' + s] = P(leg.end);
        // a forearm drawn shorter than it is points at the viewer
        var fore = out['wr' + s].clone().sub(out['el' + s]);
        if (fore.length() < F.H.L.fa * 0.92) {
          var dz = Math.sqrt(Math.max(0, F.H.L.fa * F.H.L.fa - fore.lengthSq()));
          out['wr' + s].x += dz; out['hd' + s].x += dz + 2;
        }
        out['he' + s] = out['an' + s].clone().add(V(-2.4, 0, 0));
        out['to' + s] = out['an' + s].clone().add(V(8, out['an' + s].y < 4.6 ? 0 : -1.2, sg * 0.8 * mz));
      } else {
        out['sh' + s] = P(arm.root, sg * SH_W);
        out['el' + s] = P(arm.mid, sg * lerp(SH_W, hz, 0.45));
        out['wr' + s] = P(arm.end, sg * hz);
        out['hd' + s] = P(arm.hand, sg * hz);
        out['hp' + s] = P(leg.root, sg * HIP_W);
        out['kn' + s] = P(leg.mid, sg * lerp(HIP_W, fz, 0.5));
        out['an' + s] = P(leg.end, sg * fz);
        out['he' + s] = P(leg.heel, sg * fz);
        out['to' + s] = P(leg.toe, sg * (fz + 1));
      }
    });
    out.fwd = front ? V(1, 0, 0) : V(J.fw[0], J.fw[1], 0);
    var hd = F.dir(J.h);
    out.headDir = front ? V(0, hd[1], hd[0] * mz).normalize() : V(hd[0], hd[1], 0);
    out.face = front ? V(1, 0, 0) : V(hd[1], -hd[0], 0);
    return out;
  }

  // what a planted hand rests on: the floor, the top of a box, a wall, or the edge of a table it grips
  function support(an, wr, hd) {
    var flat = Math.abs(hd.y - wr.y) < 0.8, hit = null;
    if (wr.y < 4.6) return { y: 0 };                 // on the floor: the hand lies flat
    (an.props || []).forEach(function (p) {
      if (hit) return;
      if (flat && (p.k === 'box' || p.k === 'pad') && wr.x > p.x - 3 && wr.x < p.x + p.w + 3 && wr.y > p.h - 1 && wr.y < p.h + 4.6) hit = { y: p.h };
      if (p.k === 'table' && wr.x > p.x - 4 && wr.x < p.x + p.w && Math.abs(wr.y - p.h) < 3) hit = { y: p.h, grip: true };
      if (p.k === 'wall' && Math.abs(wr.x - p.x) < 5 && wr.y > 20) hit = { wall: p.x, side: p.side || -1 };
    });
    return hit;
  }

  function solve(j, fig) {
    var c = C, s = c.unit, rest = c.rest, an = fig.an;
    var A = function (p) { return V(-p.z * s, p.y * s, p.x * s); };   // engine point -> model metres
    var D = function (v) { return V(-v.z, v.y, v.x).normalize(); };    // engine direction -> model
    var Wq = {}, Wp = {};
    var place = function (n, q) {          // a bone under its posed parent; q: its world turn, or null to keep the rest bend
      var r = rest[n], pn = r.parent;
      Wp[n] = pn ? r.lp.clone().applyQuaternion(Wq[pn]).add(Wp[pn]) : r.lp.clone();
      Wq[n] = q || (pn ? Wq[pn].clone().multiply(r.lq) : r.lq.clone());
    };
    // trunk
    var pel = A(j.pel), ctrl = A(j.ctrl), sc = A(j.sc);
    var upL = ctrl.clone().sub(pel), upU = sc.clone().sub(ctrl);
    if (upL.lengthSq() < 1e-10) upL = sc.clone().sub(pel);
    if (upU.lengthSq() < 1e-10) upU = upL.clone();
    upL.normalize(); upU.normalize();
    var fwd = D(j.fwd), lat = V(0, 0, 0).crossVectors(upU, fwd).normalize();
    place('root', null);
    var trunk = function (fix) {             // returns where the shoulders end up
      var qP = fix.clone().multiply(delta(upL, fwd, Yv, Zv));
      Wq.pelvis = qP.clone().multiply(rest.pelvis.wq);
      Wp.pelvis = pel.clone().sub(c.hipOff.clone().applyQuaternion(qP));
      var spine = function (k) { return fix.clone().multiply(delta(upL.clone().lerp(upU, k).normalize(), fwd, Yv, Zv)); };
      place('spine_01', spine(0.4).multiply(rest.spine_01.wq));
      place('spine_02', spine(0.75).multiply(rest.spine_02.wq));
      place('spine_03', spine(1).multiply(rest.spine_03.wq));
      place('clavicle_l', null); place('clavicle_r', null);
      return rest.upperarm_l.lp.clone().applyQuaternion(Wq.clavicle_l).add(Wp.clavicle_l)
        .add(rest.upperarm_r.lp.clone().applyQuaternion(Wq.clavicle_r).add(Wp.clavicle_r)).multiplyScalar(0.5);
    };
    // the model's shoulders sit a little behind its spine: turn the trunk about the hips so they land where the 2D shoulders are
    var sm = trunk(new T.Quaternion()).sub(pel), want = sc.clone().sub(pel);
    if (sm.lengthSq() > 1e-10 && want.lengthSq() > 1e-10) trunk(new T.Quaternion().setFromUnitVectors(sm.normalize(), want.normalize()));
    var hd = D(j.headDir), face = D(j.face);
    place('neck_01', delta(upU.clone().add(hd).normalize(), face, Yv, Zv).multiply(rest.neck_01.wq));
    place('Head', delta(hd, face, Yv, Zv).multiply(rest.Head.wq));

    var armOf = j.shN.z >= j.shF.z ? { r: 'N', l: 'F' } : { r: 'F', l: 'N' };
    var legOf = j.hpN.z >= j.hpF.z ? { r: 'N', l: 'F' } : { r: 'F', l: 'N' };
    var hold = an.hold || {}, info = { curl: {}, palm: {}, hand: {}, side: armOf };
    var palmU = c.palm / s, palmRest = V(0, -1, 0);

    ['l', 'r'].forEach(function (sd) {
      var e = armOf[sd], wr = j['wr' + e], hdp = j['hd' + e];
      var S = rest['upperarm_' + sd].lp.clone().applyQuaternion(Wq['clavicle_' + sd]).add(Wp['clavicle_' + sd]);
      var sup = support(an, wr, hdp), wrT = wr.clone(), hdirE = hdp.clone().sub(wr), palmE = null;
      if (sup && sup.grip) { wrT.y = sup.y + palmU; hdirE = V(1, 0, 0); palmE = V(0, -1, 0); }
      else if (sup && sup.y != null) {
        wrT.y = sup.y + palmU; hdirE.y = 0; palmE = V(0, -1, 0);
        if (hdirE.lengthSq() < 0.5) hdirE = j.fwd.clone().setY(0).lengthSq() > 0.01 ? j.fwd.clone().setY(0) : V(1, 0, 0);
      }
      else if (sup && sup.wall != null) { wrT.x = sup.wall - (sup.side === 1 ? 1 : -1) * palmU; hdirE = V(0, 1, 0); palmE = V(sup.side === 1 ? 1 : -1, 0, 0); }
      // two-bone IK, the elbow bending the way the 2D elbow does
      var Wt = A(wrT), Et = A(j['el' + e]);
      var a = c.len['ua' + sd], b = c.len['fa' + sd];
      var d = Wt.clone().sub(S), dist = d.length();
      var dn = dist > 1e-6 ? d.divideScalar(dist) : upU.clone().negate();
      var dc = Math.min(a + b - 1e-5, Math.max(Math.abs(a - b) + 1e-5, dist));
      var pole = perp(Et.clone().sub(S), dn);
      if (pole.lengthSq() < 1e-10) pole = perp(lat.clone().multiplyScalar(sd === 'l' ? 1 : -1).add(upU.clone().multiplyScalar(-0.3)), dn);
      pole.normalize();
      var cosA = (a * a + dc * dc - b * b) / (2 * a * dc), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      var E = S.clone().addScaledVector(dn, a * cosA).addScaledVector(pole, a * sinA);
      var Wr = S.clone().addScaledVector(dn, dc);
      var u1 = E.clone().sub(S).normalize(), u2 = Wr.clone().sub(E).normalize();
      // the arm's front (elbow crease): from the bend, or carried from hanging when the arm is straight
      var fref = swingRef(upU.clone().negate(), u1, fwd, fig.front ? fwd : lat);
      var fb = perp(u2, u1), wb = smooth(0.05, 0.25, fb.length());
      var f1 = perp(fref, u1).normalize().multiplyScalar(1 - wb).add(fb.normalize().multiplyScalar(wb));
      Wp['upperarm_' + sd] = S;
      Wq['upperarm_' + sd] = delta(u1, f1, c.dir['ua' + sd], Zv).multiply(rest['upperarm_' + sd].wq);
      var f1o = perp(f1, u1).normalize();
      var f2 = f1o.clone().multiplyScalar(u2.dot(u1)).addScaledVector(u1, -u2.dot(f1o));
      var qFa = delta(u2, f2, c.dir['fa' + sd], Zv);
      place('lowerarm_' + sd, qFa.clone().multiply(rest['lowerarm_' + sd].wq));
      // hand: flat on what it rests on, otherwise in line with the forearm
      var hdir = hdirE.lengthSq() > 1e-8 ? D(hdirE) : u2.clone();
      var palm = palmE ? D(palmE) : palmRest.clone().applyQuaternion(qFa);
      place('hand_' + sd, delta(hdir, palm, c.dir['hd' + sd], palmRest).multiply(rest['hand_' + sd].wq));
      var holding = hold.db === 'both' || (hold.db === 'near' && e === 'N') || (hold.db === 'far' && e === 'F');
      info.curl[sd] = holding ? 1 : hold.rings ? 0.85 : sup && sup.grip ? 0.55 : sup ? 0.05 : 0.38;
      info.hold = info.hold || {};
      info.hold[sd] = holding;
      info.palm[sd] = Wp['hand_' + sd].clone().addScaledVector(hdir, 0.075).addScaledVector(palm, 0.03);
      info.hand[sd] = { dir: hdir, palm: palm };
    });

    ['l', 'r'].forEach(function (sd) {
      var e = legOf[sd];
      var Hp = rest['thigh_' + sd].lp.clone().applyQuaternion(Wq.pelvis).add(Wp.pelvis);
      var u1 = A(j['kn' + e]).sub(A(j['hp' + e])).normalize(), u2 = A(j['an' + e]).sub(A(j['kn' + e])).normalize();
      var soleE = j['to' + e].clone().sub(j['he' + e]);
      if (j['an' + e].y < 4.6) soleE.y = 0;
      var sole = soleE.lengthSq() > 1e-8 ? D(soleE) : fwd.clone();
      // kneecap: away from the bend, or toward the toes when the leg is straight
      var fs = perp(sole, u1), fsl = fs.length();
      var fref = fsl > 0.35 ? fs.divideScalar(fsl) : perp(swingRef(upL.clone().negate(), u1, fwd, lat), u1).normalize();
      var fb = perp(u2, u1), wb = smooth(0.04, 0.2, fb.length());
      var f1 = fref.multiplyScalar(1 - wb).addScaledVector(fb.normalize(), -wb);
      Wp['thigh_' + sd] = Hp;
      Wq['thigh_' + sd] = delta(u1, f1, c.dir['th' + sd], Zv).multiply(rest['thigh_' + sd].wq);
      var f1o = perp(f1, u1).normalize();
      var f2 = f1o.clone().multiplyScalar(u2.dot(u1)).addScaledVector(u1, -u2.dot(f1o));
      place('calf_' + sd, delta(u2, f2, c.dir['sh' + sd], Zv).multiply(rest['calf_' + sd].wq));
      // foot: the sole along the 2D foot, its top toward the shin
      var n = perp(u2.clone().negate(), sole);
      if (n.lengthSq() < 1e-6) n = f2.clone();
      place('foot_' + sd, delta(n.normalize(), sole, Yv, Zv).multiply(rest['foot_' + sd].wq));
      place('ball_' + sd, null);
      // toes bend up rather than go through the floor
      var ball = Wp['ball_' + sd], leaf = rest['ball_leaf_' + sd].lp;
      var tipY = function (q) { return leaf.clone().applyQuaternion(q).add(ball).y; };
      if (tipY(Wq['ball_' + sd]) < 0.006 && ball.y > 0.004) {
        var tdir = leaf.clone().applyQuaternion(Wq['ball_' + sd]).normalize();
        var axis = V(0, 0, 0).crossVectors(tdir, n);
        if (axis.lengthSq() > 1e-8) {
          axis.normalize();
          for (var deg = 6; deg <= 84; deg += 6) {
            var q = new T.Quaternion().setFromAxisAngle(axis, rad(deg)).multiply(Wq['ball_' + sd]);
            if (tipY(q) >= 0.006 || deg === 84) { Wq['ball_' + sd] = q; break; }
          }
        }
      }
    });

    // world turns to local turns
    c.order.forEach(function (n) {
      if (!Wq[n]) return;
      var r = rest[n], b = r.b, pn = r.parent;
      if (pn && Wq[pn]) b.quaternion.copy(Wq[pn].clone().invert().multiply(Wq[n]));
      else b.quaternion.copy(Wq[n]);
      if (n === 'pelvis') b.position.copy(Wp.pelvis.clone().sub(Wp[pn]).applyQuaternion(Wq[pn].clone().invert()));
    });
    // fingers: relaxed, flat on the floor, or closed around a handle
    ['l', 'r'].forEach(function (sd) {
      var k = info.curl[sd];
      ['index', 'middle', 'ring', 'pinky', 'thumb'].forEach(function (f) {
        for (var i = 1; i <= 3; i++) {
          var n = f + '_0' + i + '_' + sd, r = rest[n];
          if (!r || !c.fing[n]) continue;
          var ang = k * (f === 'thumb' ? [0.15, 0.3, 0.35][i - 1] : [0.95, 1.3, 0.8][i - 1]);
          r.b.quaternion.copy(r.lq).multiply(new T.Quaternion().setFromAxisAngle(c.fing[n], ang));
        }
      });
    });
    return info;
  }

  // lift or lower the whole figure so its lowest point over the move touches the floor
  function groundFor(fig) {
    var an = fig.an;
    var gk = '_g3' + C.id;
    if (an[gk] != null) return an[gk];
    var T0 = F.cycle(an), n = Math.max(8, Math.min(24, an.k.length * 6)), lo = Infinity, v = V(0, 0, 0), body = C.body;
    C.holder.position.y = 0;
    for (var i = 0; i < n; i++) {
      solve(joints(F.resolve(F.sample(an, (i / n) * T0)), an, fig.flip), fig);
      C.holder.updateMatrixWorld(true);
      for (var k = 0; k < C.probe.length; k++) {
        body.getVertexPosition(C.probe[k], v);
        v.applyMatrix4(body.matrixWorld);
        if (v.y < lo) lo = v.y;
      }
    }
    an[gk] = isFinite(lo) ? Math.max(-6, Math.min(6, -lo)) : 0;
    return an[gk];
  }

  function placeKit(fig, info) {
    var K = R.kit.parts, hold = fig.an.hold || {}, hq = C.holder;
    var toWorld = function (p) { return hq.localToWorld(p.clone()); };
    var dirWorld = function (d) { return d.clone().applyQuaternion(hq.quaternion).normalize(); };
    ['l', 'r'].forEach(function (sd) {
      var db = K['db' + sd], on = !!(info.hold && info.hold[sd]);
      db.visible = on;
      if (on) {
        db.position.copy(toWorld(info.palm[sd]));
        var h = info.hand[sd], across = V(0, 0, 0).crossVectors(h.dir, h.palm).normalize();
        db.quaternion.setFromUnitVectors(V(1, 0, 0), dirWorld(across));
      }
      var ringOn = !!hold.rings;
      K['strap' + sd].visible = K['ring' + sd].visible = ringOn;
      if (ringOn) {
        var p = toWorld(info.palm[sd]);
        var top = V(p.x, fig.box.top + 40, p.z), bottom = p.clone().add(V(0, 3.1, 0));
        var dv = top.clone().sub(bottom), len = dv.length();
        K['strap' + sd].position.copy(bottom).add(top).multiplyScalar(0.5);
        K['strap' + sd].quaternion.setFromUnitVectors(V(0, 1, 0), dv.divideScalar(len));
        K['strap' + sd].scale.set(1, len, 1);
        K['ring' + sd].position.copy(p);
        K['ring' + sd].rotation.set(0, Math.PI / 2, 0);
      }
    });
  }

  // muscle view: grey body, the muscles a move works in red
  function shade(fig) {
    var muscle = fig.mode === 'muscle' || fig.mode === 'map';
    C.mode.value = fig.mode === 'map' ? 2 : muscle ? 1 : 0;
    C.body.material.map = muscle && C.skin ? C.skin : C.cloth;
    C.others.forEach(function (o) { o.visible = !muscle; });
    C.hl.value.fill(0);
    if (!muscle && !fig.opt.light) return;
    var mus = fig.an.mus || {};
    (mus.p || []).forEach(function (m) { if (C.mid[m] != null) C.hl.value[C.mid[m]] = 1; });
    (mus.s || []).forEach(function (m) { if (C.mid[m] != null && !C.hl.value[C.mid[m]]) C.hl.value[C.mid[m]] = 0.45; });
  }

  // ---- camera ------------------------------------------------------------------------------
  function samplePoints(fig) {
    var an = fig.an, T0 = F.cycle(an), n = Math.max(12, an.k.length * 8), pts = [];
    for (var i = 0; i < n; i++) {
      var J = F.resolve(F.sample(an, (i / n) * T0));
      var j = joints(J, an, fig.flip);
      ['pel', 'sc', 'head'].forEach(function (k) { pts.push(j[k]); });
      pts.push(j.head.clone().add(V(0, 8.5, 0)));
      ['N', 'F'].forEach(function (s) { ['sh', 'el', 'wr', 'hd', 'kn', 'an', 'he', 'to'].forEach(function (k) { pts.push(j[k + s]); }); });
    }
    (an.props || []).forEach(function (p) {
      if (p.k === 'wall') return;
      var z = p.k === 'table' ? 20 : 12;
      pts.push(V(p.x, 0, -z), V(p.x + p.w, p.h, z));
    });
    var box = new T.Box3().setFromPoints(pts);
    box.min.y = Math.min(box.min.y, 0);
    fig.box = { min: box.min, max: box.max, top: box.max.y };
    return pts;
  }

  function aim(fig, w, h) {
    var cam = R.cam, aspect = w / h;
    var yaw = rad(fig.yaw), pitch = rad(fig.pitch);
    var dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    var c = fig.box.min.clone().add(fig.box.max).multiplyScalar(0.5);
    var fwd = dir.clone().negate(), right = V(0, 0, 0).crossVectors(fwd, Yv).normalize(), up = V(0, 0, 0).crossVectors(right, fwd);
    var hw = 0, hh = 0, dz = 0, tmp = V(0, 0, 0);
    fig.pts.forEach(function (p) {
      tmp.subVectors(p, c);
      hw = Math.max(hw, Math.abs(tmp.dot(right)));
      hh = Math.max(hh, Math.abs(tmp.dot(up)));
      dz = Math.max(dz, tmp.dot(dir));
    });
    hw = hw * 1.1 + 4; hh = hh * 1.1 + 4;
    var vf = rad(cam.fov) / 2, hf = Math.atan(Math.tan(vf) * aspect);
    var d = Math.max(hh / Math.tan(vf), hw / Math.tan(hf)) + dz;
    cam.aspect = aspect;
    cam.position.copy(c).add(dir.multiplyScalar(d));
    cam.near = Math.max(1, d - 400); cam.far = d + 400;
    cam.lookAt(c);
    cam.updateProjectionMatrix();
    // lights follow the figure
    var size = Math.max(fig.box.max.x - fig.box.min.x, fig.box.max.y - fig.box.min.y, fig.box.max.z - fig.box.min.z) * 0.75 + 30;
    var key = R.key;
    key.position.copy(c).add(V(-30, 130, 75));
    key.target.position.copy(c);
    var sc = key.shadow.camera;
    sc.left = sc.bottom = -size; sc.right = sc.top = size; sc.near = 1; sc.far = 450;
    sc.updateProjectionMatrix();
    R.rim.position.copy(c).add(V(80, 60, -100));
    R.rim.target.position.copy(c);
    fig.center = c;
  }

  function ensureSize(w, h) {
    if (w <= R.w && h <= R.h) return;
    R.w = Math.max(R.w, Math.min(2048, w));
    R.h = Math.max(R.h, Math.min(2048, h));
    R.gl.setSize(R.w, R.h, false);
  }

  // ---- figures ---------------------------------------------------------------------------------
  var live = new Set(), raf = 0, last = 0;
  function tick(now) {
    raf = 0;
    if (document.hidden || !live.size) return;
    var budget = live.size > 1 ? 32 : 0;               // several at once: about 30 fps
    if (now - last >= budget) {
      last = now;
      live.forEach(function (f) { f.frame(now); });
    }
    if (live.size) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && live.size && !document.hidden) raf = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', wake);

  function Figure(an, opt) {
    opt = opt || {};
    this.an = an;
    this.opt = opt;
    this.flip = !!opt.flip;
    this.mode = opt.mode || 'demo';
    this.front = an.k[0].v === 'f';
    var cam = an.cam || {};
    this.pts = samplePoints(this);
    var b = this.box, lying = (b.max.y - b.min.y) < 0.55 * Math.max(b.max.x - b.min.x, 1);
    this.yaw0 = opt.yaw != null ? opt.yaw : cam.yaw != null ? cam.yaw : (this.front ? 62 : 34);
    if (this.flip) this.yaw0 = this.front ? 180 - this.yaw0 : -this.yaw0;
    this.yaw = this.yaw0;
    this.pitch = opt.pitch != null ? opt.pitch : cam.pitch != null ? cam.pitch : (lying ? 22 : 9);
    this.speed = opt.speed || 1;
    this.offset = 0; this.t0 = 0;
    this.playing = false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fig3d';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    this.last = null;
  }

  Figure.prototype.mount = function (host) {
    host.textContent = '';
    host.classList.add('is3d');
    host.appendChild(this.canvas);
    this.host = host;
    this.resize();
    if (this.opt.drag) this.bindDrag();
    this.still();
    return this;
  };
  Figure.prototype.resize = function () {
    var r = this.host.getBoundingClientRect(), dpr = Math.min(2, W.devicePixelRatio || 1);
    var w = Math.max(40, Math.round(r.width * dpr)), h = Math.max(40, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.dpr = dpr;
  };
  Figure.prototype.bindDrag = function () {
    var self = this, x0 = null, yaw0 = 0;
    var c = this.canvas;
    c.style.touchAction = 'pan-y';
    c.style.cursor = 'grab';
    c.addEventListener('pointerdown', function (e) { x0 = e.clientX; yaw0 = self.yaw; try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
    c.addEventListener('pointermove', function (e) {
      if (x0 == null) return;
      self.yaw = yaw0 - (e.clientX - x0) * 0.6;
      if (!self.playing && self.last) self.draw(self.last);
    });
    var end = function () { x0 = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('dblclick', function () { self.yaw = self.yaw0; if (!self.playing && self.last) self.draw(self.last); });
  };

  Figure.prototype.draw = function (spec) {
    if (!init()) return;
    var keep = C, other = this.opt.coach && coaches[this.opt.coach];
    if (other && other !== C) use(other.id);          // a figure can show the other coach
    try { this.render(spec); } finally { if (C !== keep) use(keep.id); }
  };
  Figure.prototype.render = function (spec) {
    this.last = spec;
    var w = this.canvas.width, h = this.canvas.height, gl = R.gl;
    ensureSize(w, h);
    var map = this.mode === 'map';
    var props = map ? null : propsFor(this.an), mat = map ? null : matFor(this);
    if (props) R.scene.add(props);
    if (mat) R.scene.add(mat);
    R.ground.visible = !map;
    var off = groundFor(this);
    var j = joints(F.resolve(spec), this.an, this.flip);
    var info = solve(j, this);
    C.holder.position.y = off;
    C.holder.updateMatrixWorld(true);
    placeKit(this, info);
    shade(this);
    aim(this, w, h);
    gl.setViewport(0, 0, w, h);
    gl.setScissor(0, 0, w, h);
    gl.setScissorTest(true);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(R.scene, R.cam);
    if (props) R.scene.remove(props);
    if (mat) R.scene.remove(mat);
    var ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(R.canvas, 0, R.h - h, w, h, 0, 0, w, h);
    if (this.opt.note && this.an.focus) this.note(j);
  };

  // Frank's annotation: a serif label and a hand-drawn arrow to the joint that matters
  Figure.prototype.note = function (j) {
    var f = this.an.focus, ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, d = this.dpr;
    var lift = V(0, C ? C.holder.position.y : 0, 0);
    var pick = { hip: j.pel, glute: j.pel, hipF: j.pel, shoulder: j.shN, scapula: j.sc.clone().lerp(j.pel, 0.14), knee: j.knN, kneeF: j.knF,
                 ankle: j.anN, foot: j.anN.clone().lerp(j.toN, 0.4), elbow: j.elN, wrist: j.wrN, head: j.head,
                 ribs: j.sc.clone().lerp(j.pel, 0.38), spine: j.ctrl, core: j.sc.clone().lerp(j.pel, 0.6) }[f.j] || j.pel;
    var v = pick.clone().add(lift).project(R.cam);
    var to = [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h];
    var pos = f.at || 'tr', right = pos[1] === 'r', top = pos[0] === 't';
    var pad = 12 * d, fs = Math.round(Math.max(13, Math.min(20, w / d / 18)) * d);
    var ink = '#0B4A27';
    ctx.font = fs + 'px "Gilda Display", Didot, Georgia, serif';
    ctx.fillStyle = ink;
    ctx.textAlign = right ? 'right' : 'left';
    ctx.textBaseline = top ? 'top' : 'bottom';
    var lx = right ? w - pad : pad, ly = top ? pad : h - pad;
    ctx.fillText(f.label, lx, ly);
    var tw = ctx.measureText(f.label).width;
    var from = [right ? lx - tw * 0.55 : lx + tw * 0.55, top ? ly + fs + 4 * d : ly - fs - 4 * d];
    var vx = to[0] - from[0], vy = to[1] - from[1], dist = Math.hypot(vx, vy);
    if (dist < 30 * d) return;
    var ux = vx / dist, uy = vy / dist, stop = 14 * d;
    var ex = to[0] - ux * stop, ey = to[1] - uy * stop;
    var bow = (f.bow == null ? 0.22 : f.bow) * dist * (right ? 1 : -1);
    var cx = (from[0] + ex) / 2 - uy * bow, cy = (from[1] + ey) / 2 + ux * bow;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4 * d;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    var tx = ex - cx, ty = ey - cy, tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    var a = 7 * d;
    ctx.beginPath();
    ctx.moveTo(ex - tx * a - ty * a * 0.6, ey - ty * a + tx * a * 0.6);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex - tx * a + ty * a * 0.6, ey - ty * a - tx * a * 0.6);
    ctx.stroke();
  };

  Figure.prototype.setMode = function (mode) {
    this.mode = mode;
    if (!this.playing && this.last) this.draw(this.last);
    return this;
  };
  Figure.prototype.turn = function (deg) {
    this.yaw += deg;
    if (!this.playing && this.last) this.draw(this.last);
  };
  Figure.prototype.frame = function (now) {
    if (!this.canvas.isConnected) { live.delete(this); return; }
    if (!this.t0) this.t0 = now;
    this.draw(F.sample(this.an, this.offset + (now - this.t0) / 1000 * this.speed));
  };
  Figure.prototype.still = function (key) {
    var k = key == null ? (this.an.still == null ? 0 : this.an.still) : key;
    this.draw(this.an.k[Math.min(k, this.an.k.length - 1)]);
    return this;
  };
  Figure.prototype.play = function () {
    if (this.playing) return this;
    this.playing = true; this.t0 = 0;
    live.add(this); wake();
    return this;
  };
  Figure.prototype.pause = function () {
    if (!this.playing) return this;
    this.playing = false;
    if (this.t0) this.offset += (performance.now() - this.t0) / 1000 * this.speed;
    live.delete(this);
    return this;
  };

  W.addEventListener('resize', function () { live.forEach(function (f) { f.resize(); }); });

  // A still picture of the coach standing, with muscles lit: the focus-area maps and body-part icons.
  // mus: { p: [...], s: [...] } in the names js/exercises.js uses. Returns a data URL, or null before
  // the model has loaded.
  var ANAT = { v: 'f', p: [0, 49.3], t: 180, aN: [14, 6], aF: [14, 6], lN: [3, 1], lF: [3, 1] };
  var maps = {};
  function mapImage(mus, view, w, h) {
    if (!init()) return null;
    mus = mus || { p: [], s: [] };
    var key = C.id + '|' + (mus.p || []).join() + '|' + (mus.s || []).join() + '|' + view + '|' + w + 'x' + h;
    if (maps[key]) return maps[key];
    var an = { k: [ANAT], mus: mus, cam: { yaw: view === 'back' ? -90 : 90, pitch: 2 }, focus: null };
    var f = new Figure(an, { mode: 'map' });
    f.canvas.width = w; f.canvas.height = h; f.dpr = 1;
    f.draw(ANAT);
    maps[key] = f.canvas.toDataURL('image/png');
    return maps[key];
  }

  // A picture of one coach standing, for choosing between them. Null until that coach has
  // loaded; asking starts the download, and 'wbf-three' fires when it is there.
  var STAND = { v: 'f', p: [0, 49.3], t: 180, aN: [9, 8], aF: [9, 8], lN: [2.5, 1], lF: [2.5, 1] };
  function portrait(id, w, h) {
    if (!init()) return null;
    id = id === 'f' ? 'f' : 'm';
    if (!coaches[id]) { fetchCoach(id); return null; }
    var key = 'p|' + id + '|' + w + 'x' + h;
    if (maps[key]) return maps[key];
    var f = new Figure({ k: [STAND], cam: { yaw: 62, pitch: 5 }, focus: null }, { coach: id });
    f.canvas.width = w; f.canvas.height = h; f.dpr = 1;
    f.draw(STAND);
    maps[key] = f.canvas.toDataURL('image/png');
    return maps[key];
  }

  W.WBF.fig3d = {
    init: init,
    ready: function () { return !!(R && !R.failed && C); },
    Figure: Figure,
    mapImage: mapImage,
    portrait: portrait,
    load: function (id) { if (init()) fetchCoach(id === 'f' ? 'f' : 'm'); },
    setCoach: setCoach,
    coach: function () { return C ? C.id : want; },
    MUSCLES: MUSCLES
  };
})(window);
