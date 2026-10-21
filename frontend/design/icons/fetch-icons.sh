#!/bin/sh
# Fetch the Material Symbols subset the app uses into src/fonts/ (run from
# frontend/). The app serves the file itself, so no page load asks Google.
# Add a name to ICONS (alphabetical, as Google wants), run this, commit the font.
set -e
ICONS="add,arrow_back,chevron_right,close,directions_walk,location_on,location_searching,my_location,remove"
# Weight 300 (outline) to 400 (filled), fill 0..1, one optical size
AXES="opsz,wght,FILL,GRAD@24,300..400,0..1,0"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
CSS=$(curl -fsS -A "$UA" "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:$AXES&icon_names=$ICONS&display=block")
URL=$(printf '%s' "$CSS" | sed -n 's/.*src: url(\([^)]*\)).*/\1/p')
curl -fsS -o src/fonts/material-symbols.woff2 "$URL"
ls -l src/fonts/material-symbols.woff2
