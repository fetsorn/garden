/**
 * Standalone HTML pages in prose/ (ADR-0024).
 *
 * Every .html file in prose/ is a full document, passed through as-is
 * to offers/{slug}.html with no template wrapping.
 *
 * HTML files that match an item slug are handled by items.js instead
 * (output to items/{slug}.html), so they are excluded here.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { json, proseDir } from './resolve.js';

export default function () {
  const itemSlugs = new Set(json('raw_items.json').map(it => it.item));

  return readdirSync(proseDir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({ slug: f.replace('.html', ''), f }))
    .filter(({ slug }) => !itemSlugs.has(slug))
    .map(({ slug, f }) => ({
      slug,
      content: readFileSync(join(proseDir, f), 'utf8'),
    }));
}
