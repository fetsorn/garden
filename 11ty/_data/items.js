/**
 * Item pages for event-type items (those with datum, file, or actdate).
 * These are the old "quarry events" — legends, readings, blog posts.
 *
 * Place metadata resolved from slug (ADR-0024), not CSVS fields.
 *
 * item.njk expects:
 *   slug, title, category, langs, mainLang,
 *   event.{sayname, saydate, saycopyright, actname, actcopyright, datum},
 *   audio.{hash, extension, mime},
 *   place.{slug, image, label.{en,ru}, adjacent[]},
 *   landmarkLabel.{en,ru}
 */
import { json, arr, first, placeLabels, placeImage } from './resolve.js';

const MIME = {
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
};

export default function () {
  const allItems = json('raw_items.json');
  const places   = json('raw_places.json');

  // Place lookup — labels and image from slug, not CSVS
  const placeLookup = {};
  for (const p of places) {
    const slug = p.place;
    const label = placeLabels(slug);
    placeLookup[slug] = {
      slug,
      image:    placeImage(slug),
      label,
      adjacent: arr(p.adjacent).map(a => ({
        slug: a,
        label: placeLabels(a),
      })),
    };
  }

  // Feed items (items with category + in_place) — to find landmark labels
  const feedLookup = {};
  for (const it of allItems) {
    if (it.category && it.in_place) {
      const cat = first(it.category);
      feedLookup[cat] = it;
    }
  }

  // Event-type items: have datum, actdate, saydate, or file
  const eventItems = allItems.filter(it =>
    it.datum || it.actdate || it.saydate || it.file
  );

  return eventItems.map(it => {
    const cat = first(it.category);
    const feed = feedLookup[cat];
    const placeSlug = it.in_place || (feed ? feed.in_place : null);
    const place = placeLookup[placeSlug] || null;

    // Audio from file.reference
    let audio = null;
    if (it.file) {
      const file = it.file;
      const ref = file.reference;
      if (ref && ref.hash && ref.extension) {
        audio = {
          hash:      ref.hash,
          extension: ref.extension,
          mime:      MIME[ref.extension] || 'application/octet-stream',
        };
      }
    }

    // Lang from item or default
    const langs = arr(it.lang).length ? arr(it.lang) : ['en', 'ru'];

    return {
      slug:     it.item,
      title:    first(it.datum) || it.item,
      category: cat || null,
      langs,
      mainLang: langs[0],
      event: {
        sayname:      first(it.sayname) || '',
        saydate:      first(it.saydate) || '',
        saycopyright: first(it.saycopyright) || '',
        actname:      arr(it.actname),
        actcopyright: first(it.actcopyright) || '',
        datum:        first(it.datum) || '',
        actdate:      first(it.actdate) || '',
        city:         first(it.city) || '',
      },
      audio,
      place,
      landmarkLabel: feed
        ? { en: feed.item, ru: feed.item }  // slug as label fallback
        : { en: '', ru: '' },
    };
  });
}
