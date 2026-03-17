import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Extract bilingual { en, ru } from JSON-LD value (string, array, or lang-tagged object) */
function getText(val) {
  let result = { en: '', ru: '' };

  if (!val) return result;

  if (typeof val === 'string') {
    result = { en: val, ru: val };
  } else if (Array.isArray(val)) {
    for (const item of val) {
      if (item['@language'] === 'en') result.en = item['@value'];
      if (item['@language'] === 'ru') result.ru = item['@value'];
    }
  } else if (val['@value']) {
    const lang = val['@language'] || 'en';
    if (lang === 'en') result.en = val['@value'];
    if (lang === 'ru') result.ru = val['@value'];
  }

  // fallback: fill empty language from the other
  if (!result.ru) result.ru = result.en;
  if (!result.en) result.en = result.ru;

  return result;
}

/** Build a feed-item slug: lowercase name + 8-char UUID prefix */
function itemSlug(name, uuid) {
  const readable = (name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const prefix = uuid.slice(0, 8);
  return `${readable}-${prefix}`;
}

/** Normalize a value to an array (handles singleton strings from panrec) */
function asArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** Resolve g:presents to a flat set of project IDs (strips "p:" prefix) */
function presentsSet(presents) {
  if (!presents) return null;
  const arr = Array.isArray(presents) ? presents : [presents];
  return new Set(arr.map(p => (p['@id'] || p).replace('p:', '')));
}

export default function () {
  const garden = JSON.parse(readFileSync(join(__dirname, 'garden.json'), 'utf8'));
  const graph = garden['@graph'];

  // quarry data keyed by category — may not exist yet
  let quarry = {};
  try {
    quarry = JSON.parse(readFileSync(join(__dirname, 'quarry.json'), 'utf8'));
  } catch { /* no quarry data yet, feeds will be empty */ }

  // index every node by @id
  const byId = {};
  for (const node of graph) {
    if (node['@id']) byId[node['@id']] = node;
  }

  // collect landmarks (Feed / Item / Door) grouped by room @id
  // preserving @graph order
  const landmarksByRoom = {};
  for (const node of graph) {
    const type = node['@type'];
    if (!type || !['g:Feed', 'g:Item', 'g:Door'].includes(type)) continue;
    const roomId = node['g:in-room']?.['@id'];
    if (!roomId) continue;
    if (!landmarksByRoom[roomId]) landmarksByRoom[roomId] = [];
    landmarksByRoom[roomId].push(node);
  }

  const rooms = graph.filter(n => n['@type'] === 'g:Room');

  return rooms.map(room => {
    const id = room['@id'];
    const slug = id.replace('g:', '');
    const label = getText(room['rdfs:label']);
    const description = getText(room['g:description']);
    const isDefault = room['g:default'] === true;

    const allLandmarks = landmarksByRoom[id] || [];

    // non-Door landmarks in @graph order
    const landmarks = allLandmarks
      .filter(n => n['@type'] !== 'g:Door')
      .map(node => {
        const lmId = node['@id'];
        const lmSlug = lmId.replace(`g:${slug}-`, '');
        const type = node['@type'].replace('g:', ''); // "Feed" or "Item"

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

          // entry-based feed (links defined in TTL, not quarry)
          if (node['g:entry']) {
            const raw = Array.isArray(node['g:entry'])
              ? node['g:entry']
              : [node['g:entry']];
            lm.entries = raw.map(e => ({
              label: getText(e['rdfs:label']),
              url: e['g:url'],
            }));
          }

          // quarry-backed feed: attach items from quarry.json
          if (lm.category && quarry[lm.category]) {
            let events = quarry[lm.category];

            // filter by project if the feed has g:presents
            const projects = presentsSet(node['g:presents']);
            if (projects) {
              events = events.filter(e => e.project && projects.has(e.project));
            }

            // sort by orderBy field
            const field = lm.orderBy;
            if (field) {
              events = [...events].sort((a, b) => {
                const va = a[field] || '';
                const vb = b[field] || '';
                return lm.orderDirection === 'descending'
                  ? vb.localeCompare(va)
                  : va.localeCompare(vb);
              });
            }

            // build per-language item arrays
            lm.items = { en: [], ru: [] };
            for (const ev of events) {
              const langs = asArray(ev.lang);
              if (!langs.length) langs.push('en');
              const dateVal = field ? (ev[field] || '') : '';
              // display name: city for legend, datum for others
              const displayName = ev.city || ev.datum || '';
              const title = dateVal && displayName
                ? `${dateVal} — ${displayName}`
                : displayName || dateVal;
              const slug = itemSlug(displayName, ev.event || '');

              for (const l of ['en', 'ru']) {
                if (langs.includes(l)) {
                  lm.items[l].push({ slug, title, date: dateVal });
                }
              }
            }
          }
        }

        if (type === 'Item') {
          lm.url = node['g:url'] || null;
          lm.presents = node['g:presents']?.['@id'] || null;
        }

        return lm;
      });

    // Doors → target room info for nav
    const doors = allLandmarks
      .filter(n => n['@type'] === 'g:Door')
      .map(node => {
        const targetId = node['g:target']?.['@id'];
        const targetRoom = byId[targetId];
        const targetSlug = targetId?.replace('g:', '') || '';
        return {
          targetSlug,
          label: getText(targetRoom?.['rdfs:label']),
        };
      });

    return { id, slug, label, description, isDefault, landmarks, doors };
  });
}
