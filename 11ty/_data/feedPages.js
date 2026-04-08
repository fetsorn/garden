/**
 * Feed pages from CSVS items with category (ADR-0009, ADR-0024).
 *
 * A feed is an item with a `category` field.
 * Its page lists all other items sharing that category.
 */
import { json, first, hasProse } from './resolve.js';

export default function () {
  const items = json('raw_items.json');

  // A feed is an item with category AND in_place (placed in fountain as a section).
  // Items with category but no in_place are feed entries (events).
  const feeds = items.filter(it => it.category && it.in_place);

  // Group all items by category for listing
  const byCategory = {};
  for (const it of items) {
    const cats = Array.isArray(it.category) ? it.category : it.category ? [it.category] : [];
    for (const cat of cats) {
      (byCategory[cat] ??= []).push(it);
    }
  }

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
        name:  first(it.datum) || (Array.isArray(it.actname) ? it.actname.join(', ') : it.actname) || first(it.sayname) || it.item,
        url:   first(it.url) || null,
        hasProse: hasProse(it.item),
      }));

    return {
      slug:     feed.item,
      category: cat,
      langs:    ['en', 'ru'],
      entries,
    };
  });
}
