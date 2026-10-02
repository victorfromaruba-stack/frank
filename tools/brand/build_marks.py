#!/usr/bin/env python3
"""Frank's "W by Frank" marks as plain SVG shapes (no fonts needed to show them).

The big W is Nunito at its heaviest; "by Frank" and the labels are Gilda Display, the app's two fonts
(SIL Open Font License, files in .claude/skills/frank-showcase/assets/fonts/). Letters are turned into
outlines, so the SVGs look the same everywhere.

    pip install fonttools brotli uharfbuzz
    python3 tools/brand/build_marks.py          # writes img/brand/*.svg
    node tools/brand/render.cjs                 # the app icons (img/icon-*.png); --sheet file.png for a review sheet
"""
import io, os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS = os.path.join(REPO, '.claude/skills/frank-showcase/assets/fonts')
OUT = os.path.join(REPO, 'img/brand')

GREEN, DEEP, SKY, SKY_LT, WHITE, INK = '#012D12', '#0B4A27', '#7CC4EE', '#A9DCF8', '#FFFFFF', '#0E2A1A'


class Face:
    """a font at one weight: shaping (kerning) by HarfBuzz, outlines by fontTools"""
    def __init__(self, file, wght=None):
        tt = TTFont(os.path.join(FONTS, file))
        if wght is not None and 'fvar' in tt:
            tt = instantiateVariableFont(tt, {'wght': wght})
        tt.flavor = None
        b = io.BytesIO(); tt.save(b)
        self.tt = TTFont(io.BytesIO(b.getvalue()))
        self.gs = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.upm = self.tt['head'].unitsPerEm
        self.hb = hb.Font(hb.Face(hb.Blob(b.getvalue())))
        self.cap = self.tt['OS/2'].sCapHeight or 0.7 * self.upm

    def path(self, text, size, x=0.0, y=0.0, track=0.0):
        """(svg path data, width) of text set at `size` px with its baseline at y"""
        buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
        hb.shape(self.hb, buf, {'kern': True, 'liga': True})
        s = size / self.upm
        pen = SVGPathPen(self.gs)
        cx = x
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            name = self.order[info.codepoint]
            self.gs[name].draw(TransformPen(pen, (s, 0, 0, -s, cx + pos.x_offset * s, y - pos.y_offset * s)))
            cx += pos.x_advance * s + track
        return pen.getCommands(), cx - x - track

    def box(self, text, size):
        """ink bounds (x0, y0, x1, y1) of text at size, baseline at 0, y down"""
        d, _ = self.path(text, size)
        bp = BoundsPen(self.gs)
        buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
        hb.shape(self.hb, buf, {'kern': True})
        s = size / self.upm; cx = 0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            self.gs[self.order[info.codepoint]].draw(TransformPen(bp, (s, 0, 0, -s, cx, 0)))
            cx += pos.x_advance * s
        return bp.bounds


HEAVY = Face('Nunito-latin.woff2', 1000)
BLACK = Face('Nunito-latin.woff2', 900)
SERIF = Face('GildaDisplay-latin.woff2')


def arrow(x0, y0, cx, cy, x1, y1, w, col, head=None):
    """Frank's hand-drawn arrow: one soft curve, a small open head at the end (x1, y1)"""
    import math
    head = head or w * 3.4
    tx, ty = x1 - cx, y1 - cy
    l = math.hypot(tx, ty) or 1; tx /= l; ty /= l
    a = (x1 - tx * head - ty * head * 0.62, y1 - ty * head + tx * head * 0.62)
    b = (x1 - tx * head + ty * head * 0.62, y1 - ty * head - tx * head * 0.62)
    return ('<path d="M%.1f %.1fQ%.1f %.1f %.1f %.1fM%.1f %.1fL%.1f %.1fL%.1f %.1f" fill="none" stroke="%s" stroke-width="%.1f" '
            'stroke-linecap="round" stroke-linejoin="round"/>' % (x0, y0, cx, cy, x1, y1, a[0], a[1], x1, y1, b[0], b[1], col, w))


def svg(w, h, body, bg=None, title='Wellness by Frank'):
    rect = '<rect width="%d" height="%d" fill="%s"/>' % (w, h, bg) if bg else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" role="img" aria-label="%s">'
            '<title>%s</title>%s%s</svg>\n' % (w, h, w, h, title, title, rect, body))


def big_w(size, x, base, col):
    d, wid = HEAVY.path('W', size, x, base)
    return '<path d="%s" fill="%s"/>' % (d, col), wid


def icon(bg=GREEN, fg=SKY, line=SKY_LT, safe=1.0):
    """the app icon: a huge W with Frank's arrow over its right shoulder (like his F icon)"""
    S = 1024
    size = 640 * safe
    x0, y0, x1, y1 = HEAVY.box('W', size)
    wv = x1 - x0
    x = (S - wv) / 2 - x0 - 26 * safe
    base = S / 2 + (y1 - y0) / 2 - 10 * safe
    body, _ = big_w(size, x, base, fg)
    top = base + y0                               # top of the W
    r = x + x1                                    # right edge of the W
    ar = arrow(r - 70 * safe, top - 92 * safe, r + 104 * safe, top - 96 * safe, r + 118 * safe, top + 70 * safe, 24 * safe, line, 64 * safe)
    return svg(S, S, body + ar, bg)


def lockup(dark=True):
    """W by Frank: the huge W, and Frank's arrow pointing from it to "by Frank" (his labels work that way)"""
    fg, txt, line = (SKY, WHITE, SKY_LT) if dark else (DEEP, INK, '#3E7FB0')
    size = 400
    x0, y0, x1, y1 = HEAVY.box('W', size)
    pad = 40
    x = pad - x0
    base = pad - y0
    wbody, _ = big_w(size, x, base, fg)
    tsize = 118
    tx = x + x1 + 34
    tbase = base - 6
    d, tw = SERIF.path('by Frank', tsize, tx, tbase)
    text = '<path d="%s" fill="%s"/>' % (d, txt)
    top = base + y0
    ar = arrow(x + x1 + 14, top + 4, x + x1 + 120, top - 30, tx + 92, tbase - SERIF.cap * tsize / SERIF.upm - 34, 7, line, 24)
    W = int(tx + tw + pad); H = int(base + pad + 6)
    return svg(W, H, wbody + text + ar, None, 'W by Frank')


def wordmark(dark=True):
    """Wellness by Frank: the huge W as a drop cap, ELLNESS and "by Frank" stacked beside it"""
    fg, txt, sub = (SKY, WHITE, SKY_LT) if dark else (DEEP, INK, '#3E7FB0')
    size = 420
    x0, y0, x1, y1 = HEAVY.box('W', size)
    pad = 40
    x = pad - x0
    base = pad - y0
    wbody, _ = big_w(size, x, base, fg)
    top = base + y0
    capH = y1 - y0                                # the W's height
    # ELLNESS: caps as tall as the top 46% of the W, tracked open
    esize = capH * 0.38 / (BLACK.cap / BLACK.upm)
    ex = x + x1 + 22
    ebase = top + capH * 0.38
    d1, ew = BLACK.path('ELLNESS', esize, ex, ebase, track=esize * 0.04)
    # by Frank: serif, its baseline on the W's baseline
    fsize = capH * 0.36 / (SERIF.cap / SERIF.upm)
    d2, fw = SERIF.path('by Frank', fsize, ex + 4, base)
    body = wbody + '<path d="%s" fill="%s"/><path d="%s" fill="%s"/>' % (d1, txt, d2, sub)
    W = int(max(ex + ew, ex + 4 + fw) + pad); H = int(base + pad + fsize * 0.25)
    return svg(W, H, body, None, 'Wellness by Frank')


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        'icon.svg': icon(),                                   # app icon, full bleed
        'icon-maskable.svg': icon(safe=0.78),                 # Android crops to a circle: keep it inside 80%
        'w-by-frank-dark.svg': lockup(True),
        'w-by-frank-light.svg': lockup(False),
        'wellness-by-frank-dark.svg': wordmark(True),
        'wellness-by-frank-light.svg': wordmark(False),
    }
    for n, s in files.items():
        open(os.path.join(OUT, n), 'w').write(s)
        print('wrote img/brand/' + n, len(s) // 1024, 'KB')


if __name__ == '__main__':
    main()
