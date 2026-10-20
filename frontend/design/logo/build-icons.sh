#!/bin/sh
# Rebuild the logo files in public/ from the generator (run from frontend/).
# Needs Google Chrome (headless rendering keeps the SVG filters exact) and ImageMagick.
set -e
OUT=design/logo/out
mkdir -p "$OUT"
python3 -I design/logo/generate.py "$OUT/variants.html"
python3 -I - "$OUT" <<'PY'
import sys
out = sys.argv[1]
cut = open(f"{out}/logo/logo-cut.svg").read()
body = cut[cut.index(">") + 1:cut.rindex("</svg>")]
end = body.index("</defs>") + len("</defs>")
defs, mark = body[:end], body[end:]
svg = lambda inner, extra="": f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{extra}{defs}{inner}</svg>'
PAPER, CLAY = "#fbf8f4", "#6b5a4e"
scaled = lambda s: f'<g transform="translate(32 32) scale({s}) translate(-32 -32)">{mark}</g>'
files = {
    "logo.svg": svg(mark),
    "logo-tile.svg": svg(f'<rect width="64" height="64" rx="15" fill="{PAPER}"/>' + mark),
    "logo-tile-dark.svg": svg(f'<rect width="64" height="64" rx="15" fill="{CLAY}"/>' + mark),
    "favicon.svg": svg(f'<rect class="t" width="64" height="64" rx="14" fill="{PAPER}"/>' + scaled(1.12),
                       f"<style>@media (prefers-color-scheme: dark) {{ .t {{ fill: {CLAY}; }} }}</style>"),
    "square-maskable.svg": svg(f'<rect width="64" height="64" fill="{PAPER}"/>' + scaled(0.78)),
    "square-apple.svg": svg(f'<rect width="64" height="64" fill="{PAPER}"/>' + scaled(0.95)),
}
for name, content in files.items():
    open(f"{out}/{name}", "w").write(content)
PY
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # svg size png
  printf '<html><body style="margin:0"><img src="%s" style="width:%spx;height:%spx;display:block"></body></html>' "$1" "$2" "$2" > "$OUT/_r.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size="$2,$2" --screenshot="$PWD/$OUT/$3" "file://$PWD/$OUT/_r.html" >/dev/null 2>&1
}
render logo-tile.svg 192 logo192.png
render logo-tile.svg 512 logo512.png
render square-maskable.svg 512 logo512-maskable.png
render square-apple.svg 180 apple-touch-icon.png
render favicon.svg 64 fav64.png
magick "$OUT/fav64.png" -define icon:auto-resize=48,32,16 "$OUT/favicon.ico"
cp "$OUT"/logo.svg "$OUT"/logo-tile.svg "$OUT"/logo-tile-dark.svg "$OUT"/favicon.svg "$OUT"/favicon.ico \
   "$OUT"/logo192.png "$OUT"/logo512.png "$OUT"/logo512-maskable.png "$OUT"/apple-touch-icon.png public/
echo "Logo files updated in public/"
