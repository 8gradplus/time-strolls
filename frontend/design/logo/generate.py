"""Generate the Time Strolls logo: a circle torn by small hands from paper painted in Rothko-like fields.

Usage (from frontend/): python3 -I design/logo/generate.py design/logo/out/variants.html
Writes a preview page of the six round-9 variants and design/logo/out/logo/*.svg.
The chosen logo is the shape of "ember" painted with the fields of "ash", cut clean
(no white torn edge). build-icons.sh turns it into the files in public/.
Shapes are random but seeded, so the output is the same on every run.
"""
import math, random, re, sys

out_path = sys.argv[1]
random.seed(5)

def f(v):
    return f"{v:.2f}"

def catmull(pts, steps=10):
    """Densify a closed outline along a Catmull-Rom curve (keeps the big gesture smooth)."""
    out, n = [], len(pts)
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    return out

def fray(pts, amp=0.55):
    """Small fibrous unevenness on top of the big shape; correlated so it reads as paper, not noise."""
    out, drift = [], 0.0
    for i, (x, y) in enumerate(pts):
        p, q = pts[i - 1], pts[(i + 1) % len(pts)]
        dx, dy = q[0] - p[0], q[1] - p[1]
        ln = math.hypot(dx, dy) or 1
        drift = drift * 0.6 + random.uniform(-amp, amp)
        out.append((x - dy / ln * drift, y + dx / ln * drift))
    return out

def poly(pts):
    return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"

def outline(ctrl, sharp=(), steps=10):
    """Big hand-torn gesture: smooth curve through `ctrl`, but indices in `sharp` stay pointed corners."""
    if not sharp:
        return fray(catmull(ctrl, steps))
    pts = []
    n = len(ctrl)
    for i in range(n):
        a, b = ctrl[i], ctrl[(i + 1) % n]
        if i in sharp or (i + 1) % n in sharp:
            for s in range(steps):
                t = s / steps
                pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        else:
            seg = catmull([ctrl[i - 1], a, b, ctrl[(i + 2) % n]], steps)
            pts += seg[steps:2 * steps]
    return fray(pts)

def field(x0, y0, x1, y1, color, op, flt="fieldA"):
    return f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="2" fill="{color}" opacity="{op}" filter="url(#{flt})"/>'

def canvas(ground, *fields):
    """A Rothko: a ground colour with soft, glowing rectangles floating on it, plus brush streaks."""
    return (f'<rect x="-6" y="-6" width="76" height="76" fill="{ground}"/>' + "".join(fields)
            + '<rect x="-6" y="-6" width="76" height="76" fill="#000" filter="url(#streaks)" opacity=".28" style="mix-blend-mode:soft-light"/>'
            + '<rect x="-6" y="-6" width="76" height="76" fill="#fff" filter="url(#streaks2)" opacity=".22" style="mix-blend-mode:soft-light"/>')

def piece(uid, pts, paint, rot=0, edge=True):
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    d = poly(pts)
    return f'''<clipPath id="c-{uid}"><path d="{d}"/></clipPath>
<g transform="rotate({rot} {f(cx)} {f(cy)})">
  <path d="{d}" fill="#2b2a26" opacity=".16" filter="url(#shadow)" transform="translate(.4 .7)"/>
  {f'<path d="{d}" fill="none" stroke="#fffdf6" stroke-width="1" stroke-linejoin="round" opacity=".9" filter="url(#fibre)"/>' if edge else ''}
  <g clip-path="url(#c-{uid})" style="isolation:isolate">{paint}</g>
</g>'''

GREEN, DEEP, MOSS, AMBER, OCHRE, RUST, MAROON, LAKE, NIGHT = (
    "#3f8f6f", "#24614c", "#5d8a4e", "#eaa83f", "#d9a54a", "#c8562f", "#6e2a2a", "#4f7f9c", "#1f3a33")

S, names = {}, []

YELLOW, OCHRE, RED, VERMIL, MAROON, GRAY, PALEGRAY, CHAR, ROSE = (
    "#f1b82e", "#d4952c", "#c43d2c", "#df5a2a", "#6b2626", "#9b9188", "#cfc6ba", "#4a423d", "#d9826f")

P, PAINT = {}, {}

def add(key, title, text, pts, paint, rot=0):
    P[key], PAINT[key] = pts, paint
    S[key] = piece(key, pts, paint, rot)
    names.append((key, title, text))

def torn_circle(cx=32, cy=32, r=21, n=12, wob=0.07, notch=None, flat=None):
    """A circle torn by small hands: uneven radius, maybe one dent, maybe one flat stretch."""
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        rr = r * (1 + random.uniform(-wob, wob))
        if notch is not None and k == notch:
            rr *= 0.8
        if flat is not None and k in flat:
            rr *= 0.93
        pts.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    return outline(pts)

add("sun", "1 · Yellow over red", "A glowing yellow field over a deep red, with a grey seam between them. One small dent at the top right.",
    torn_circle(notch=10),
    canvas(GRAY, field(-2, 4, 66, 30, YELLOW, .97), field(-2, 35, 66, 66, RED, .95)), rot=-6)

add("ember", "2 · Red with a yellow crown", "A red ground with a thin yellow field at the top and warm grey below.",
    torn_circle(n=11, wob=0.09, flat=(3, 4)),
    canvas(RED, field(-2, 6, 66, 21, YELLOW, .95), field(-2, 42, 66, 66, GRAY, .85)), rot=4)

add("ash", "3 · Grey and red", "Calm and grown-up: a warm grey ground, a red field floating in it and a thin glow of ochre.",
    torn_circle(n=13, wob=0.06, notch=4),
    canvas(PALEGRAY, field(-2, 18, 66, 44, RED, .92), field(-2, 47, 66, 52, OCHRE, .9)), rot=0)

add("dusk", "4 · Orange into maroon", "Classic Rothko warmth: vermilion and yellow above, a deep maroon below.",
    torn_circle(n=12, wob=0.08, flat=(7,)),
    canvas(MAROON, field(-2, 3, 66, 16, YELLOW, .9), field(-2, 18, 66, 33, VERMIL, .95), field(-2, 37, 66, 66, MAROON, .9)), rot=8)

add("three", "5 · Grey, yellow, red", "Three bands, light to dark: warm grey, yellow, red.",
    torn_circle(n=12, wob=0.08, notch=2),
    canvas(CHAR, field(-2, 3, 66, 22, PALEGRAY, .95), field(-2, 25, 66, 40, YELLOW, .97), field(-2, 43, 66, 66, RED, .95)), rot=-3)

add("rose", "6 · Rose and ochre", "Softer: a rose field over ochre on a grey ground.",
    torn_circle(n=11, wob=0.09),
    canvas(GRAY, field(-2, 5, 66, 31, ROSE, .95), field(-2, 35, 66, 66, OCHRE, .95)), rot=5)

defs = '''
<filter id="fieldA" filterUnits="userSpaceOnUse" x="-10" y="-10" width="84" height="84">
  <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="8" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="1.4"/>
</filter>
<filter id="streaks" filterUnits="userSpaceOnUse" x="-6" y="-6" width="76" height="76">
  <feTurbulence type="fractalNoise" baseFrequency=".03 .55" numOctaves="2" seed="3" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.2 -1" result="a"/>
  <feComposite in="SourceGraphic" in2="a" operator="in"/>
</filter>
<filter id="streaks2" filterUnits="userSpaceOnUse" x="-6" y="-6" width="76" height="76">
  <feTurbulence type="fractalNoise" baseFrequency=".05 .35" numOctaves="2" seed="13" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.4 -1.2" result="a"/>
  <feComposite in="SourceGraphic" in2="a" operator="in"/>
</filter>
<filter id="fibre" filterUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">
  <feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="1" seed="5" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale=".9" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="shadow" filterUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80"><feGaussianBlur stdDeviation=".8"/></filter>
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="2"/>
<feColorMatrix type="matrix" values="0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .42  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>'''

tile = '<rect width="64" height="64" rx="15" fill="var(--tilebg, transparent)"/><rect width="64" height="64" rx="15" fill="#000" filter="url(#paper)" opacity="var(--grain, 0)"/>'
symbols = "".join(f'<symbol id="{k}" viewBox="0 0 64 64">{tile}{S[k]}</symbol>' for k, _, _ in names)

def card(k, t, d):
    return f'''<div class="card"><h2>{t}</h2><p>{d}</p>
<div class="row">{{U:{k}:170:}}{{U:{k}:150:tile}}{{U:{k}:150:green}}</div>
<div class="row">{{U:{k}:64:tile}}{{U:{k}:48:tile}}{{U:{k}:32:tile}}{{U:{k}:16:tile}}{{U:{k}:48:green}}{{U:{k}:32:green}}</div>
<div class="word">{{U:{k}:44:}}<span><i>Time</i> Strolls</span></div>
<div class="dark"><div class="word">{{U:{k}:44:}}<span><i>Time</i> Strolls</span></div></div></div>'''

cards = "".join(card(*n) for n in names)
cards = re.sub(r"\{U:(\w+):(\d+):([\w-]*)\}", lambda m: f'<svg class="m {m[3]}" width="{m[2]}" height="{m[2]}"><use href="#{m[1]}"/></svg>', cards)

html = f'''<!doctype html><html><head><meta charset="utf-8"/><title>Logo variants, round 9</title>
<link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
body {{ margin:0; padding:28px; font:14px -apple-system,sans-serif; background:#f3eee3; color:#2b2a26; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(560px,1fr)); gap:28px; }}
.card {{ background:#fbf8f1; border:1px solid rgba(43,42,38,.14); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:14px; }}
h2 {{ font:700 17px Merriweather,Georgia,serif; margin:0; }}
p {{ margin:0; color:#6b665c; line-height:1.45; }}
.row {{ display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; }}
.dark {{ background:#181a17; border-radius:10px; padding:12px; }}
.word {{ display:flex; align-items:center; gap:10px; font:700 21px Merriweather,Georgia,serif; }}
.word i {{ font-weight:400; }} .dark .word {{ color:#ece8de; }}
.m.tile {{ --tilebg:#fffdf7; --grain:1; filter:drop-shadow(0 0 .5px rgba(43,42,38,.35)); }}
.m.green {{ --tilebg:#2b2724; }}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>{defs}{symbols}</defs></svg>
<div class="grid">{cards}</div></body></html>'''
open(out_path, "w").write(html)
print("ok")

# The chosen logo: the shape of "ember" painted with the fields of "ash"
import os
logo_dir = os.path.join(os.path.dirname(out_path), "logo")
os.makedirs(logo_dir, exist_ok=True)
marks = {"torn": piece("logo", P["ember"], PAINT["ash"], 4), "cut": piece("logoc", P["ember"], PAINT["ash"], 4, edge=False)}
tiles = {"": "", "-tile": "#fbf8f4", "-tile-dark": "#221e1c",
         "-tile-umber": "#4a3f38", "-tile-slate": "#57514c", "-tile-clay": "#6b5a4e", "-tile-plum": "#4b3437"}
for style, mark in marks.items():
    for suffix, bg in tiles.items():
        rect = f'<rect width="64" height="64" rx="15" fill="{bg}"/>' if bg else ""
        name = f"logo{'-cut' if style == 'cut' else ''}{suffix}.svg"
        open(os.path.join(logo_dir, name), "w").write(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>{defs}</defs>{rect}{mark}</svg>')
print("logo written")
