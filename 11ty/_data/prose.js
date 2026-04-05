import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import markdownIt from 'markdown-it';
import { getText, getLangMap, LANGUAGES } from './lib.js';
import { rawGraph, nodeById, getAdjacent, placeSlug } from './graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = markdownIt({ html: true });

// resolve prose paths relative to graph/ (where index.ttl lives)
const graphDir = join(__dirname, '..', '..', 'graph');

/** Slugify a string */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Read a prose file and render to HTML (markdown or raw HTML) */
function renderProse(prosePath) {
  const resolved = join(graphDir, prosePath);
  const source = readFileSync(resolved, 'utf8');
  if (prosePath.endsWith('.html')) return source;
  return md.render(source);
}

export default function () {
  const graph = rawGraph();

  const pages = [];

  for (const node of graph) {
    const placeId = node['g:in-place']?.['@id'];
    const place = nodeById(placeId);
    if (!place) continue;
    const slug_ = placeSlug(place);
    const image = place['g:image'] || `${placeId.replace('g:', '')}.jpg`;

    const adjacent = getAdjacent(placeId).map(adj => ({
      slug: placeSlug(adj),
      label: getText(adj['rdfs:label']),
    }));

    const placeData = {
      slug: slug_,
      image,
      label: getText(place['rdfs:label']),
      adjacent,
    };

    // Standalone Items with g:prose (Offers handled by offers.js)
    if (node['@type'] === 'g:Item' && node['g:prose']) {
      const prosePaths = getLangMap(node['g:prose']);
      const name = placeId.replace('g:', '');
      const nodeSlug = node['@id'].replace(`g:${name}-`, '');
      const label = getText(node['rdfs:label']);
      const langs = LANGUAGES.filter(l => prosePaths[l]);

      if (langs.length) {
        const content = {};
        for (const lang of langs) content[lang] = renderProse(prosePaths[lang]);

        pages.push({
          slug: nodeSlug,
          langs,
          mainLang: langs[0],
          type: 'item',
          content,
          label,
          description: getText(node['g:description']),
          place: placeData,
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
        const prosePaths = getLangMap(entry['g:prose']);
        const entryLabel = getText(entry['rdfs:label']);
        const entrySlug = slugify(entryLabel.en || entryLabel.ru);
        const date = entry['g:date'] || '';
        const langs = LANGUAGES.filter(l => prosePaths[l]);

        if (langs.length) {
          const content = {};
          for (const lang of langs) content[lang] = renderProse(prosePaths[lang]);

          pages.push({
            slug: entrySlug,
            langs,
            mainLang: langs[0],
            type: 'entry',
            content,
            label: entryLabel,
            date,
            place: placeData,
            contextLabel: getText(node['rdfs:label']),
          });
        }
      }
    }
  }

  return pages;
}
