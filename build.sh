#!/usr/bin/env sh

# turtle in _data/garden.ttl
# turned to json in _data/garden.json
npx @frogcat/ttl2jsonld nmnss/graph/index.ttl > 11ty/_data/garden.json

# csvs in ~/mm/store/quarry
# turned to _data/quarry.json
PANREC=~/mm/codes/panrec-js/src/index.js
QUARRY=~/mm/store/quarry

legend=$(node "$PANREC" -i "$QUARRY" -q "_=event&category=legend" | jq -s '.')
poems=$(node "$PANREC" -i "$QUARRY" -q "_=event&category=poem-reading" | jq -s '.')

jq -n --argjson legend "$legend" --argjson poems "$poems" \
  '{"legend": $legend, "poem-reading": $poems}' > 11ty/_data/quarry.json

npx @11ty/eleventy
