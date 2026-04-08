/**
 * Prose pages from items with fountain/md/html scripts (ADR-0009, ADR-0024).
 *
 * Script filenames derived from slug: {slug}.{lang}.fountain|.md|.html
 *
 * prose.njk expects:
 *   slug, langs, mainLang, content.{lang}, label.{en,ru},
 *   place.{slug, image, label.{en,ru}, adjacent[]}
 *   contextLabel.{en,ru}
 */
import {
  json, arr,
  findProseFile, renderProse,
  placeLabels, placeImage,
  placeLabelFromFountain,
} from './resolve.js';

export default function () {
  const items  = json('raw_items.json');
  const places = json('raw_places.json');

  // Place lookup — labels from fountain, image from slug
  const placeLookup = {};
  for (const p of places) {
    const slug = p.place;
    placeLookup[slug] = {
      slug,
      image: placeImage(slug),
      label: placeLabels(slug),
      adjacent: arr(p.adjacent).map(a => {
        return { slug: a, label: placeLabels(a) };
      }),
    };
  }

  const pages = [];

  for (const item of items) {
    const slug = item.item;
    const place = placeLookup[item.in_place];
    if (!place) continue;

    // Find prose files by slug convention (ADR-0024)
    const content = {};
    const langs = [];
    for (const lang of ['en', 'ru']) {
      const file = findProseFile(slug, lang);
      if (file) {
        try {
          content[lang] = renderProse(file);
          langs.push(lang);
        } catch { /* skip unreadable files */ }
      }
    }
    if (!langs.length) continue;

    // Label from the place's fountain file for this item's section
    // (first action in the section matching this slug)
    const label = {
      en: placeLabelFromFountain(place.slug, 'en'),
      ru: placeLabelFromFountain(place.slug, 'ru'),
    };

    pages.push({
      slug,
      langs,
      mainLang:     langs[0],
      content,
      label:        { en: '', ru: '' },
      description:  { en: '', ru: '' },
      place,
      contextLabel: { en: '', ru: '' },
    });
  }

  return pages;
}
