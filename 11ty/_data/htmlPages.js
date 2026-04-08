/**
 * Standalone HTML pages in prose/ (ADR-0024).
 *
 * Any .html file without a .{lang}. infix is a standalone landing page.
 * These are output as-is to offers/{slug}.html, no template wrapping.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { proseDir } from './resolve.js';

export default function () {
  return readdirSync(proseDir)
    .filter(f => f.endsWith('.html') && !/\.(en|ru|zh)\.html$/.test(f))
    .map(f => ({
      slug: f.replace('.html', ''),
      content: readFileSync(join(proseDir, f), 'utf8'),
    }));
}
