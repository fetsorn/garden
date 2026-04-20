#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
npm install
npx @11ty/eleventy
npx prettier _site/ --write
