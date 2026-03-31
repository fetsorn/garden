/**
 * Navigation tree for miller columns.
 *
 * Structure: [ { world, slug, label, rooms: [ { slug, label } ] } ]
 * Available to all templates as `nav`.
 */

import { getText, LANGUAGES } from './lib.js';
import { getWorlds, getRoomsByWorld, roomSlug, worldSlug } from './graph.js';

export default function () {
  return getWorlds().map(world => {
    const wId = world['@id'];
    const wSlug = worldSlug(world);
    const rooms = getRoomsByWorld(wId).map(room => ({
      slug: roomSlug(room),
      label: getText(room['rdfs:label']),
    }));

    return {
      id: wId,
      slug: wSlug,
      label: getText(world['rdfs:label']),
      description: getText(world['g:description']),
      rooms,
    };
  });
}
