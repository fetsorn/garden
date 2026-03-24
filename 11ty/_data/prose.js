import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import markdownIt from 'markdown-it';
import { getText, getLangMap, LANGUAGES } from './lib.js';
import { rawGraph, nodeById, getDoors } from './graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = markdownIt();

// resolve prose paths relative to graph/ (where index.ttl lives)
const graphDir = join(__dirname, '..', '..', 'graph');

/** Slugify a string */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Read a markdown file and render to HTML */
function renderProse(prosePath) {
  const resolved = join(graphDir, prosePath);
  const source = readFileSync(resolved, 'utf8');
  return md.render(source);
}

export default function () {
  const graph = rawGraph();

  const pages = [];

  for (const node of graph) {
    const roomId = node['g:in-room']?.['@id'];
    const room = nodeById(roomId);
    if (!room) continue;
    const roomSlug = roomId.replace('g:', '');

    const roomData = {
      slug: roomSlug,
      label: getText(room['rdfs:label']),
      doors: getDoors(roomId),
    };

    // Standalone Items with g:prose
    if (node['@type'] === 'g:Item' && node['g:prose']) {
      const prosePaths = getLangMap(node['g:prose']);
      const nodeSlug = node['@id'].replace(`g:${roomSlug}-`, '');
      const label = getText(node['rdfs:label']);
      const langs = LANGUAGES.filter(l => prosePaths[l]);

      for (const lang of langs) {
        const content = renderProse(prosePaths[lang]);
        const otherLang = langs.find(l => l !== lang) || null;
        pages.push({
          slug: nodeSlug,
          lang,
          type: 'item',
          content,
          label,
          description: getText(node['g:description']),
          room: roomData,
          contextLabel: label,
          hasOtherLang: !!otherLang,
          otherLang,
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
        const prosePaths = getLangMap(entry['g:prose']);
        const entryLabel = getText(entry['rdfs:label']);
        const entrySlug = slugify(entryLabel.en || entryLabel.ru);
        const date = entry['g:date'] || '';
        const langs = LANGUAGES.filter(l => prosePaths[l]);

        for (const lang of langs) {
          const content = renderProse(prosePaths[lang]);
          const otherLang = langs.find(l => l !== lang) || null;
          pages.push({
            slug: entrySlug,
            lang,
            type: 'entry',
            content,
            label: entryLabel,
            date,
            room: roomData,
            contextLabel: getText(node['rdfs:label']),
            hasOtherLang: !!otherLang,
            otherLang,
          });
        }
      }
    }
  }

  return pages;
}
