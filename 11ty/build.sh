#!/usr/bin/env sh
set -e

PANREC="npx panrec"
SRC="$(dirname "$0")/.."

npm install

# csvs queries → JSON data for 11ty
$PANREC -i "$SRC" -q "_=place" | jq -s '.' > _data/raw_places.json
test -s _data/raw_places.json || { echo "ERROR: raw_places.json is empty" >&2; exit 1; }

$PANREC -i "$SRC" -q "_=item"  | jq -s '.' > _data/raw_items.json
test -s _data/raw_items.json || { echo "ERROR: raw_items.json is empty" >&2; exit 1; }

npx @11ty/eleventy
