---
status: done
decision: decisions/0002-unified-multilingual-pages.md
---

# Implementation plan — unified multilingual pages

Implements [ADR 0002](../decisions/0002-unified-multilingual-pages.md).

Four phases, each independently deployable. Earlier phases deliver
the core architectural change; later phases add polish and SEO.

---

## Phase 1 — Unify items and prose onto single pages

The core change. Items and prose adopt the room pattern: one HTML
file per artifact, all translations inline, CSS `:target` toggle.

### 1.1 `_data/items.js` — emit one object per event (not per lang×event)

Current: iterates `for (const lang of langs)` and pushes one item
per language (lines 72-89).

Change: push one item per event with all languages bundled.

```js
// before
for (const lang of langs) {
  items.push({ slug, lang, category, title, event, audio, room, ... });
}

// after
items.push({
  slug,
  langs,                     // e.g. ['en', 'ru']
  category,
  title,                     // lang-map: { en: '...', ru: '...' }
  event: normEv,
  audio,
  room: { slug: roomSlug, label: getText(room['rdfs:label']), doors },
  landmarkLabel: getText(feed['rdfs:label']),
});
```

`title` becomes a lang-map. `itemTitle()` returns per-language
values. `hasOtherLang` / `otherLang` fields are removed — the
template derives this from `langs`.

### 1.2 `_data/prose.js` — emit one object per prose doc (not per lang×doc)

Current: iterates `for (const lang of langs)` and pushes one page
per language (lines 50-65, 82-96).

Change: push one page with a `content` lang-map and a `langs` array.

```js
// before
for (const lang of langs) {
  pages.push({ slug, lang, content: renderProse(prosePaths[lang]), ... });
}

// after
const content = {};
for (const lang of langs) content[lang] = renderProse(prosePaths[lang]);
pages.push({
  slug,
  langs,                     // e.g. ['en', 'ru']
  content,                   // { en: '<html>...', ru: '<html>...' }
  label: getText(node['rdfs:label']),
  description: getText(node['g:description']),
  room: roomData,
  contextLabel: label,
});
```

### 1.3 `pages/items.njk` — drop lang prefix from permalink

```yaml
# before
permalink: "{{ item.lang }}/{{ item.slug }}.html"

# after
permalink: "{{ item.slug }}.html"
```

### 1.4 `pages/prose.njk` — drop lang prefix from permalink

```yaml
# before
permalink: "{{ doc.lang }}/{{ doc.slug }}.html"

# after
permalink: "{{ doc.slug }}.html"
```

### 1.5 `_includes/item.njk` — adopt room pattern

Replace the current single-language layout with a per-language loop.
The structure mirrors `room.njk`:

```njk
<!DOCTYPE html>
<html lang="en">
<head>
  {% set pageTitle = item.title.en %}
  {% set cssPath = "index.css" %}
  {% include "partials/head.njk" %}
</head>
<body>
  {# anchor targets for each non-default language #}
  {% for lang in item.langs %}
    {% if lang != "en" %}<div id="{{ lang }}"></div>{% endif %}
  {% endfor %}

  {% for lang in item.langs %}
  <div class="lang-{{ lang }}" lang="{{ lang }}">
    <header>
      <img src="img/{{ item.room.slug }}.jpg"
           alt="{{ item.room.label[lang] }}">
    </header>

    {% set navDoors = item.room.doors %}
    {% set navLang = lang %}
    {% set navLangs = item.langs %}
    {% include "partials/navbar.njk" %}

    <p class="item-context">
      {{ item.landmarkLabel[lang] }} · {{ item.room.label[lang] }}
    </p>
    <p class="item-back">
      <a href="{{ item.room.slug }}.html{% if lang != 'en' %}#{{ lang }}{% endif %}">
        {% if lang == "ru" %}← назад{% else %}← back{% endif %}
      </a>
    </p>

    {% if item.category == "legend" %}
      {% include "items/legend.njk" %}
    {% elif item.category == "poem-reading" %}
      {% include "items/poem-reading.njk" %}
    {% else %}
      {% include "items/default.njk" %}
    {% endif %}

    {% include "partials/footer.njk" %}
  </div>
  {% endfor %}

  <script>
    (function() {
      var titles = {{ item.title | dump | safe }};
      var langs = {{ item.langs | dump | safe }};
      function update() {
        var h = location.hash.replace('#','');
        var lang = langs.indexOf(h) >= 0 ? h : langs[0];
        document.title = titles[lang] || titles[langs[0]];
        document.documentElement.lang = lang;
      }
      update();
      window.addEventListener('hashchange', update);
    })();
  </script>
</body>
</html>
```

### 1.6 `_includes/prose.njk` — same transformation

Same pattern as item.njk. The `{{ doc.content[lang] | safe }}`
replaces `{{ doc.content | safe }}`.

### 1.7 Category templates — receive `lang` from loop context

The category includes (`legend.njk`, `poem-reading.njk`,
`default.njk`) currently reference `item.lang`. After unification,
they are included inside a `{% for lang in item.langs %}` loop, so
`lang` is available as a loop variable. References change:

- `item.lang` → `lang`
- `item.title` (string) → `item.title[lang]` (lang-map lookup)
- Bilingual `{% if item.lang == "en" %}` blocks → `{% if lang == "en" %}`

**`items/poem-reading.njk`** — the most affected template. Current
bilingual branch (`{% if item.lang == "en" %}` / `{% else %}`) stays
but keys off `lang` instead of `item.lang`.

**`items/legend.njk`** and **`items/default.njk`** — minimal changes,
just swap `item.title` for `item.title[lang]`.

### 1.8 `_includes/partials/navbar.njk` — single mode

Remove the `navLangMode` branching. All pages use hash-based toggle.
Replace hardcoded EN/RU with a loop over `navLangs`:

```njk
<nav>
  {% for door in navDoors %}
    <a href="{{ door.targetSlug }}.html{% if navLang != 'en' %}#{{ navLang }}{% endif %}">
      {{ door.label[navLang] }}
    </a>
  {% endfor %}
  <span class="lang-toggle">
    {% for l in navLangs %}
      {% if l == navLang %}
        <span class="active">{{ l | upper }}</span>
      {% else %}
        <a href="#{{ l }}">{{ l | upper }}</a>
      {% endif %}
      {% if not loop.last %} / {% endif %}
    {% endfor %}
  </span>
</nav>
```

The caller sets `navLangs` (the artifact's available languages) and
`navLang` (the current iteration language).

### 1.9 `_includes/partials/footer.njk` — drop lang prefix

```njk
{# before #}
<a href="{{ navPrefix }}{{ navLang }}/{{ site.supportUrl }}.html">

{# after #}
<a href="{{ site.supportUrl }}.html{% if navLang != 'en' %}#{{ navLang }}{% endif %}">
```

`navPrefix` is no longer needed anywhere and can be removed from all
template variable sets.

### 1.10 `_includes/room.njk` — update internal links

Room links to items/prose currently use `{{ lang }}/{{ slug }}.html`.
Drop the lang prefix, append hash:

```njk
{# before #}
<a href="{{ lang }}/{{ item.slug }}.html">

{# after #}
<a href="{{ item.slug }}.html{% if lang != 'en' %}#{{ lang }}{% endif %}">
```

Same for entry prose links and feed item links.

### 1.11 `_data/rooms.js` — update `buildFeedItems` and `buildEntries`

`buildFeedItems` currently returns `{ en: [...], ru: [...] }`. After
unification, feed items in the room listing link to flat URLs, so
the per-language arrays still work (used for filtering which items
appear per language). But `proseLangs` in entries is no longer needed
for URL construction — the target page has all languages.

The `proseLangs` field can stay for now (it controls whether an entry
appears in a given language listing in the room). No structural change
needed to rooms.js data shapes.

### 1.12 CSS — generalize language toggle

Current CSS hardcodes en/ru:

```css
.lang-ru { display: none; }
#ru:target ~ .lang-en { display: none; }
#ru:target ~ .lang-ru { display: block; }
```

Generalize to support N languages. For the current en+ru set, add
forward-compatible zh rules:

```css
/* default: only first language visible */
.lang-ru, .lang-zh { display: none; }

/* #ru: show ru, hide others */
#ru:target ~ .lang-en { display: none; }
#ru:target ~ .lang-ru { display: block; }
#ru:target ~ .lang-zh { display: none; }

/* #zh: show zh, hide others */
#zh:target ~ .lang-en { display: none; }
#zh:target ~ .lang-zh { display: block; }
#zh:target ~ .lang-ru { display: none; }
```

If the language set grows beyond 3-4, consider generating these
rules at build time via an 11ty shortcode or a CSS template. For
now, static rules suffice.

### 1.13 `_data/lib.js` — add zh to LANGUAGES (optional)

If the experimental zh content should be supported, add `'zh'` to
the `LANGUAGES` array. Otherwise defer to phase 4.

---

## Phase 2 — UUID permalinks for rooms

Rooms currently use human slugs (`study.html`). Move them to UUIDs
for namespace consistency with items.

### 2.1 TTL — add `g:uuid` to each room

```ttl
g:study
    a g:Room ;
    g:uuid "a1b2c3d4" ;
    ...
```

Use 8-character hex UUIDs (matching the item slug convention from
`itemSlug()` in lib.js).

### 2.2 `_data/graph.js` — expose room UUID

Add a helper or adjust `getRooms()` to surface the UUID field.

### 2.3 `_data/rooms.js` — use UUID for slug

```js
// before
const slug = id.replace('g:', '');

// after
const uuid = room['g:uuid'] || id.replace('g:', '');
return { id, slug: uuid, ... };
```

### 2.4 `pages/rooms.njk` — permalink uses UUID

No change to the template itself — it already uses `{{ room.slug }}`.
The slug value just changes from `study` to `a1b2c3d4`.

### 2.5 Doors — resolve target to UUID

`getDoors()` in graph.js returns `targetSlug` from the `@id`. After
this change, it should resolve the target room's UUID:

```js
return {
  targetSlug: targetRoom?.['g:uuid'] || targetId?.replace('g:', '') || '',
  label: getText(targetRoom?.['rdfs:label']),
};
```

### 2.6 `pages/index.njk` — redirect to UUID

The index page redirects to the default room. It currently uses
`site.defaultRoom` (a slug string). After the change, `site.js`
computes the default room's UUID instead.

### 2.7 Image filenames

Room header images are currently `img/study.jpg`. Either:
- Rename images to match UUIDs, or
- Add a `g:image` property to TTL and use that in templates

Recommend the latter — decouples image naming from routing.

---

## Phase 3 — JSON-LD structured data for SEO

Add a `<script type="application/ld+json">` block to the `<head>`
of every page.

### 3.1 `_includes/partials/head.njk` — add JSON-LD

Generate a JSON-LD block declaring the page's languages:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{{ pageTitle }}",
  "inLanguage": {{ pageLangs | dump | safe }},
  "author": { "@type": "Person", "name": "{{ site.author }}" },
  "hasPart": [
    {% for lang in pageLangs %}
    {
      "@type": "WebPageElement",
      "inLanguage": "{{ lang }}",
      "cssSelector": ".lang-{{ lang }}"
    }{% if not loop.last %},{% endif %}
    {% endfor %}
  ]
}
</script>
```

Each layout sets `pageLangs` before including head.njk.

### 3.2 `<html lang>` strategy

Set `<html lang="{{ pageLangs[0] }}">` (predominant language).
The inline script updates it on hashchange. This satisfies
WCAG 3.1.1 (page-level language declaration).

### 3.3 `<meta http-equiv="Content-Language">`

Add to head.njk:

```html
<meta http-equiv="Content-Language" content="{{ pageLangs | join(', ') }}">
```

This is the static-hosting equivalent of the `Content-Language`
HTTP header.

---

## Phase 4 — Generalize language switcher for N languages

### 4.1 `_data/lib.js` — add zh (and future languages)

```js
export const LANGUAGES = ['en', 'ru', 'zh'];
```

### 4.2 CSS — build-time generation (if needed)

If 4+ languages are supported, generate the `:target` CSS rules
via an 11ty template or shortcode rather than maintaining them
by hand. A `pages/lang-toggle.njk` could output a CSS file:

```njk
---
permalink: "lang-toggle.css"
---
{% for lang in languages %}
{% if lang != defaultLang %}
.lang-{{ lang }} { display: none; }
#{{ lang }}:target ~ .lang-{{ defaultLang }} { display: none; }
#{{ lang }}:target ~ .lang-{{ lang }} { display: block; }
  {% for other in languages %}
    {% if other != lang and other != defaultLang %}
#{{ lang }}:target ~ .lang-{{ other }} { display: none; }
    {% endif %}
  {% endfor %}
{% endif %}
{% endfor %}
```

### 4.3 Navbar dropdown

For 3+ languages, the inline `EN / RU / ZH` list may become
unwieldy. Consider a `<details>/<summary>` dropdown:

```njk
<details class="lang-toggle">
  <summary>{{ navLang | upper }}</summary>
  <ul>
    {% for l in navLangs %}
    {% if l != navLang %}
    <li><a href="#{{ l }}">{{ l | upper }}</a></li>
    {% endif %}
    {% endfor %}
  </ul>
</details>
```

Pure HTML, no JS needed. CSS styles the dropdown to match the
existing nav aesthetic.

---

## File change summary

| File | Phase | Change |
|------|-------|--------|
| `_data/lib.js` | 1, 4 | Add zh to LANGUAGES (phase 4); no phase 1 changes |
| `_data/items.js` | 1 | One item per event, lang-map title, drop per-lang loop |
| `_data/prose.js` | 1 | One doc per prose, lang-map content, drop per-lang loop |
| `_data/rooms.js` | 2 | Use UUID for slug |
| `_data/graph.js` | 2 | Expose room UUID, resolve door targets to UUID |
| `_data/site.js` | 2 | Default room resolves to UUID |
| `pages/items.njk` | 1 | Drop `{{ item.lang }}/` from permalink |
| `pages/prose.njk` | 1 | Drop `{{ doc.lang }}/` from permalink |
| `pages/rooms.njk` | — | No change (slug value changes upstream) |
| `pages/index.njk` | 2 | Redirect target changes to UUID |
| `_includes/item.njk` | 1 | Full rewrite — per-language loop, hash toggle |
| `_includes/prose.njk` | 1 | Full rewrite — per-language loop, hash toggle |
| `_includes/room.njk` | 1 | Update links: drop lang prefix, add hash |
| `_includes/partials/navbar.njk` | 1 | Remove mode branching, loop over navLangs |
| `_includes/partials/footer.njk` | 1 | Drop navPrefix, use hash-based support link |
| `_includes/partials/head.njk` | 3 | Add JSON-LD and Content-Language meta |
| `_includes/items/legend.njk` | 1 | `item.title` → `item.title[lang]` |
| `_includes/items/poem-reading.njk` | 1 | `item.lang` → `lang`, title lang-map |
| `_includes/items/default.njk` | 1 | `item.title` → `item.title[lang]` |
| `theme/index.css` | 1 | Generalize lang toggle to N languages |
| `graph/index.ttl` | 2 | Add `g:uuid` to rooms |
| `eleventy.config.js` | — | No change |

## Verification

After each phase, run `npx @11ty/eleventy` and verify:

- Phase 1: all pages render at flat URLs, `#ru` toggle works,
  no `/en/` or `/ru/` directories in `_site/`, all internal
  links navigate correctly with language state preserved
- Phase 2: room pages at UUID URLs, doors link correctly,
  index.html redirects to the right UUID
- Phase 3: JSON-LD validates at schema.org validator, `lang`
  attributes present on all translation blocks
- Phase 4: zh content renders, switcher shows 3 languages
  on zh-tagged artifacts, 2 on en+ru artifacts
