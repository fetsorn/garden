/**
 * Slug-based file resolution (ADR-0024).
 *
 * All prose is addressed by slug:
 *   {slug}.{lang}.fountain | .md | .html
 * Place images: {slug}.jpg
 * Place labels: first action token in fountain before any section.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fountainPkg from 'fountain-js';
import markdownIt from 'markdown-it';

const { Fountain } = fountainPkg;
const fountain = new Fountain();
const md = markdownIt({ html: true });
const __dirname = dirname(fileURLToPath(import.meta.url));
export const proseDir = join(__dirname, '..', '..', 'prose');

/** Available languages — single source of truth for build and templates. */
export const LANGS = ['en', 'ru', 'zh'];

// .html files are full documents — passthrough only, not embedded in templates.
const PROSE_EXTS = ['.fountain', '.md'];

/* ── helpers ── */

export function json(name) {
  try { return JSON.parse(readFileSync(join(__dirname, name), 'utf8')); }
  catch { return []; }
}
export function arr(v) { return !v ? [] : Array.isArray(v) ? v : [v]; }
export function first(v) { return Array.isArray(v) ? v[0] : v; }

/* ── prose file resolution ── */

/** Find prose file for slug + lang. Returns filename or null. */
export function findProseFile(slug, lang) {
  for (const ext of PROSE_EXTS) {
    const name = `${slug}.${lang}${ext}`;
    if (existsSync(join(proseDir, name))) return name;
  }
  return null;
}

/** Find standalone HTML file for slug (no lang infix). Returns filename or null. */
export function findHtmlPage(slug) {
  const name = `${slug}.html`;
  return existsSync(join(proseDir, name)) ? name : null;
}

/** Check if any prose file exists for slug in any lang (or standalone HTML). */
export function hasProse(slug) {
  return LANGS.some(lang => findProseFile(slug, lang) !== null) || findHtmlPage(slug) !== null;
}

/** Read and render a prose file to HTML. */
export function renderProse(filename) {
  const src = readFileSync(join(proseDir, filename), 'utf8');
  if (filename.endsWith('.fountain'))
    return `<div class="fountain-scene">${fountain.parse(src).html.script}</div>`;
  return md.render(src);
}

/* ── fountain token parsing ── */

/** Parse fountain tokens from a file in prose/. */
export function parseFountainTokens(filename) {
  const path = join(proseDir, filename);
  if (!existsSync(path)) return [];
  try {
    const src = readFileSync(path, 'utf8');
    return fountain.parse(src, true).tokens.filter(t => t.type !== 'spaces');
  } catch (e) {
    console.warn(`⚠ fountain parse error: ${filename}: ${e.message}`);
    return [];
  }
}

/** Group tokens by section. Returns { description: Token[], sections: {slug, tokens}[] } */
export function groupBySection(tokens) {
  const description = [];
  const sections = [];
  let current = null;
  for (const t of tokens) {
    if (t.type === 'section') {
      current = { slug: t.text, tokens: [] };
      sections.push(current);
    } else if (current) {
      current.tokens.push(t);
    } else {
      description.push(t);
    }
  }
  return { description, sections };
}

/* ── place metadata from fountain ── */

/**
 * Place label from fountain (ADR-0024 convention):
 * first action token before any section = label.
 */
export function placeLabelFromFountain(slug, lang) {
  const tokens = parseFountainTokens(`${slug}.${lang}.fountain`);
  for (const t of tokens) {
    if (t.type === 'section') break;
    if (t.type === 'action') return t.text;
  }
  return slug;
}

/** Place labels keyed by LANGS from fountain. Omits langs that fall back to slug. */
export function placeLabels(slug) {
  const labels = {};
  for (const lang of LANGS) {
    const label = placeLabelFromFountain(slug, lang);
    if (label !== slug) labels[lang] = label;
  }
  // Ensure at least one key — fall back to slug under first lang
  if (!Object.keys(labels).length) labels[LANGS[0]] = slug;
  return labels;
}

const imgDir = join(__dirname, '..', 'theme', 'img');

/** Place image filename — derived from slug. Returns null if file missing. */
export function placeImage(slug) {
  const file = `${slug}.jpg`;
  return existsSync(join(imgDir, file)) ? file : null;
}

/* ── shared data builders (used by items.js, feedPages.js) ── */

/**
 * Landmark labels from place fountain sections.
 * @param {Array} places — raw_places.json entries (each has .place slug)
 * @returns {{ [slug: string]: { en: string, ru: string } }}
 */
export function buildLandmarkLabels(places) {
  const labels = {};
  for (const p of places) {
    for (const lang of LANGS) {
      const groups = groupBySection(parseFountainTokens(`${p.place}.${lang}.fountain`));
      for (const sec of groups.sections) {
        if (!labels[sec.slug]) {
          labels[sec.slug] = {};
          for (const l of LANGS) labels[sec.slug][l] = '';
        }
        const firstAction = sec.tokens.find(t => t.type === 'action');
        if (firstAction) labels[sec.slug][lang] = firstAction.text;
      }
    }
  }
  return labels;
}

/** Read datum (title) from item fountain: first action token before any section. */
export function datumFromFountainLang(slug, lang) {
  const tokens = parseFountainTokens(`${slug}.${lang}.fountain`);
  for (const t of tokens) {
    if (t.type === 'section') break;
    if (t.type === 'action') return t.text;
  }
  return null;
}

/** Datum from first available language. */
export function datumFromFountain(slug) {
  for (const lang of LANGS) {
    const d = datumFromFountainLang(slug, lang);
    if (d) return d;
  }
  return null;
}
