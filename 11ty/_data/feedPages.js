/**
 * Feed pages from explicit in_feed relations.
 *
 * A feed is an item that other items reference via in_feed.
 * Its page lists all items where in_feed = this slug.
 */
import {
  json, first, hasProse, LANGS,
  datumFromFountain,
  buildLandmarkLabels,
} from './resolve.js';

export default function () {
  const items = json('raw_items.json');

  // Group items by their in_feed target
  const byFeed = {};
  for (const it of items) {
    const feedSlug = first(it.in_feed);
    if (feedSlug) (byFeed[feedSlug] ??= []).push(it);
  }

  // Item lookup
  const itemLookup = {};
  for (const it of items) itemLookup[it.item] = it;

  // Landmark labels from place fountain sections
  const allPlaces = json('raw_places.json');
  const landmarkLabels = buildLandmarkLabels(allPlaces);

  // Each unique in_feed target that exists as an item gets a feed page
  return Object.keys(byFeed)
    .filter(slug => itemLookup[slug])
    .map(slug => {
      const feed = itemLookup[slug];
      const entries = byFeed[slug]
        .sort((a, b) => {
          const da = first(a.actdate) || first(a.saydate) || '';
          const db = first(b.actdate) || first(b.saydate) || '';
          return db.localeCompare(da);
        })
        .map(it => ({
          slug:     it.item,
          date:     first(it.actdate) || first(it.saydate) || '',
          name:     datumFromFountain(it.item) || (Array.isArray(it.actname) ? it.actname.join(', ') : it.actname) || first(it.sayname) || it.item,
          url:      first(it.url) || null,
          hasProse: hasProse(it.item),
        }));

      return {
        slug,
        label:  landmarkLabels[slug] || { en: slug, ru: slug },
        langs:  LANGS,
        place:  feed.in_place || null,
        entries,
      };
    });
}
