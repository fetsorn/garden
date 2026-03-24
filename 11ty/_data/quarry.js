/**
 * Layer 2 — Quarry reading
 *
 * Reads quarry.json (CSVS events grouped by category) and exposes
 * a query function that handles project-filtering and sorting.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _quarry = null;

/** Parse quarry.json once, cache the result. */
function load() {
  if (_quarry) return;
  try {
    _quarry = JSON.parse(readFileSync(join(__dirname, 'quarry.json'), 'utf8'));
  } catch {
    _quarry = {};
  }
}

/**
 * Return events for a category, optionally filtered and sorted.
 *
 * @param {string} category        - quarry category key (e.g. "legend")
 * @param {Object} [opts]
 * @param {Set}    [opts.projects]  - if provided, keep only events whose project is in this set
 * @param {string} [opts.orderBy]   - event field to sort by
 * @param {string} [opts.orderDirection] - "ascending" (default) or "descending"
 * @returns {Array} filtered, sorted events (empty array if category missing)
 */
export function getEvents(category, opts = {}) {
  load();
  if (!_quarry[category]) return [];

  let events = _quarry[category];

  const { projects, orderBy, orderDirection = 'ascending' } = opts;

  if (projects) {
    events = events.filter(e => e.project && projects.has(e.project));
  }

  if (orderBy) {
    // localeCompare works for ISO-8601 dates (YYYY-MM-DD) since they sort lexicographically
    events = [...events].sort((a, b) => {
      const va = a[orderBy] || '';
      const vb = b[orderBy] || '';
      return orderDirection === 'descending'
        ? vb.localeCompare(va)
        : va.localeCompare(vb);
    });
  }

  return events;
}

/** Check whether a category exists in the quarry. */
export function hasCategory(category) {
  load();
  return !!_quarry[category];
}
