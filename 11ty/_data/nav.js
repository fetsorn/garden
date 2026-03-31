/**
 * Navigation tree for miller columns.
 *
 * Structure: [ { world, slug, label, rooms: [ { slug, label } ] } ]
 * Available to all templates as `nav`.
 */

import { getText, LANGUAGES } from './lib.js';
import { getWorlds, getRoomsByWorld, getOffersByWorld, roomSlug, worldSlug } from './graph.js';

export default function () {
  return getWorlds().map(world => {
    const wId = world['@id'];
    const wSlug = worldSlug(world);
    const rooms = getRoomsByWorld(wId).map(room => ({
      slug: roomSlug(room),
      label: getText(room['rdfs:label']),
    }));

    const offers = getOffersByWorld(wId).map(offer => ({
      id: offer['@id'],
      label: getText(offer['rdfs:label']),
      scene: getText(offer['g:scene']),
      actionLabel: getText(offer['g:action-label']),
      actionUrl: offer['g:action-url'] || null,
      price: getText(offer['g:price']),
    }));

    return {
      id: wId,
      slug: wSlug,
      label: getText(world['rdfs:label']),
      description: getText(world['g:description']),
      scene: getText(world['g:scene']),
      rooms,
      offers,
    };
  });
}
