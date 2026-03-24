/**
 * Layer 3 — Item view models
 *
 * Composes graph feeds + quarry events into one item object per
 * language × event, which items.njk paginates over.
 */

import { getText, itemSlug, asArray, presentsSet, audioMime, eventLangs, LANGUAGES } from './lib.js';
import { getRooms, getFeeds, getDoors, nodeById } from './graph.js';
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

    const roomId = feed['g:in-room']?.['@id'];
    const room = nodeById(roomId);
    if (!room) continue;

    const roomSlug = roomId.replace('g:', '');
    const doors = getDoors(roomId);

    const events = getEvents(category, {
      projects: presentsSet(feed['g:presents']),
    });

    for (const ev of events) {
      const langs = eventLangs(ev);

      const displayName = ev.city || ev.datum || '';
      const slug = itemSlug(displayName, ev.event || '');
      const title = itemTitle(category, ev);
      const rawAudio = audioRef(ev);
      const audio = rawAudio
        ? { ...rawAudio, mime: audioMime(rawAudio.extension) }
        : null;
      const normEv = { ...ev, lang: langs, actname: asArray(ev.actname) };

      for (const lang of langs) {
        items.push({
          slug,
          lang,
          category,
          title,
          event: normEv,
          audio,
          room: {
            slug: roomSlug,
            label: getText(room['rdfs:label']),
            doors,
          },
          landmarkLabel: getText(feed['rdfs:label']),
          hasOtherLang: langs.length > 1,
          otherLang: langs.length > 1 ? langs.find(l => l !== lang) : null,
        });
      }
    }
  }

  return items;
}
