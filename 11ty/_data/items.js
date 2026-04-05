/**
 * Layer 3 — Item view models
 *
 * Composes graph feeds + quarry events into one item object per
 * event, which items.njk paginates over.  Each item carries all
 * its available translations (langs, mainLang).
 */

import { getText, itemSlug, asArray, presentsSet, audioMime, eventLangs, LANGUAGES } from './lib.js';
import { getFeeds, getAdjacent, nodeById, placeSlug } from './graph.js';
import { getEvents, hasCategory } from './quarry.js';

/** Compute display title per category. */
function itemTitle(category, ev) {
  switch (category) {
    case 'legend': {
      const date = ev.actdate || '';
      const city = ev.city || '';
      return date && city ? `${date} — ${city}` : city || date;
    }
    case 'poem-reading':
      return ev.datum || '';
    default:
      return ev.datum || '';
  }
}

/** Extract first audio file reference from a nested event. */
function audioRef(ev) {
  if (!ev.file) return null;
  const files = Array.isArray(ev.file) ? ev.file : [ev.file];
  for (const f of files) {
    const refs = f.reference
      ? (Array.isArray(f.reference) ? f.reference : [f.reference])
      : [];
    for (const ref of refs) {
      if (ref.hash && ref.extension) return ref;
    }
  }
  return null;
}

export default function () {
  const items = [];

  for (const feed of getFeeds()) {
    const category = feed['g:category'];
    if (!category || !hasCategory(category)) continue;

    const placeId = feed['g:in-place']?.['@id'];
    const place = nodeById(placeId);
    if (!place) continue;

    const slug_ = placeSlug(place);
    const image = place['g:image'] || `${placeId.replace('g:', '')}.jpg`;
    const adjacent = getAdjacent(placeId).map(adj => ({
      slug: placeSlug(adj),
      label: getText(adj['rdfs:label']),
    }));

    const events = getEvents(category, {
      projects: presentsSet(feed['g:presents']),
    });

    for (const ev of events) {
      const langs = eventLangs(ev);

      const displayName = ev.city || ev.datum || '';
      const evSlug = itemSlug(displayName, ev.event || '');
      const title = itemTitle(category, ev);
      const rawAudio = audioRef(ev);
      const audio = rawAudio
        ? { ...rawAudio, mime: audioMime(rawAudio.extension) }
        : null;
      const normEv = { ...ev, lang: langs, actname: asArray(ev.actname) };

      items.push({
        slug: evSlug,
        langs,
        mainLang: langs[0],
        category,
        title,
        event: normEv,
        audio,
        place: {
          slug: slug_,
          image,
          label: getText(place['rdfs:label']),
          adjacent,
        },
        landmarkLabel: getText(feed['rdfs:label']),
      });
    }
  }

  return items;
}
