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
  json, arr, first, LANGS,
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
  // Fountain files resolved from slug, one per lang (ADR-0024)
  const groupsByLang = {};
  for (const lang of LANGS) {
    groupsByLang[lang] = groupBySection(parseFountainTokens(`${slug}.${lang}.fountain`));
  }

  // Place description: actions before first section, skipping the first (which is the label)
  const description = {};
  for (const lang of LANGS) {
    const descActions = groupsByLang[lang].description.filter(t => t.type === 'action');
    description[lang] = descActions.slice(1).map(t => `<p>${t.text}</p>`).join('\n');
  }

  // Collect section slugs in fountain order (first lang wins, then lang-only additions)
  const seen = new Set();
  const slugOrder = [];
  for (const lang of LANGS) {
    for (const s of groupsByLang[lang].sections) {
      if (!seen.has(s.slug)) { seen.add(s.slug); slugOrder.push(s.slug); }
    }
  }

  const landmarks = [];
  const offers = [];

  for (const lmSlug of slugOrder) {
    const secByLang = {};
    for (const lang of LANGS) {
      secByLang[lang] = groupsByLang[lang].sections.find(s => s.slug === lmSlug) || null;
    }

    const item = itemLookup[lmSlug];
    if (!item) continue;

    const isOffer = arr(item.category).includes('offer');
    const actionsByLang = {};
    for (const lang of LANGS) {
      actionsByLang[lang] = secByLang[lang] ? extractActions(secByLang[lang].tokens) : [];
    }

    if (isOffer) {
      const offerByLang = {};
      for (const lang of LANGS) {
        offerByLang[lang] = secByLang[lang] ? extractOfferBlock(secByLang[lang].tokens) : { cta: '', price: '' };
      }

      const label = {}, scene = {}, actionLabel = {}, price = {};
      for (const lang of LANGS) {
        label[lang] = actionsByLang[lang][0] || '';
        scene[lang] = actionsByLang[lang].slice(1).join(' ');
        actionLabel[lang] = offerByLang[lang].cta || (lang === 'en' ? 'Learn more' : '');
        price[lang] = offerByLang[lang].price;
      }

      offers.push({
        slug: lmSlug, label, scene, actionLabel,
        actionUrl:      first(item.url) || null,
        hasLandingPage: existsSync(join(proseDir, `${lmSlug}.html`)),
        price,
      });
      continue;
    }

    // Entries from dialogue blocks — merge across all langs by slug
    const entriesByLang = {};
    for (const lang of LANGS) {
      entriesByLang[lang] = secByLang[lang] ? extractEntries(secByLang[lang].tokens, itemLookup) : [];
    }

    const seenEntrySlugs = new Set();
    const entryOrder = [];
    for (const lang of LANGS) {
      for (const e of entriesByLang[lang]) {
        if (!seenEntrySlugs.has(e.slug)) { seenEntrySlugs.add(e.slug); entryOrder.push(e.slug); }
      }
    }

    const entries = entryOrder.map(eSlug => {
      const label = {};
      let url = null;
      for (const lang of LANGS) {
        const match = entriesByLang[lang].find(e => e.slug === eSlug);
        label[lang] = match?.label || '';
        if (match?.url) url = match.url;
      }
      // Fill empty labels with first available
      const fallback = LANGS.map(l => label[l]).find(l => l) || eSlug;
      for (const lang of LANGS) { if (!label[lang]) label[lang] = fallback; }
      return { slug: eSlug, label, url };
    });

    const label = {}, desc = {};
    for (const lang of LANGS) {
      label[lang] = actionsByLang[lang][0] || '';
      desc[lang] = actionsByLang[lang].slice(1).join(' ');
    }

    landmarks.push({
      slug: lmSlug,
      type:        'Item',
      status:      first(item.status) || 'live',
      label,
      description: desc,
      url:         first(item.url) || null,
      category:    first(item.category) || null,
      entries,
    });
  }

  const langs = LANGS.filter(l => {
    const g = groupsByLang[l];
    return g.description.length > 0 || g.sections.length > 0;
  });

  return { description, landmarks, offers, langs };
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
    const { description, landmarks, offers, langs } = buildPlaceData(slug, itemLookup);

    return {
      slug,
      label,
      description,
      image:       placeImage(slug),
      langs,
      adjacent:    arr(p.adjacent).map(a => ({ slug: a, label: placeLabels(a) })),
      landmarks,
      offers,
    };
  });
}
