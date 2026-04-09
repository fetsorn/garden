/**
 * Feed pages from CSVS items with category (ADR-0009, ADR-0024).
 *
 * A feed is an item with a `category` field.
 * Its page lists all other items sharing that category.
 */
import {
  json, first, hasProse, LANGS,
  datumFromFountain,
  buildLandmarkLabels,
} from './resolve.js';

export default function () {
  const items = json('raw_items.json');

  // A feed is an item with category AND in_place, but not an offer.
  // Offers have category "offer" and are rendered as passthrough HTML, not feeds.
  const feeds = items.filter(it => it.category && it.in_place && first(it.category) !== 'offer');

  // Group all items by category for listing
  const byCategory = {};
  for (const it of items) {
    const cats = Array.isArray(it.category) ? it.category : it.category ? [it.category] : [];
    for (const cat of cats) {
      (byCategory[cat] ??= []).push(it);
    }
  }

  // Landmark labels from place fountain sections
  const allPlaces = json('raw_places.json');
  const landmarkLabels = buildLandmarkLabels(allPlaces);

  return feeds.map(feed => {
    const cat = first(feed.category);
    // All items in this category except the feed item itself
    const entries = (byCategory[cat] || [])
      .filter(it => it.item !== feed.item)
      .sort((a, b) => {
        // Sort by actdate descending, fallback to saydate
        const da = first(a.actdate) || first(a.saydate) || '';
        const db = first(b.actdate) || first(b.saydate) || '';
        return db.localeCompare(da);
      })
      .map(it => ({
        slug:  it.item,
        date:  first(it.actdate) || first(it.saydate) || '',
        name:  datumFromFountain(it.item) || (Array.isArray(it.actname) ? it.actname.join(', ') : it.actname) || first(it.sayname) || it.item,
        url:   first(it.url) || null,
        hasProse: hasProse(it.item),
      }));

    return {
      slug:     feed.item,
      category: cat,
      label:    landmarkLabels[feed.item] || { en: feed.item, ru: feed.item },
      langs:    LANGS,
      place:    feed.in_place || null,
      entries,
    };
  });
}
