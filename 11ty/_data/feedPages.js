/**
 * Layer 3 — Feed page view models
 *
 * One page per g:Feed node. Shows the feed description and its
 * entries (TTL-defined or quarry-backed) with a back-link to
 * the parent place.
 */

import { getText, getLangMap, itemSlug, asArray, presentsSet, LANGUAGES, DEFAULT_LANG } from './lib.js';
import { getFeeds, nodeById, getAdjacent, placeSlug } from './graph.js';
import { getEvents, hasCategory } from './quarry.js';

/** Build entries for a TTL-defined entry-based feed. */
function buildEntries(node) {
  const raw = Array.isArray(node['g:entry']) ? node['g:entry'] : [node['g:entry']];
  return raw.map(e => {
    const label = getText(e['rdfs:label']);
    const url = e['g:url'] || null;
    const proseVal = e['g:prose'] || null;
    const date = e['g:date'] || '';
    const prosePaths = getLangMap(proseVal);
    const hasProse = LANGUAGES.some(l => prosePaths[l]);
    let proseSlug = null;
    if (hasProse) {
      const text = label.en || label.ru;
      proseSlug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    return { label, url, prose: hasProse, proseLangs: Object.fromEntries(LANGUAGES.map(l => [l, !!prosePaths[l]])), slug: proseSlug, date };
  });
}

/** Build per-language item lists for a quarry-backed feed. */
function buildFeedItems(node) {
  const category = node['g:category'];
  const orderBy = node['g:order-by'] || null;
  const orderDirection = node['g:order-direction'] || 'ascending';
  const events = getEvents(category, {
    projects: presentsSet(node['g:presents']),
    orderBy,
    orderDirection,
  });
  if (!events.length) return null;
  const items = Object.fromEntries(LANGUAGES.map(l => [l, []]));
  for (const ev of events) {
    const langs = asArray(ev.lang);
    if (!langs.length) langs.push('en');
    const dateVal = orderBy ? (ev[orderBy] || '') : '';
    const displayName = ev.city || ev.datum || '';
    const title = dateVal && displayName ? `${dateVal} — ${displayName}` : displayName || dateVal;
    const slug = itemSlug(displayName, ev.event || '');
    for (const l of LANGUAGES) {
      if (langs.includes(l)) items[l].push({ slug, title, date: dateVal });
    }
  }
  return items;
}

export default function () {
  return getFeeds().map(feed => {
    const placeId = feed['g:in-place']?.['@id'];
    const place = placeId ? nodeById(placeId) : null;
    if (!place) return null;

    const placeName = placeId.replace('g:', '');
    const feedSlug = feed['@id'].replace(`g:${placeName}-`, '');

    const labelMap = getLangMap(feed['rdfs:label']);
    const langs = LANGUAGES.filter(l => labelMap[l]);

    const adjacent = getAdjacent(placeId).map(adj => ({
      slug: placeSlug(adj),
      label: getText(adj['rdfs:label']),
    }));

    const page = {
      slug: feedSlug,
      langs: langs.length ? langs : [DEFAULT_LANG],
      mainLang: (langs.length ? langs : [DEFAULT_LANG])[0],
      label: getText(feed['rdfs:label']),
      description: getText(feed['g:description']),
      place: {
        slug: placeSlug(place),
        image: place['g:image'] || `${placeName}.jpg`,
        label: getText(place['rdfs:label']),
        adjacent,
      },
    };

    // TTL-defined entries
    if (feed['g:entry']) {
      page.entries = buildEntries(feed);
    }

    // Quarry-backed items
    if (feed['g:category']) {
      page.category = feed['g:category'];
      const items = buildFeedItems(feed);
      if (items) page.items = items;
    }

    return page;
  }).filter(Boolean);
}
