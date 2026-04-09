/**
 * Place view models from CSVS + fountain token matching (ADR-0009, ADR-0024).
 *
 * Fountain files are the single source for all prose, labels, and order.
 * CSVS provides only: slug, url, in_place, category, status.
 *
 * Token mapping:
 *   section            -> slug marker (matches CSVS item)
 *   action (1st)       -> display label (h2)
 *   action (2nd+)      -> description text
 *   character block    -> for items: entries (parenthetical=slug, dialogue=label)
 *                         for offers (category=offer): CTA (parenthetical=label, dialogue=price)
 *
 * Place convention (ADR-0024):
 *   first action before any section = place label (h1)
 *   remaining actions before first section = place description
 */
import { existsSync } from 'fs';
import { join } from 'path';
import {
  json, arr, first,
  parseFountainTokens, groupBySection,
  placeLabels, placeImage, proseDir,
} from './resolve.js';

/* ── Extract structured data from section tokens ── */

function extractActions(tokens) {
  return tokens.filter(t => t.type === 'action').map(t => t.text);
}

/** For offers: first parenthetical = CTA label, first dialogue = price */
function extractOfferBlock(tokens) {
  let cta = '', price = '';
  for (const t of tokens) {
    if (t.type === 'parenthetical' && !cta) cta = t.text.replace(/[()]/g, '');
    else if (t.type === 'dialogue' && !price) price = t.text;
  }
  return { cta, price };
}

/** For items: each dialogue block is an entry. parenthetical=slug, dialogue=display text */
function extractEntries(tokens, itemLookup) {
  const entries = [];
  let currentSlug = null;
  for (const t of tokens) {
    if (t.type === 'parenthetical') {
      currentSlug = t.text.replace(/[()]/g, '');
    } else if (t.type === 'dialogue' && currentSlug) {
      const item = itemLookup[currentSlug];
      entries.push({
        slug: currentSlug,
        label: t.text,
        url: item ? first(item.url) : null,
      });
      currentSlug = null;
    } else if (t.type === 'dialogue_end') {
      currentSlug = null;
    }
  }
  return entries;
}

/* ── Build place data from en+ru fountain tokens ── */

function buildPlaceData(slug, itemLookup) {
  // Fountain files resolved from slug (ADR-0024)
  const enGroups = groupBySection(parseFountainTokens(`${slug}.en.fountain`));
  const ruGroups = groupBySection(parseFountainTokens(`${slug}.ru.fountain`));

  // Place description: actions before first section, skipping the first (which is the label)
  const enDescActions = enGroups.description.filter(t => t.type === 'action');
  const ruDescActions = ruGroups.description.filter(t => t.type === 'action');
  const description = {
    en: enDescActions.slice(1).map(t => `<p>${t.text}</p>`).join('\n'),
    ru: ruDescActions.slice(1).map(t => `<p>${t.text}</p>`).join('\n'),
  };

  // Collect section slugs in fountain order (en first, then any ru-only)
  const seen = new Set();
  const slugOrder = [];
  for (const s of enGroups.sections) { if (!seen.has(s.slug)) { seen.add(s.slug); slugOrder.push(s.slug); } }
  for (const s of ruGroups.sections) { if (!seen.has(s.slug)) { seen.add(s.slug); slugOrder.push(s.slug); } }

  const landmarks = [];
  const offers = [];

  for (const lmSlug of slugOrder) {
    const enSec = enGroups.sections.find(s => s.slug === lmSlug);
    const ruSec = ruGroups.sections.find(s => s.slug === lmSlug);

    const item = itemLookup[lmSlug];
    if (!item) continue;

    const isOffer = arr(item.category).includes('offer');
    const enActions = enSec ? extractActions(enSec.tokens) : [];
    const ruActions = ruSec ? extractActions(ruSec.tokens) : [];

    if (isOffer) {
      const enOffer = enSec ? extractOfferBlock(enSec.tokens) : { cta: '', price: '' };
      const ruOffer = ruSec ? extractOfferBlock(ruSec.tokens) : { cta: '', price: '' };

      offers.push({
        slug:           lmSlug,
        label:          { en: enActions[0] || '', ru: ruActions[0] || '' },
        scene:          { en: enActions.slice(1).join(' '), ru: ruActions.slice(1).join(' ') },
        actionLabel:    { en: enOffer.cta || 'Learn more', ru: ruOffer.cta || '' },
        actionUrl:      first(item.url) || null,
        hasLandingPage: existsSync(join(proseDir, `${lmSlug}.html`)),
        price:          { en: enOffer.price, ru: ruOffer.price },
      });
      continue;
    }

    // Entries from dialogue blocks (parenthetical=slug -> URL, dialogue=display text)
    const enEntries = enSec ? extractEntries(enSec.tokens, itemLookup) : [];
    const ruEntries = ruSec ? extractEntries(ruSec.tokens, itemLookup) : [];

    // Merge en/ru entries by slug
    const entries = enEntries.map(e => {
      const ru = ruEntries.find(r => r.slug === e.slug);
      return { slug: e.slug, label: { en: e.label, ru: ru?.label || e.label }, url: e.url };
    });

    landmarks.push({
      slug: lmSlug,
      type:        'Item',
      status:      first(item.status) || 'live',
      label:       { en: enActions[0] || '', ru: ruActions[0] || '' },
      description: { en: enActions.slice(1).join(' '), ru: ruActions.slice(1).join(' ') },
      url:         first(item.url) || null,
      category:    first(item.category) || null,
      entries,
    });
  }

  return { description, landmarks, offers };
}

/* ── Main export ── */

export default function () {
  const places = json('raw_places.json');
  const items  = json('raw_items.json');

  // Item lookup by slug
  const itemLookup = {};
  for (const it of items) itemLookup[it.item] = it;

  return places.map(p => {
    const slug = p.place;
    const label = placeLabels(slug);
    const { description, landmarks, offers } = buildPlaceData(slug, itemLookup);

    return {
      slug,
      label,
      description,
      image:       placeImage(slug),
      langs:       ['en', 'ru'],
      adjacent:    arr(p.adjacent).map(a => ({ slug: a, label: placeLabels(a) })),
      landmarks,
      offers,
    };
  });
}
