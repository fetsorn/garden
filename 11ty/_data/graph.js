/**
 * Layer 1 — Graph reading
 *
 * Reads garden.json (JSON-LD converted from TTL), indexes all nodes,
 * and exposes typed accessors for places, landmarks, and adjacency.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getText } from './lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _graph = null;
let _byId = null;

/**
 * Parse garden.json once, cache the result.
 * ttl2jsonld may produce multiple graph nodes with the same @id
 * (e.g. Place properties and adjacency triples are separate).
 * We merge them into a single object per @id.
 */
function load() {
  if (_graph) return;
  const garden = JSON.parse(readFileSync(join(__dirname, 'garden.json'), 'utf8'));
  const raw = garden['@graph'];

  // Merge nodes sharing the same @id
  _byId = {};
  for (const node of raw) {
    const id = node['@id'];
    if (!id) continue;
    if (_byId[id]) {
      // Merge properties: later values override, except arrays are concatenated
      for (const [key, val] of Object.entries(node)) {
        if (key === '@id') continue;
        if (_byId[id][key] === undefined) {
          _byId[id][key] = val;
        }
        // If both exist, keep the one that has @type (don't overwrite type with undefined)
      }
    } else {
      _byId[id] = { ...node };
    }
  }

  _graph = Object.values(_byId);
}

/** Return the raw @graph array. */
export function rawGraph() {
  load();
  return _graph;
}

/** Look up any node by @id. */
export function nodeById(id) {
  load();
  return _byId[id] || null;
}

/** Return all Place nodes. */
export function getPlaces() {
  load();
  return _graph.filter(n => n['@type'] === 'g:Place');
}

/**
 * Compute the URL slug for a place: bare name from @id.
 */
export function placeSlug(place) {
  const name = place['@id'].replace('g:', '');
  const uuid = place['g:uuid'] || '';
  return uuid ? `${name}-${uuid}` : name;
}

/**
 * Return place nodes adjacent to the given place.
 * Reads g:adjacent, which may be a single ref or an array.
 */
export function getAdjacent(placeId) {
  load();
  const place = _byId[placeId];
  if (!place) return [];
  const adj = place['g:adjacent'];
  if (!adj) return [];
  const refs = Array.isArray(adj) ? adj : [adj];
  return refs
    .map(ref => _byId[ref['@id'] || ref])
    .filter(Boolean);
}

/**
 * Return non-Door landmarks for a place, in @graph order.
 * Each landmark is a raw JSON-LD node.
 */
export function getLandmarks(placeId) {
  load();
  return _graph.filter(n => {
    const type = n['@type'];
    if (!type || type === 'g:Place') return false;
    return n['g:in-place']?.['@id'] === placeId;
  });
}

/**
 * Return all Feed nodes (across all places).
 */
export function getFeeds() {
  load();
  return _graph.filter(n => n['@type'] === 'g:Feed');
}

/**
 * Return Offer nodes belonging to a specific place, ordered by g:order.
 */
export function getOffersByPlace(placeId) {
  load();
  return _graph
    .filter(n => n['@type'] === 'g:Offer' && n['g:in-place']?.['@id'] === placeId)
    .sort((a, b) => (a['g:order'] || 0) - (b['g:order'] || 0));
}

/**
 * Return all Offer nodes, ordered by g:order.
 */
export function getOffers() {
  load();
  return _graph
    .filter(n => n['@type'] === 'g:Offer')
    .sort((a, b) => (a['g:order'] || 0) - (b['g:order'] || 0));
}
