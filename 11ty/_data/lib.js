/** Supported languages */
export const LANGUAGES = ['en', 'ru', 'zh'];

/** Default language (used when an event has no lang field) */
export const DEFAULT_LANG = 'en';

/**
 * Parse a JSON-LD language-tagged value into a per-language map.
 * Returns null for missing languages (no cross-language fallback).
 */
function parseLangMap(val) {
  const result = {};
  for (const l of LANGUAGES) result[l] = null;

  if (!val) return result;

  if (typeof val === 'string') {
    for (const l of LANGUAGES) result[l] = val;
  } else if (Array.isArray(val)) {
    for (const item of val) {
      const lang = item['@language'];
      if (lang in result) result[lang] = item['@value'];
    }
  } else if (val['@value']) {
    const lang = val['@language'] || DEFAULT_LANG;
    if (lang in result) result[lang] = val['@value'];
  }

  return result;
}

/**
 * Extract per-language values without cross-language fallback.
 * null means "not available in this language".
 */
export function getLangMap(val) {
  return parseLangMap(val);
}

/** Extract bilingual { en, ru } text with cross-language fallback */
export function getText(val) {
  const result = parseLangMap(val);

  // fallback: fill missing language from the first available
  for (const l of LANGUAGES) {
    if (!result[l]) {
      const other = LANGUAGES.find(o => o !== l && result[o]);
      if (other) result[l] = result[other];
    }
  }

  // ensure strings, not nulls
  for (const l of LANGUAGES) {
    if (!result[l]) result[l] = '';
  }

  return result;
}

/** Normalize event languages with fallback to default */
export function eventLangs(ev) {
  const langs = asArray(ev.lang);
  return langs.length ? langs : [DEFAULT_LANG];
}

/** Build a feed-item slug: lowercase name + 8-char UUID prefix */
export function itemSlug(name, uuid) {
  const readable = (name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const prefix = uuid.slice(0, 8);
  return `${readable}-${prefix}`;
}

/** Normalize a value to an array (handles singleton strings from panrec) */
export function asArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** Map file extension to MIME type */
const mimeTypes = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  flac: 'audio/flac',
  opus: 'audio/opus',
  webm: 'audio/webm',
};

export function audioMime(extension) {
  return mimeTypes[extension] || `audio/${extension}`;
}

/** Resolve g:presents to a flat set of project IDs (strips "p:" prefix) */
export function presentsSet(presents) {
  if (!presents) return null;
  const arr = Array.isArray(presents) ? presents : [presents];
  return new Set(arr.map(p => (p['@id'] || p).replace('p:', '')));
}
