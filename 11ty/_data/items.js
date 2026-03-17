import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Extract bilingual { en, ru } from JSON-LD value */
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
  if (!result.ru) result.ru = result.en;
  if (!result.en) result.en = result.ru;
  return result;
}

/** Build slug: lowercase name + 8-char UUID prefix */
function itemSlug(name, uuid) {
  const readable = (name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const prefix = uuid.slice(0, 8);
  return `${readable}-${prefix}`;
}

/** Compute display title per category */
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

/** Extract first audio file reference */
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

/** Normalize a value to an array (handles singleton strings from panrec) */
function asArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** Resolve g:presents to a set of project IDs */
function presentsSet(presents) {
  if (!presents) return null;
  const arr = Array.isArray(presents) ? presents : [presents];
  return new Set(arr.map(p => (p['@id'] || p).replace('p:', '')));
}

export default function () {
  const garden = JSON.parse(readFileSync(join(__dirname, 'garden.json'), 'utf8'));
  const graph = garden['@graph'];

  let quarry = {};
  try {
    quarry = JSON.parse(readFileSync(join(__dirname, 'quarry.json'), 'utf8'));
  } catch {
    return [];
  }

  // index rooms and doors
  const roomById = {};
  for (const node of graph) {
    if (node['@type'] === 'g:Room') roomById[node['@id']] = node;
  }

  const doorsByRoom = {};
  for (const node of graph) {
    if (node['@type'] !== 'g:Door') continue;
    const roomId = node['g:in-room']?.['@id'];
    if (!roomId) continue;
    if (!doorsByRoom[roomId]) doorsByRoom[roomId] = [];
    const targetId = node['g:target']?.['@id'];
    const targetRoom = roomById[targetId];
    doorsByRoom[roomId].push({
      targetSlug: targetId?.replace('g:', '') || '',
      label: getText(targetRoom?.['rdfs:label']),
    });
  }

  // walk feeds, emit one item per lang × event
  const items = [];

  for (const node of graph) {
    if (node['@type'] !== 'g:Feed') continue;
    const category = node['g:category'];
    if (!category || !quarry[category]) continue;

    const roomId = node['g:in-room']?.['@id'];
    const room = roomById[roomId];
    if (!room) continue;

    const roomSlug = roomId.replace('g:', '');

    // filter by project
    let events = quarry[category];
    const projects = presentsSet(node['g:presents']);
    if (projects) {
      events = events.filter(e => e.project && projects.has(e.project));
    }

    for (const ev of events) {
      const langs = asArray(ev.lang);
      if (!langs.length) langs.push('en');
      const displayName = ev.city || ev.datum || '';
      const slug = itemSlug(displayName, ev.event || '');
      const title = itemTitle(category, ev);
      const audio = audioRef(ev);
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
            doors: doorsByRoom[roomId] || [],
          },
          landmarkLabel: getText(node['rdfs:label']),
          hasOtherLang: langs.length > 1,
          otherLang: langs.length > 1 ? langs.find(l => l !== lang) : null,
        });
      }
    }
  }

  return items;
}
