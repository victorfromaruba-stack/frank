#!/usr/bin/env python3
"""Builds the app's 3D coach (assets/coach-<m|f>.glb) from Quaternius'
Universal Base Characters [Standard] (CC0, https://quaternius.itch.io/universal-base-characters).

What it does:
  1. Fits the model to the 2D pose engine's proportions (js/figure.js, L): torso,
     arms and legs are stretched along their bones so a pose solved in 2D lands on
     the 3D body exactly (hands and feet stay on the floor).
  2. Dresses it: paints a T-shirt and shorts into the skin texture.
  3. Tags every vertex with a muscle group, for the muscle highlight.
  4. Adds hair, shrinks the textures and writes one .glb.

Run:  pip install numpy pillow
      python3 tools/coach/build_coach.py "<path to Universal Base Characters[Standard]>" m
"""
import io, json, math, os, struct, sys
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1]
WHO = sys.argv[2] if len(sys.argv) > 2 else 'm'
DEBUG = '--debug' in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'assets', 'coach-%s.glb' % WHO)

CFG = {
    'm': dict(body='Superhero_Male_FullBody', hair='Hair_SimpleParted', extra=[],
              shirt=(16, 74, 42), shorts=(24, 27, 26), skin='T_Superhero_Male_Dark.png', hairColor=[0.16, 0.11, 0.08, 1]),
    'f': dict(body='Superhero_Female_FullBody', hair='Hair_Buns', extra=[],
              shirt=(16, 74, 42), shorts=(24, 27, 26), skin='T_Superhero_Female_Dark_BaseColor.png', hairColor=[0.16, 0.11, 0.08, 1]),
}[WHO]

# the 2D engine's bone lengths (js/figure.js) and where its feet and hands sit
ENGINE = dict(torso=30.0, ua=15.5, fa=14.5, th=24.0, sh=23.0, ankle=2.5, wrist=2.5)

MUSCLES = ['none', 'chest', 'abs', 'obliques', 'front-deltoids', 'back-deltoids', 'biceps', 'triceps',
           'forearm', 'trapezius', 'upper-back', 'lower-back', 'gluteal', 'abductors', 'adductor',
           'quadriceps', 'hamstring', 'calves', 'neck', 'head', 'hands', 'feet', 'shins']
MID = {m: i for i, m in enumerate(MUSCLES)}

# ---------------------------------------------------------------- glTF in
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    g = json.load(open(path))
    base = os.path.dirname(path)
    bufs = [open(os.path.join(base, b['uri']), 'rb').read() for b in g['buffers']]
    return g, bufs, base


def acc(g, bufs, i):
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    n = NC[a['type']]
    dt = np.dtype(CT[a['componentType']])
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or n * dt.itemsize
    raw = bufs[bv['buffer']]
    if stride == n * dt.itemsize:
        arr = np.frombuffer(raw, dtype=dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
    else:
        arr = np.stack([np.frombuffer(raw, dtype=dt, count=n, offset=off + k * stride) for k in range(a['count'])])
    arr = arr.astype(np.float64) if dt.kind == 'f' else arr.copy()
    if a.get('normalized'):
        arr = arr.astype(np.float64) / np.iinfo(dt).max
    return arr


def quat_to_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_to_quat(m):
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def trs(n):
    M = np.eye(4)
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    if 'rotation' in n:
        M[:3, :3] = quat_to_mat(n['rotation'])
    if 'scale' in n:
        M[:3, :3] = M[:3, :3] @ np.diag(n['scale'])
    if 'translation' in n:
        M[:3, 3] = n['translation']
    return M


BASE = os.path.join(SRC, 'Base Characters', 'Godot - UE')
TEX = os.path.join(SRC, 'Base Characters', 'Textures')
g, bufs, _ = load(os.path.join(BASE, CFG['body'] + '.gltf'))
nodes = g['nodes']
skin = g['skins'][0]
joints = skin['joints']
jname = [nodes[j]['name'] for j in joints]
J = {n: i for i, n in enumerate(jname)}
ibm = acc(g, bufs, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
B = np.array([np.linalg.inv(m) for m in ibm])            # bind (rest) world matrices
parent_node = {}
for i, n in enumerate(nodes):
    for c in n.get('children', []):
        parent_node[c] = i
jparent = [J.get(nodes[parent_node[j]]['name'], -1) if j in parent_node else -1 for j in joints]

# sanity: bind pose == node rest pose
world = {}
def wm(i):
    if i in world:
        return world[i]
    M = trs(nodes[i])
    if i in parent_node:
        M = wm(parent_node[i]) @ M
    world[i] = M
    return M
err = max(np.abs(wm(joints[k])[:3, 3] - B[k][:3, 3]).max() for k in range(len(joints)))
print('bind vs rest max error (m):', round(float(err), 6))

head = B[:, :3, 3].copy()
axisY = B[:, :3, 1] / np.linalg.norm(B[:, :3, 1], axis=1, keepdims=True)
P = lambda n: head[J[n]]

# meshes of the body file: pick the body (skin material) and the face parts
prims = []
for ni, n in enumerate(nodes):
    if 'mesh' not in n:
        continue
    for p in g['meshes'][n['mesh']]['primitives']:
        mat = g['materials'][p['material']]['name']
        a = p['attributes']
        prims.append(dict(name=n['name'], mat=mat, pos=acc(g, bufs, a['POSITION']), nor=acc(g, bufs, a['NORMAL']),
                          uv=acc(g, bufs, a['TEXCOORD_0']), j=acc(g, bufs, a['JOINTS_0']).astype(int),
                          w=acc(g, bufs, a['WEIGHTS_0']), idx=acc(g, bufs, p['indices']).reshape(-1).astype(np.uint32)))
body = next(p for p in prims if 'Superhero' in p['mat'])
print('prims', [(p['name'], p['mat'], len(p['pos'])) for p in prims])

# ---------------------------------------------------------------- measurements (rest pose)
hipC = (P('thigh_l') + P('thigh_r')) / 2
shC = (P('upperarm_l') + P('upperarm_r')) / 2
s = hipC[1] / (ENGINE['th'] + ENGINE['sh'] + ENGINE['ankle'])   # metres per engine unit
ankle_h = P('foot_l')[1]
# palm: how far the hand's lowest vertex sits below the wrist joint in the T-pose (palms down)
dom = body['j'][np.arange(len(body['j'])), body['w'].argmax(1)]
hand_v = body['pos'][dom == J['hand_l']]
palm = P('hand_l')[1] - hand_v[:, 1].min()
print('scale m/unit %.5f  ankle %.4f m (%.2f u)  palm %.4f m (%.2f u)' % (s, ankle_h, ankle_h / s, palm, palm / s))

seg = lambda a, b: float(np.linalg.norm(P(a) - P(b)))
f = {}
f['thigh_l'] = f['thigh_r'] = ENGINE['th'] * s / seg('thigh_l', 'calf_l')
shin_target = (ENGINE['sh'] + ENGINE['ankle']) * s - ankle_h
f['calf_l'] = f['calf_r'] = shin_target / seg('calf_l', 'foot_l')
f['upperarm_l'] = f['upperarm_r'] = ENGINE['ua'] * s / seg('upperarm_l', 'lowerarm_l')
fore_target = ENGINE['fa'] * s + (ENGINE['wrist'] * s - palm)
f['lowerarm_l'] = f['lowerarm_r'] = fore_target / seg('lowerarm_l', 'hand_l')
f['neck_01'] = 0.85


def fitted_heads(fac):
    h2 = head.copy()
    for k in range(len(joints)):
        p = jparent[k]
        if p < 0:
            continue
        A = np.eye(3) + (fac.get(jname[p], 1.0) - 1) * np.outer(axisY[p], axisY[p])
        h2[k] = h2[p] + A @ (head[k] - head[p])
    return h2

# torso: spread the stretch over the spine (more in the waist, a little in the pelvis and chest)
want = ENGINE['torso'] * s
wts = {'pelvis': 0.45, 'spine_01': 1.0, 'spine_02': 1.0, 'spine_03': 0.55}
lo, hi = 0.0, 1.0
for _ in range(60):
    k = (lo + hi) / 2
    fac = dict(f, **{b: 1 + k * w for b, w in wts.items()})
    h2 = fitted_heads(fac)
    got = np.linalg.norm((h2[J['upperarm_l']] + h2[J['upperarm_r']]) / 2 - (h2[J['thigh_l']] + h2[J['thigh_r']]) / 2)
    lo, hi = (k, hi) if got < want else (lo, k)
f.update({b: 1 + k * w for b, w in wts.items()})
head2 = fitted_heads(f)
print('stretch', {k: round(v, 3) for k, v in f.items() if not k.endswith('_r')})


def deform(pos, nor, jj, ww):
    out = np.zeros_like(pos)
    on = np.zeros_like(nor)
    for c in range(4):
        idx = jj[:, c]
        w = ww[:, c:c + 1]
        Y = axisY[idx]
        fac = np.array([f.get(jname[i], 1.0) for i in range(len(joints))])[idx][:, None]
        d = pos - head[idx]
        along = (d * Y).sum(1, keepdims=True)
        out += w * (head2[idx] + d + (fac - 1) * along * Y)
        nd = (nor * Y).sum(1, keepdims=True)
        on += w * (nor + (1 / fac - 1) * nd * Y)
    on /= np.linalg.norm(on, axis=1, keepdims=True) + 1e-12
    return out, on

# ---------------------------------------------------------------- muscle groups (rest pose)
def classify(pr):
    pos, nor = pr['pos'], pr['nor']
    d = pr['j'][np.arange(len(pr['j'])), pr['w'].argmax(1)]
    names = np.array(jname)[d]
    out = np.zeros(len(pos), np.uint8)
    x, y, z = pos[:, 0], pos[:, 1], pos[:, 2]
    nx, ny, nz = nor[:, 0], nor[:, 1], nor[:, 2]
    side = np.sign(x) + (x == 0)
    lat = nx * side                       # >0: faces away from the midline
    neck_y = P('neck_01')[1]
    sh_y = P('upperarm_l')[1]
    waist = P('spine_01')[1]
    for i in range(len(pos)):
        n = names[i]
        m = 'none'
        if n in ('Head',):
            m = 'head'
        elif n == 'neck_01':
            m = 'trapezius' if nz[i] < -0.15 or (lat[i] > 0.55 and y[i] < neck_y + 0.03) else 'neck'
        elif n.startswith('spine_03') or n.startswith('clavicle'):
            if abs(x[i]) > 0.15 and y[i] > sh_y - 0.06:
                m = 'front-deltoids' if nz[i] > 0 else 'back-deltoids'
            elif nz[i] > 0.2:
                m = 'chest' if y[i] > P('spine_03')[1] - 0.02 else 'abs'
            elif nz[i] < -0.2:
                m = 'trapezius' if y[i] > sh_y - 0.08 and abs(x[i]) < 0.14 else 'upper-back'
            else:
                m = 'upper-back' if y[i] < sh_y - 0.05 else 'front-deltoids'
        elif n in ('spine_02', 'spine_01'):
            if nz[i] > 0.25:
                m = 'abs' if abs(x[i]) < 0.075 else 'obliques'
            elif nz[i] < -0.25:
                m = 'lower-back' if abs(x[i]) < 0.075 or n == 'spine_01' else 'upper-back'
            else:
                m = 'obliques'
        elif n == 'pelvis':
            if y[i] > waist - 0.06 and nz[i] > -0.1:
                m = 'abs' if abs(x[i]) < 0.075 else 'obliques'
            elif nz[i] < -0.15:
                m = 'gluteal'
            elif lat[i] > 0.5:
                m = 'abductors'
            else:
                m = 'adductor' if nz[i] < 0.5 and lat[i] < -0.2 else 'quadriceps'
        elif n.startswith('upperarm'):
            t = np.dot(pos[i] - P(n), axisY[J[n]]) / seg(n, n.replace('upper', 'lower'))
            if t < 0.33:
                m = 'front-deltoids' if nz[i] > -0.05 else 'back-deltoids'
            else:
                m = 'biceps' if nz[i] > 0 else 'triceps'
        elif n.startswith('lowerarm'):
            m = 'forearm'
        elif n.startswith('hand') or any(n.startswith(k) for k in ('index', 'middle', 'ring', 'pinky', 'thumb')):
            m = 'hands'
        elif n.startswith('thigh'):
            t = np.dot(pos[i] - P(n), axisY[J[n]]) / seg(n, n.replace('thigh', 'calf'))
            if nz[i] < -0.3:
                m = 'gluteal' if t < 0.12 else 'hamstring'
            elif lat[i] < -0.45:
                m = 'adductor'
            elif lat[i] > 0.6 and t < 0.25:
                m = 'abductors'
            else:
                m = 'quadriceps'
        elif n.startswith('calf'):
            m = 'calves' if nz[i] < 0.15 else 'shins'
        elif n.startswith('foot') or n.startswith('ball'):
            m = 'feet'
        out[i] = MID[m]
    return out


muscle = classify(body)
print('muscle counts', {MUSCLES[i]: int((muscle == i).sum()) for i in np.unique(muscle)})

# ---------------------------------------------------------------- clothing (rest pose)
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def clothing(pr):
    pos = pr['pos']
    d = pr['j'][np.arange(len(pr['j'])), pr['w'].argmax(1)]
    W = pr['w']
    jj = pr['j']
    def wsum(prefixes):
        m = np.zeros(len(pos))
        for c in range(4):
            nm = np.array(jname)[jj[:, c]]
            hit = np.zeros(len(pos), bool)
            for p in prefixes:
                hit |= np.char.startswith(nm.astype(str), p)
            m += W[:, c] * hit
        return m
    y = pos[:, 1]
    x = pos[:, 0]
    z = pos[:, 2]
    torso = wsum(['spine_', 'clavicle', 'pelvis'])
    arm_u = wsum(['upperarm'])
    leg_u = wsum(['thigh'])
    # crew neck: skin within the neck's radius above the collar line, a little lower at the front
    nb = P('neck_01')
    rn = np.hypot(x - nb[0], (z - nb[2]) * 0.92)
    front = smooth(-0.02, 0.05, z - nb[2])
    collar_y = nb[1] - 0.012 - 0.05 * front
    neck_skin = (1 - smooth(0.074, 0.088, rn)) * smooth(-0.006, 0.006, y - collar_y)
    above_neck = np.maximum(neck_skin, smooth(0.0, 0.01, y - (nb[1] + 0.03)))
    # sleeves: to about 45% down the upper arm
    t_arm = np.zeros(len(pos))
    for sd in ('l', 'r'):
        a = J['upperarm_' + sd]
        t = ((pos - head[a]) @ axisY[a]) / seg('upperarm_' + sd, 'lowerarm_' + sd)
        t_arm = np.where(np.sign(x) == (1 if sd == 'l' else -1), t, t_arm)
    sleeve = 1 - smooth(0.40, 0.46, t_arm)
    # shorts: from the waist to about 55% down the thigh
    t_leg = np.zeros(len(pos))
    for sd in ('l', 'r'):
        a = J['thigh_' + sd]
        t = ((pos - head[a]) @ axisY[a]) / seg('thigh_' + sd, 'calf_' + sd)
        t_leg = np.where(np.sign(x) == (1 if sd == 'l' else -1), t, t_leg)
    hem = P('pelvis')[1] + 0.035                 # where the shirt ends
    waist = P('pelvis')[1] + 0.075               # where the shorts start
    shirt = np.clip(torso + arm_u * sleeve, 0, 1) * (1 - above_neck) * smooth(-0.006, 0.006, y - hem)
    shirt = np.where(arm_u + torso < 0.5, 0, shirt)
    shorts = np.clip(torso + leg_u, 0, 1) * (1 - smooth(-0.006, 0.006, y - waist)) * (1 - smooth(0.50, 0.56, t_leg))
    shorts = np.where(wsum(['calf', 'foot', 'ball']) > 0.3, 0, shorts)
    return shirt, shorts, t_arm, t_leg


shirt_v, shorts_v, t_arm, t_leg = clothing(body)


def raster(uv, idx, vals, size):
    """Interpolate per-vertex values across the triangles in UV space."""
    H = Wd = size
    out = np.zeros((len(vals), H, Wd), np.float32)
    cov = np.zeros((H, Wd), np.float32)
    px = uv[:, 0] * Wd - 0.5
    py = uv[:, 1] * H - 0.5
    tri = idx.reshape(-1, 3)
    for a, b, c in tri:
        xs = np.array([px[a], px[b], px[c]])
        ys = np.array([py[a], py[b], py[c]])
        x0, x1 = int(max(0, math.floor(xs.min()) - 1)), int(min(Wd - 1, math.ceil(xs.max()) + 1))
        y0, y1 = int(max(0, math.floor(ys.min()) - 1)), int(min(H - 1, math.ceil(ys.max()) + 1))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        den = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(den) < 1e-12:
            continue
        l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / den
        l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / den
        l2 = 1 - l0 - l1
        e = -0.6 / max(1.0, abs(den)) ** 0.5           # grow each triangle by about half a pixel
        m = (l0 >= e) & (l1 >= e) & (l2 >= e)
        if not m.any():
            continue
        for k, v in enumerate(vals):
            out[k, gy[m], gx[m]] = l0[m] * v[a] + l1[m] * v[b] + l2[m] * v[c]
        cov[gy[m], gx[m]] = 1
    return out, cov


def dilate(img, cov, n=6):
    """Push covered values into uncovered neighbours (stops seams bleeding when mipmapped)."""
    img = img.copy()
    cov = cov.copy()
    for _ in range(n):
        acc_ = np.zeros_like(img)
        cnt = np.zeros_like(cov)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh_c = np.roll(np.roll(cov, dy, 0), dx, 1)
            sh_i = np.roll(np.roll(img, dy, -2), dx, -1)
            acc_ += sh_i * sh_c
            cnt += sh_c
        grow = (cov == 0) & (cnt > 0)
        img[..., grow] = (acc_[..., grow] / cnt[grow])
        cov = np.where(grow, 1, cov)
    return img, cov


TS = 1024
masks, cov = raster(body['uv'], body['idx'], [shirt_v, shorts_v], TS)
masks, _ = dilate(masks, cov, 4)
shirt_m = np.clip((masks[0] - 0.5) * 6 + 0.5, 0, 1)
shorts_m = np.clip((masks[1] - 0.5) * 6 + 0.5, 0, 1) * (1 - shirt_m)

skin_img = Image.open(os.path.join(TEX, CFG['skin'])).convert('RGB').resize((TS, TS), Image.LANCZOS)
sk = np.asarray(skin_img).astype(np.float32) / 255
lum = sk @ np.array([0.299, 0.587, 0.114])
blur = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(np.float32) / 255
shade = np.clip(lum / np.maximum(blur, 0.05), 0.55, 1.35)
shade = 0.72 + 0.28 * shade                       # keep a little of the baked shading under the fabric


def fabric(rgb):
    c = np.array(rgb, np.float32) / 255
    return c[None, None, :] * shade[..., None]


# a soft hem line where fabric ends
edge_s = np.exp(-((masks[0] - 0.5) / 0.06) ** 2) * (masks[0] > 0.2)
edge_b = np.exp(-((masks[1] - 0.5) / 0.06) ** 2) * (masks[1] > 0.2)
cloth = sk.copy()
cloth = cloth * (1 - shorts_m[..., None]) + fabric(CFG['shorts']) * shorts_m[..., None]
cloth = cloth * (1 - shirt_m[..., None]) + fabric(CFG['shirt']) * shirt_m[..., None]
cloth *= (1 - 0.25 * np.clip(edge_s + edge_b, 0, 1))[..., None]
cloth_img = Image.fromarray(np.clip(cloth * 255, 0, 255).astype(np.uint8))

# normal map: flatter under fabric; roughness: matte fabric
nrm = np.asarray(Image.open(os.path.join(TEX, 'T_Superhero_%s_Normal.png' % ('Male' if WHO == 'm' else 'Female'))).convert('RGB')
                 .resize((TS, TS), Image.LANCZOS)).astype(np.float32) / 255
flat = np.array([0.5, 0.5, 1.0], np.float32)
fab = np.clip(shirt_m + shorts_m, 0, 1)[..., None]
nrm = nrm * (1 - 0.55 * fab) + flat * 0.55 * fab
nrm_img = Image.fromarray(np.clip(nrm * 255, 0, 255).astype(np.uint8))
rough = np.asarray(Image.open(os.path.join(TEX, 'T_Superhero_%s_Roughness.png' % ('Male' if WHO == 'm' else 'Female'))).convert('L')
                   .resize((512, 512), Image.LANCZOS)).astype(np.float32) / 255
fab512 = np.asarray(Image.fromarray((fab[..., 0] * 255).astype(np.uint8)).resize((512, 512))).astype(np.float32) / 255
rough = rough * (1 - fab512) + 0.92 * fab512
mr = np.zeros((512, 512, 3), np.uint8)             # glTF: G = roughness, B = metalness
mr[..., 1] = np.clip(rough * 255, 0, 255)
mr_img = Image.fromarray(mr)

if DEBUG:
    os.makedirs('/tmp/coach-debug', exist_ok=True)
    cloth_img.save('/tmp/coach-debug/cloth.png')
    Image.fromarray((np.stack([shirt_m, shorts_m, np.zeros_like(shirt_m)], -1) * 255).astype(np.uint8)).save('/tmp/coach-debug/masks.png')

# ---------------------------------------------------------------- hair
hg, hbufs, _ = load(os.path.join(SRC, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)', CFG['hair'] + '.gltf'))
hs = hg['skins'][0]
hj = [hg['nodes'][j]['name'] for j in hs['joints']]
hibm = acc(hg, hbufs, hs['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
hair = None
for ni, n in enumerate(hg['nodes']):
    if 'mesh' in n:
        p = hg['meshes'][n['mesh']]['primitives'][0]
        a = p['attributes']
        hp = acc(hg, hbufs, a['POSITION']); hn = acc(hg, hbufs, a['NORMAL'])
        hjj = acc(hg, hbufs, a['JOINTS_0']).astype(int); hw = acc(hg, hbufs, a['WEIGHTS_0'])
        dom_h = np.array(hj)[hjj[np.arange(len(hjj)), hw.argmax(1)]]
        print('hair bound to', set(dom_h.tolist()))
        M = B[J['Head']] @ hibm[hj.index('Head')]
        hp2 = (M[:3, :3] @ hp.T).T + M[:3, 3]
        hn2 = (M[:3, :3] @ hn.T).T
        hair = dict(name='Hair', mat='MI_Hair_1', pos=hp2, nor=hn2, uv=acc(hg, hbufs, a['TEXCOORD_0']),
                    j=np.tile([J['Head'], 0, 0, 0], (len(hp), 1)), w=np.tile([1.0, 0, 0, 0], (len(hp), 1)),
                    idx=acc(hg, hbufs, p['indices']).reshape(-1).astype(np.uint32))
prims.append(hair)

# ---------------------------------------------------------------- apply the fit to every mesh
for pr in prims:
    pr['pos2'], pr['nor2'] = deform(pr['pos'], pr['nor'], pr['j'], pr['w'])
B2 = B.copy()
B2[:, :3, 3] = head2
print('height after fit (m): %.3f -> %.3f' % (body['pos'][:, 1].max(), body['pos2'][:, 1].max()))
print('shoulder above hips (u): %.2f' % (np.linalg.norm((head2[J['upperarm_l']] + head2[J['upperarm_r']]) / 2 - (head2[J['thigh_l']] + head2[J['thigh_r']]) / 2) / s))

# ---------------------------------------------------------------- glTF out
class Writer:
    def __init__(self):
        self.bin = bytearray()
        self.views = []
        self.accs = []

    def view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}
        if target:
            v['target'] = target
        self.bin += data
        self.views.append(v)
        return len(self.views) - 1

    def acc(self, arr, ctype, typ, target=None, normalized=False, minmax=False):
        arr = np.ascontiguousarray(arr)
        bv = self.view(arr.tobytes(), target)
        a = {'bufferView': bv, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        self.accs.append(a)
        return len(self.accs) - 1


def jpg(img, q=88):
    b = io.BytesIO(); img.save(b, 'JPEG', quality=q, optimize=True); return b.getvalue()


def png(img):
    b = io.BytesIO(); img.save(b, 'PNG', optimize=True); return b.getvalue()


w = Writer()
out = {'asset': {'version': '2.0', 'generator': 'wellness-by-frank build_coach.py',
                 'copyright': 'Model: Universal Base Characters by Quaternius (CC0 1.0)'},
       'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'materials': [], 'textures': [],
       'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}], 'skins': []}

# joints: same order as the source skin
jnode = {}
for k, nm in enumerate(jname):
    p = jparent[k]
    L = np.linalg.inv(B2[p]) @ B2[k] if p >= 0 else B2[k]
    R = L[:3, :3]
    sc = np.linalg.norm(R, axis=0)
    node = {'name': nm, 'translation': [round(float(v), 7) for v in L[:3, 3]],
            'rotation': [round(float(v), 8) for v in mat_to_quat(R / sc)]}
    out['nodes'].append(node)
    jnode[k] = len(out['nodes']) - 1
for k, nm in enumerate(jname):
    kids = [jnode[c] for c in range(len(jname)) if jparent[c] == k]
    if kids:
        out['nodes'][jnode[k]]['children'] = kids
ibm2 = np.array([np.linalg.inv(m) for m in B2]).transpose(0, 2, 1).reshape(-1, 16).astype(np.float32)
out['skins'].append({'name': 'coach', 'joints': [jnode[k] for k in range(len(jname))], 'inverseBindMatrices': w.acc(ibm2, 5126, 'MAT4')})


def image(data, mime):
    out['images'].append({'bufferView': w.view(data), 'mimeType': mime})
    out['textures'].append({'sampler': 0, 'source': len(out['images']) - 1})
    return len(out['textures']) - 1


t_cloth = image(jpg(cloth_img), 'image/jpeg')
t_nrm = image(jpg(nrm_img, 90), 'image/jpeg')
t_mr = image(jpg(mr_img, 85), 'image/jpeg')
t_skin = image(jpg(skin_img), 'image/jpeg')
hair_bc = Image.open(os.path.join(TEX, 'T_Hair_1_BaseColor.png')).convert('RGB').resize((512, 512), Image.LANCZOS)
hair_n = Image.open(os.path.join(TEX, 'T_Hair_1_Normal.png')).convert('RGB').resize((512, 512), Image.LANCZOS)
t_hair = image(jpg(hair_bc), 'image/jpeg')
t_hairn = image(jpg(hair_n, 90), 'image/jpeg')
eye = Image.open(os.path.join(TEX, 'T_Eye_Brown.png')).convert('RGB').resize((128, 128), Image.LANCZOS)
t_eye = image(jpg(eye, 90), 'image/jpeg')

out['materials'] = [
    {'name': 'body', 'pbrMetallicRoughness': {'baseColorTexture': {'index': t_cloth}, 'metallicFactor': 0,
                                              'metallicRoughnessTexture': {'index': t_mr}},
     'normalTexture': {'index': t_nrm}, 'extras': {'skinTexture': t_skin}},
    {'name': 'hair', 'pbrMetallicRoughness': {'baseColorTexture': {'index': t_hair}, 'metallicFactor': 0, 'roughnessFactor': 0.75,
                                              'baseColorFactor': CFG['hairColor']},
     'normalTexture': {'index': t_hairn}, 'doubleSided': True},
    {'name': 'eyes', 'pbrMetallicRoughness': {'baseColorTexture': {'index': t_eye}, 'metallicFactor': 0, 'roughnessFactor': 0.3}},
]
MATI = {'body': 0, 'hair': 1, 'eyes': 2}


def matname(m):
    return 'body' if 'Superhero' in m else 'eyes' if 'Eye' in m else 'hair'


for pr in prims:
    mn = matname(pr['mat'])
    attrs = {'POSITION': w.acc(pr['pos2'].astype(np.float32), 5126, 'VEC3', 34962, minmax=True),
             'NORMAL': w.acc(pr['nor2'].astype(np.float32), 5126, 'VEC3', 34962),
             'TEXCOORD_0': w.acc(pr['uv'].astype(np.float32), 5126, 'VEC2', 34962),
             'JOINTS_0': w.acc(pr['j'].astype(np.uint8), 5121, 'VEC4', 34962)}
    ww = pr['w'] / pr['w'].sum(1, keepdims=True)
    q = np.round(ww * 255).astype(np.int32)
    q[np.arange(len(q)), q.argmax(1)] += 255 - q.sum(1)
    attrs['WEIGHTS_0'] = w.acc(q.astype(np.uint8), 5121, 'VEC4', 34962, normalized=True)
    if pr is body:
        attrs['_MUSCLE'] = w.acc(muscle.reshape(-1, 1).astype(np.uint8), 5121, 'SCALAR', 34962)
    idx = pr['idx'].astype(np.uint16 if pr['idx'].max() < 65535 else np.uint32)
    ind = w.acc(idx.reshape(-1, 1), 5123 if idx.dtype == np.uint16 else 5125, 'SCALAR', 34963)
    out['meshes'].append({'name': pr['name'], 'primitives': [{'attributes': attrs, 'indices': ind, 'material': MATI[mn]}]})
    out['nodes'].append({'name': pr['name'] if pr is not body else 'Body', 'mesh': len(out['meshes']) - 1, 'skin': 0})

arm = {'name': 'Armature', 'children': [jnode[0]] + list(range(len(jname), len(out['nodes'])))}
out['nodes'].append(arm)
out['scenes'][0]['nodes'] = [len(out['nodes']) - 1]
out['extras'] = {'muscles': MUSCLES, 'unit': s, 'engine': ENGINE, 'palm': float(palm), 'ankle': float(ankle_h)}
out['bufferViews'] = w.views
out['accessors'] = w.accs
out['buffers'] = [{'byteLength': len(w.bin)}]

js = json.dumps(out, separators=(',', ':')).encode()
while len(js) % 4:
    js += b' '
while len(w.bin) % 4:
    w.bin.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(w.bin))
glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(w.bin), 0x004E4942) + bytes(w.bin)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'wb').write(glb)
print('wrote', os.path.relpath(OUT), '%.0f KB' % (len(glb) / 1024))
