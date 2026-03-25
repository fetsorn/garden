/**
 * Layer 1 — Graph reading
 *
 * Reads garden.json (JSON-LD converted from TTL), indexes all nodes,
 * and exposes typed accessors for rooms, landmarks, and doors.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getText } from './lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _graph = null;
let _byId = null;

/** Parse garden.json once, cache the result. */
function load() {
  if (_graph) return;
  const garden = JSON.parse(readFileSync(join(__dirname, 'garden.json'), 'utf8'));
  _graph = garden['@graph'];
  _byId = {};
  for (const node of _graph) {
    if (node['@id']) _byId[node['@id']] = node;
  }
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

/** Return all Room nodes. */
export function getRooms() {
  load();
  return _graph.filter(n => n['@type'] === 'g:Room');
}

/**
 * Compute the URL slug for a room: "name-uuid" if g:uuid exists,
 * otherwise just the bare name from @id.
 */
export function roomSlug(room) {
  const name = room['@id'].replace('g:', '');
  const uuid = room['g:uuid'] || '';
  return uuid ? `${name}-${uuid}` : name;
}

/**
 * Return non-Door landmarks for a room, in @graph order.
 * Each landmark is a raw JSON-LD node.
 */
export function getLandmarks(roomId) {
  load();
  return _graph.filter(n => {
    const type = n['@type'];
    if (!type || type === 'g:Room' || type === 'g:Door') return false;
    return n['g:in-room']?.['@id'] === roomId;
  });
}

/**
 * Return Door nodes for a room, resolved to { targetSlug, label }.
 */
export function getDoors(roomId) {
  load();
  return _graph
    .filter(n => n['@type'] === 'g:Door' && n['g:in-room']?.['@id'] === roomId)
    .map(node => {
      const targetId = node['g:target']?.['@id'];
      const targetRoom = _byId[targetId];
      return {
        targetSlug: targetRoom ? roomSlug(targetRoom) : (targetId?.replace('g:', '') || ''),
        label: getText(targetRoom?.['rdfs:label']),
      };
    });
}

/**
 * Return all Feed nodes (across all rooms).
 */
export function getFeeds() {
  load();
  return _graph.filter(n => n['@type'] === 'g:Feed');
}
