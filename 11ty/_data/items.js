/**
 * Unified item pages — merges CSVS metadata with fountain prose (plan 0007).
 *
 * Three sovereign sources, one join key (slug):
 *   Item fountain ({slug}.{lang}.fountain) → datum (title), prose body
 *   Place fountain ({place}.{lang}.fountain) → landmark labels (contextLabel)
 *   CSVS (raw_items.json) → dates, names, rights, files, category, status
 *
 * item.njk expects:
 *   slug, title, category, langs, mainLang,
 *   event.{sayname, saydate, saycopyright, actname, actcopyright, actdate, city},
 *   audio.{hash, extension, mime},
 *   content.{lang} (rendered prose HTML, may be null),
 *   place.{slug, image, label.{en,ru}, adjacent[]},
 *   contextLabel.{en,ru}
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  json, arr, first, LANGS,
  placeLabels, placeImage, proseDir,
  findProseFile, findHtmlPage, renderProse,
  datumFromFountainLang,
  buildLandmarkLabels,
} from './resolve.js';

const MIME = {
  mp3:  'audio/mpeg',
  ogg:  'audio/ogg',
  wav:  'audio/wav',
  m4a:  'audio/mp4',
  flac: 'audio/flac',
  opus: 'audio/opus',
  webm: 'audio/webm',
  mp4:  'video/mp4',
};

export default function () {
  const allItems = json('raw_items.json');
  const places   = json('raw_places.json');

  // Place lookup — labels and image from slug
  const placeLookup = {};
  for (const p of places) {
    const slug = p.place;
    placeLookup[slug] = {
      slug,
      image:    placeImage(slug),
      label:    placeLabels(slug),
      adjacent: arr(p.adjacent).map(a => ({
        slug: a,
        label: placeLabels(a),
      })),
    };
  }

  // Landmark labels from place fountain sections
  const landmarkLabels = buildLandmarkLabels(places);

  // Item lookup by slug (for in_feed → feed item resolution)
  const itemLookup = {};
  for (const it of allItems) itemLookup[it.item] = it;

  // Event-type items: have actdate, saydate, file, prose, or standalone HTML
  const eventItems = allItems.filter(it =>
    it.actdate || it.saydate || it.file ||
    LANGS.some(l => findProseFile(it.item, l)) ||
    findHtmlPage(it.item)
  );

  const all = eventItems.map(it => {
    const slug = it.item;
    const feedSlug = first(it.in_feed);
    const feed = feedSlug ? itemLookup[feedSlug] : null;
    const placeSlug = it.in_place || (feed ? feed.in_place : null);
    const place = placeLookup[placeSlug] || null;

    // Datum from fountain (item-first)
    const datumByLang = {};
    for (const lang of LANGS) {
      datumByLang[lang] = datumFromFountainLang(slug, lang);
    }
    // Best datum: first non-null across languages
    const datum = LANGS.map(l => datumByLang[l]).find(d => d) || slug;

    // Prose content from fountain/md/html
    const content = {};
    const langs = [];
    for (const lang of LANGS) {
      const file = findProseFile(slug, lang);
      if (file) {
        try {
          content[lang] = renderProse(file);
          langs.push(lang);
        } catch { /* skip unreadable */ }
      }
    }
    // Fallback langs from CSVS if no prose files found
    if (!langs.length) {
      const csvLangs = arr(it.lang);
      langs.push(...(csvLangs.length ? csvLangs : LANGS));
    }

    // Audio from file.reference
    let audio = null;
    if (it.file) {
      const ref = it.file.reference;
      if (ref && ref.hash && ref.extension) {
        audio = {
          hash:      ref.hash,
          extension: ref.extension,
          mime:      MIME[ref.extension] || 'application/octet-stream',
        };
      }
    }

    // Context label: landmark label from place fountain (feed or item slug)
    const contextLabel = landmarkLabels[feedSlug] || landmarkLabels[slug] || { en: '', ru: '' };

    // Standalone HTML: passthrough full document, no template wrapping
    const htmlFile = findHtmlPage(slug);
    const htmlPassthrough = htmlFile
      ? readFileSync(join(proseDir, htmlFile), 'utf8')
      : null;

    return {
      slug,
      title:    datum,
      category: first(it.category) || null,
      langs,
      mainLang: langs[0],
      event: {
        sayname:      first(it.sayname) || '',
        saydate:      first(it.saydate) || '',
        saycopyright: first(it.saycopyright) || '',
        actname:      arr(it.actname),
        actcopyright: first(it.actcopyright) || '',
        actdate:      first(it.actdate) || '',
        city:         first(it.city) || '',
      },
      audio,
      content:  Object.keys(content).length ? content : null,
      htmlPassthrough,
      place,
      contextLabel,
    };
  });

  return {
    templated:   all.filter(it => !it.htmlPassthrough),
    passthrough: all.filter(it => it.htmlPassthrough),
  };
}
