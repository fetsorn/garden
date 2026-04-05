/**
 * Navigation data for star view (ADR-0006).
 *
 * Structure: [ { slug, label, adjacent: [ { slug, label } ] } ]
 * Each place carries its own adjacency list for fog-of-war navigation.
 * Available to all templates as `nav`.
 */

import { getText } from './lib.js';
import { getPlaces, getAdjacent, placeSlug } from './graph.js';

export default function () {
  return getPlaces().map(place => {
    const id = place['@id'];
    const adjacent = getAdjacent(id).map(adj => ({
      slug: placeSlug(adj),
      label: getText(adj['rdfs:label']),
    }));

    return {
      id,
      slug: placeSlug(place),
      label: getText(place['rdfs:label']),
      description: getText(place['g:description']),
      adjacent,
    };
  });
}
