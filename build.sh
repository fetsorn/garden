#!/usr/bin/env sh

# turtle in _data/garden.ttl
# turned to json in _data/garden.json
npx @frogcat/ttl2jsonld nmnss/graph/index.ttl > 11ty/_data/garden.json

# csvs in ~/mm/lodes/quarry
# turned to _data/quarry.json

npx @11ty/eleventy
