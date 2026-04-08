/**
 * Navigation data — minimal, from CSVS + fountain labels (ADR-0009, ADR-0024).
 * index.njk uses nav[].slug for the random-wander list.
 */
import { json, placeLabels } from './resolve.js';

export default function () {
  return json('raw_places.json').map(p => ({
    slug:  p.place,
    label: placeLabels(p.place),
  }));
}
