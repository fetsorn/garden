import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import markdownIt from 'markdown-it';

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = markdownIt();

// resolve prose paths relative to graph/ (where index.ttl lives)
const graphDir = join(__dirname, '..', '..', 'graph');

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

/** Slugify a string */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Extract per-language paths from a g:prose value (string, object, or array) */
function getProsePaths(val) {
  let result = { en: null, ru: null };
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
  // no cross-language fallback — missing means no page for that lang
  return result;
}

/** Read a markdown file and render to HTML */
function renderProse(prosePath) {
  const resolved = join(graphDir, prosePath);
  const source = readFileSync(resolved, 'utf8');
  return md.render(source);
}

export default function () {
  const garden = JSON.parse(readFileSync(join(__dirname, 'garden.json'), 'utf8'));
  const graph = garden['@graph'];

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

  const pages = [];

  for (const node of graph) {
    const roomId = node['g:in-room']?.['@id'];
    const room = roomById[roomId];
    if (!room) continue;
    const roomSlug = roomId.replace('g:', '');

    const roomData = {
      slug: roomSlug,
      label: getText(room['rdfs:label']),
      doors: doorsByRoom[roomId] || [],
    };

    // Standalone Items with g:prose
    if (node['@type'] === 'g:Item' && node['g:prose']) {
      const prosePaths = getProsePaths(node['g:prose']);
      const nodeSlug = node['@id'].replace(`g:${roomSlug}-`, '');
      const label = getText(node['rdfs:label']);

      for (const lang of ['en', 'ru']) {
        if (!prosePaths[lang]) continue;
        const content = renderProse(prosePaths[lang]);
        pages.push({
          slug: nodeSlug,
          lang,
          type: 'item',
          content,
          label,
          description: getText(node['g:description']),
          room: roomData,
          contextLabel: label,
        });
      }
    }

    // Feed entries with g:prose
    if (node['@type'] === 'g:Feed') {
      const raw = node['g:entry']
        ? (Array.isArray(node['g:entry']) ? node['g:entry'] : [node['g:entry']])
        : [];

      for (const entry of raw) {
        if (!entry['g:prose']) continue;
        const prosePaths = getProsePaths(entry['g:prose']);
        const entryLabel = getText(entry['rdfs:label']);
        const entrySlug = slugify(entryLabel.en || entryLabel.ru);
        const date = entry['g:date'] || '';

        for (const lang of ['en', 'ru']) {
          if (!prosePaths[lang]) continue;
          const content = renderProse(prosePaths[lang]);
          pages.push({
            slug: entrySlug,
            lang,
            type: 'entry',
            content,
            label: entryLabel,
            date,
            room: roomData,
            contextLabel: getText(node['rdfs:label']),
          });
        }
      }
    }
  }

  return pages;
}
