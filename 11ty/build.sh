#!/usr/bin/env sh
set -e

PANREC="npx panrec"
SRC=../

# csvs queries → JSON data for 11ty
$PANREC -i $SRC -q "_=place" | jq -s '.' > _data/raw_places.json
$PANREC -i $SRC -q "_=item"  | jq -s '.' > _data/raw_items.json

npx @11ty/eleventy
