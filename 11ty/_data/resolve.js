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

const PROSE_EXTS = ['.fountain', '.md', '.html'];

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

/** Check if any prose file exists for slug in any lang. */
export function hasProse(slug) {
  return ['en', 'ru'].some(lang => findProseFile(slug, lang) !== null);
}

/** Read and render a prose file to HTML. */
export function renderProse(filename) {
  const src = readFileSync(join(proseDir, filename), 'utf8');
  if (filename.endsWith('.fountain'))
    return `<div class="fountain-scene">${fountain.parse(src).html.script}</div>`;
  if (filename.endsWith('.html')) return src;
  return md.render(src);
}

/* ── fountain token parsing ── */

/** Parse fountain tokens from a file in prose/. */
export function parseFountainTokens(filename) {
  try {
    const src = readFileSync(join(proseDir, filename), 'utf8');
    return fountain.parse(src, true).tokens.filter(t => t.type !== 'spaces');
  } catch { return []; }
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

/** Bilingual place labels { en, ru } from fountain. */
export function placeLabels(slug) {
  return {
    en: placeLabelFromFountain(slug, 'en'),
    ru: placeLabelFromFountain(slug, 'ru'),
  };
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
    for (const lang of ['en', 'ru']) {
      const groups = groupBySection(parseFountainTokens(`${p.place}.${lang}.fountain`));
      for (const sec of groups.sections) {
        if (!labels[sec.slug]) labels[sec.slug] = { en: '', ru: '' };
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
  for (const lang of ['en', 'ru', 'zh']) {
    const d = datumFromFountainLang(slug, lang);
    if (d) return d;
  }
  return null;
}
