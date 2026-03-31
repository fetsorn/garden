/**
 * Layer 3 — Room view models
 *
 * Composes graph (structure) + quarry (content) into the shape
 * that room.njk templates expect.
 */

import { getText, getLangMap, itemSlug, asArray, presentsSet, LANGUAGES, DEFAULT_LANG } from './lib.js';
import { getRooms, getLandmarks, getDoors, roomSlug, worldSlug, nodeById, getOffersByRoom, getOffersByWorld } from './graph.js';
import { getEvents } from './quarry.js';

/** Build the entries array for a TTL-defined entry-based feed. */
function buildEntries(node) {
  const raw = Array.isArray(node['g:entry']) ? node['g:entry'] : [node['g:entry']];

  return raw.map(e => {
    const label = getText(e['rdfs:label']);
    const url = e['g:url'] || null;
    const proseVal = e['g:prose'] || null;
    const date = e['g:date'] || '';

    let proseSlug = null;
    const prosePaths = getLangMap(proseVal);
    const hasProse = LANGUAGES.some(l => prosePaths[l]);

    if (hasProse) {
      const text = label.en || label.ru;
      proseSlug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    return {
      label,
      url,
      prose: hasProse,
      proseLangs: Object.fromEntries(LANGUAGES.map(l => [l, !!prosePaths[l]])),
      slug: proseSlug,
      date,
    };
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
    const title = dateVal && displayName
      ? `${dateVal} — ${displayName}`
      : displayName || dateVal;
    const slug = itemSlug(displayName, ev.event || '');

    for (const l of LANGUAGES) {
      if (langs.includes(l)) {
        items[l].push({ slug, title, date: dateVal });
      }
    }
  }

  return items;
}

/** Shape a single landmark node into a template-ready object. */
function buildLandmark(node, roomName) {
  const lmId = node['@id'];
  const lmSlug = lmId.replace(`g:${roomName}-`, '');
  const type = node['@type'].replace('g:', '');

  const lm = {
    id: lmId,
    slug: lmSlug,
    type,
    status: node['g:status'] || 'live',
    label: getText(node['rdfs:label']),
    description: getText(node['g:description']),
  };

  if (type === 'Feed') {
    lm.category = node['g:category'] || null;
    lm.orderBy = node['g:order-by'] || null;
    lm.orderDirection = node['g:order-direction'] || 'ascending';

    if (node['g:entry']) {
      lm.entries = buildEntries(node);
    }

    if (lm.category) {
      const items = buildFeedItems(node);
      if (items) lm.items = items;
    }
  }

  if (type === 'Item') {
    lm.url = node['g:url'] || null;
    lm.presents = node['g:presents']?.['@id'] || null;
  }

  return lm;
}

export default function () {
  return getRooms().map(room => {
    const id = room['@id'];
    const name = id.replace('g:', '');
    const slug = roomSlug(room);
    const image = room['g:image'] || `${name}.jpg`;
    const labelMap = getLangMap(room['rdfs:label']);
    const langs = LANGUAGES.filter(l => labelMap[l]);

    // resolve world
    const worldId = room['g:in-world']?.['@id'] || null;
    const worldNode = worldId ? nodeById(worldId) : null;
    const wSlug = worldNode ? worldSlug(worldNode) : 'unknown';

    // room-specific offers
    const roomOffers = getOffersByRoom(id).map(o => ({
      label: getText(o['rdfs:label']),
      scene: getText(o['g:scene']),
      actionLabel: getText(o['g:action-label']),
      actionUrl: o['g:action-url'] || null,
      price: getText(o['g:price']),
    }));

    // world patron (first world offer, always order 1)
    const worldOffers = worldId ? getOffersByWorld(worldId) : [];
    const patron = worldOffers.length ? worldOffers[0] : null;
    const worldPatron = patron ? {
      label: getText(patron['rdfs:label']),
      scene: getText(patron['g:scene']),
      actionLabel: getText(patron['g:action-label']),
      actionUrl: patron['g:action-url'] || null,
      price: getText(patron['g:price']),
    } : null;

    return {
      id,
      slug,
      image,
      world: wSlug,
      worldId,
      worldLabel: worldNode ? getText(worldNode['rdfs:label']) : {},
      langs: langs.length ? langs : [DEFAULT_LANG],
      mainLang: (langs.length ? langs : [DEFAULT_LANG])[0],
      label: getText(room['rdfs:label']),
      description: getText(room['g:description']),
      isDefault: room['g:default'] === true,
      landmarks: getLandmarks(id).map(n => buildLandmark(n, name)),
      doors: getDoors(id),
      offers: roomOffers,
      worldPatron,
    };
  });
}
