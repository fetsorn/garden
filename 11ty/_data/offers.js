/**
 * Layer 3 — Offer view models
 *
 * All g:Offer nodes. Used by the gate (index.njk) and places.
 * Offer pages are standalone HTML in landings/, outside the build.
 */

import { getText, getLangMap, LANGUAGES, DEFAULT_LANG } from './lib.js';
import { getOffers, nodeById, placeSlug } from './graph.js';

export default function () {
  return getOffers().map(offer => {
    const slug = offer['g:slug'] || offer['@id'].replace('g:', '');
    const placeId = offer['g:in-place']?.['@id'] || null;
    const place = placeId ? nodeById(placeId) : null;

    const labelMap = getLangMap(offer['rdfs:label']);
    const langs = LANGUAGES.filter(l => labelMap[l]);

    return {
      slug,
      langs: langs.length ? langs : [DEFAULT_LANG],
      label: getText(offer['rdfs:label']),
      price: getText(offer['g:price']),
      actionUrl: offer['g:action-url'] || null,
      place: place ? { slug: placeSlug(place), label: getText(place['rdfs:label']) } : null,
    };
  });
}
