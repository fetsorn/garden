#!/usr/bin/env sh
set -e

# turtle in _data/garden.ttl
# turned to json in _data/garden.json
npx @frogcat/ttl2jsonld ../graph/index.ttl > _data/garden.json

# csvs in ../csvs — query all events
# group by category into _data/quarry.json
npx panrec -i ../ -q "_=event" | jq -s 'group_by(.category) | map({key: .[0].category, value: .}) | from_entries' > _data/quarry.json

npx @11ty/eleventy
