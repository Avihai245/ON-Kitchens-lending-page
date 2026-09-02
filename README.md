# ŌN Kitchens — landing page

Marketing landing page for ŌN Kitchens, prepared for AWS Amplify Hosting.

The page itself is a [Claude Design](https://claude.ai/design) export. It is **not**
plain HTML: it renders through a small React runtime (`support.js`), with 39 `sc-if`
conditionals and 126 `{{ }}` bindings resolved at load time. That shapes everything
below.

## Layout

```
amplify.yml                        Amplify build spec (baseDirectory: dist)
customHttp.yml                     Amplify response headers — security + caching
scripts/build.mjs                  Assembles dist/. Node stdlib only, no dependencies
site/                              Files added on top of the design export
  404.html                           custom not-found page, brand-matched
  favicon.svg
  robots.txt
templates/
  thank-you.html                   post-submission page; reviews injected at build
vendor/                            Pinned libraries, served from our own origin
  react-18.3.1.production.min.js
  react-dom-18.3.1.production.min.js
  leaflet-1.9.4/
palette-and-photography-decisions/ The Claude Design export — treat as read-only
  project/
    ON Kitchens Landing.dc.html      the page
    _ds/…/styles.css                 design-system tokens and component classes
    support.js                       Claude Design React runtime
    map.html                         Leaflet map, iframed twice by the page
    assets/                          21 WebP images used by the page
    uploads/                         23 MB of design-tool source material, unused
dist/                              Build output (gitignored)
  index.html  thank-you.html  404.html  map.html  assets/  _ds/  vendor/  …
```

## Build and preview

```bash
node scripts/build.mjs
npx http-server dist -p 8080 -c-1 --ext html
```

`--ext html` makes the dev server resolve `/thank-you` to `thank-you.html` the way
Amplify does; without it that URL 404s locally while working fine in production.

No dependencies to install. `scripts/build.mjs` copies the export into `dist/`,
renames the entry file to `index.html`, applies the head fixes described below,
points `map.html` at the vendored Leaflet, and leaves `uploads/` out. Output is
1.8 MB, down from the 25 MB repo.

## Why there is a build step

The export cannot be published as-is:

- **There is no `index.html`.** The entry point is
  `palette-and-photography-decisions/project/ON Kitchens Landing.dc.html` — two
  directories deep, with spaces in the filename. Amplify serves `index.html` from
  the publish root.
- **The design-system stylesheet loads but never applies.** `_ds/…/styles.css` sits
  inside `<x-dc><helmet>`. `support.js`'s `boot()` removes the whole `<x-dc>`
  subtree and React re-inserts the `<link>` into `<head>`, where the browser fetches
  it and populates `link.sheet` (98 rules) but never adds it to
  `document.styleSheets` — so none of its rules take effect. In that state the page
  renders with all 33 `.btn`, 58 `.blueprint` wrappers and 8 `.field`/`.input`
  completely unstyled, and with `--font-heading`,
  `--font-body`, `--shadow-lg`, `--color-neutral-*`, `--space-*` and `--radius-*`
  undefined, which drops every heading to Times New Roman. The build emits the same
  `<link>` in the real `<head>`, where it is parsed normally.
- **The head was missing `<title>`, `lang` and a favicon.** The build adds them.

Keeping this in the build rather than editing the export means re-exporting from
Claude Design will not clobber any of it. `scripts/build.mjs` asserts on the exact
markup it rewrites, so if a future export changes shape the build fails loudly
instead of publishing a silently broken page.

## The thank-you page

A completed lead form sends the visitor to `/thank-you` instead of swapping in the
export's inline success state. The page runs: logo, then a centred confirmation
addressed to the lead by name with a panel echoing back the phone number they typed,
then the video (click-to-play, so the Vimeo player is only fetched when asked for),
then every review from the landing page — the six Google screenshots and all twelve
testimonials, including the six normally hidden behind "show more" — and finally five
photographs of the premises.

**Clean URL.** Built as a flat `dist/thank-you.html`, not `thank-you/index.html`.
Amplify resolves an extensionless request by looking for `<path>.html` first and
serving it at the clean URL with a 200; only when that file is missing does it 404,
redirect to `<path>/`, and serve the directory index. The flat file therefore lands
on `/thank-you` exactly, with no redirect hop, no trailing slash, and no console
rule to maintain.

**How the name and phone get there.** `sessionStorage`, not the query string. A
phone number in the URL would end up in browser history, in the `Referer` header of
every outbound link, and in any analytics that logs page paths. The page reads the
entry, renders it with `textContent` so a name can never inject markup, formats
10-digit US numbers as `(310) 555-1234` and shows anything else exactly as typed,
then clears the entry. A refresh or a direct visit to `/thank-you` therefore falls
back to generic copy rather than resurfacing someone's details — and the page still
reads correctly for a visitor who arrives with no data at all, including in private
mode where `sessionStorage` throws.

**Reviews are extracted from the design export at build time**, not copied by hand,
so the page cannot drift from the landing page it mirrors. The build asserts on
exactly 12 testimonials and 6 screenshots and fails if a re-export changes either
count.

The page is `noindex, follow` — a post-conversion page has nothing to gain from
indexing and would compete with the landing page in search.

## The blueprint corner decoration is stripped

The design system draws "+" crosshair registration marks just outside each corner of
every `.blueprint` box — `<i class="corner tl|tr|bl|br">` elements that the stylesheet
turns into an 11x11 box offset -6px with crossing 1px `::before`/`::after` rules. They
are removed at build time: 232 elements out of the landing page, the corresponding
`.blueprint > .corner` rules out of the design-system stylesheet, and none are emitted
by `templates/` or `site/`.

`.blueprint` itself is untouched, so every card, section and button keeps its plain
1px border. The marks were `position: absolute`, so removing them cannot shift
anything — verified by measuring 150 bounding boxes at 1440 / 768 / 390 px before and
after: page height, document width, text content and every box identical.

Doing this in the build rather than in the export means a re-export from Claude Design
cannot bring the decoration back. `stripCornerMarkup()` throws if a corner element
survives in a shape its pattern does not recognise.

## Desktop width

The export pins all 18 content wrappers to a flat `max-width: 1240px`. On a 1920px
monitor that left 340px of dead space either side — 35% of the screen, 52% at 2560px
— while the hero photograph behind it ran edge to edge, so the page read as a narrow
column floating on a wide background.

`CONTENT_MAX` in `scripts/build.mjs` replaces it:

```js
const CONTENT_MAX = 'clamp(1240px, 90vw, 1760px)';
```

| viewport | content before | after | dead margin per side |
| --- | --- | --- | --- |
| ≤1366 | 1240 | **1240 (unchanged)** | unchanged |
| 1440 | 1240 | 1296 | 100px → 72px |
| 1600 | 1240 | 1440 | 180px → 80px |
| 1920 | 1240 | 1728 | **340px → 96px** |
| 2560 | 1240 | 1760 | 660px → 400px |

`clamp` pins to the original 1240px at 1378px viewport and below, so every laptop,
tablet and phone layout is untouched — 390px and 768px measure byte-for-byte
identical to the previous build — and there is no snap while resizing. Readability is
unaffected because every paragraph and heading already carries its own `ch` cap in
the export (60ch, 46ch, 24ch and so on); only grids, images and the nav grow.

**One wrapper is deliberately excluded: the testimonial grid.** Its tracks are
`auto-fit` over a 280px minimum, so a wider container fits five columns — and the
section holds 6 quotes, or 12 once "show more" is open. Five columns leaves a single
orphan on the last row in both cases, where three divides both evenly. No `auto-fit`
minimum can hold three columns at both 1096px and 1616px of usable width (three at
1096 needs a minimum of 344px or less; only-three at 1616 needs more than 380px), so
that container keeps the width the design was drawn at and centres.

The closing lead form was 760px inside a 1096px panel, sitting hard left with 291px
of empty panel to its right. Widening the page would have made that worse, so
`margin-inline: auto` centres it in the same pass — block-centred, text still
left-aligned.

## Lead webhook

Every validated submission from either form is POSTed to `LEAD_WEBHOOK_URL`, then the
visitor is sent to `/thank-you`. Unset — the default, and the state this repo ships in
— nothing is sent, nothing errors, and the page behaves exactly as it did before.

**To turn it on:** Amplify console -> App settings -> Environment variables ->
`LEAD_WEBHOOK_URL` = your endpoint, then redeploy. The build prints which state it
used. Locally: `LEAD_WEBHOOK_URL=https://… node scripts/build.mjs`.

**Payload** (JSON):

```json
{
  "name": "Sarah Mitchell", "phone": "(310) 555-1234",
  "email": "sarah@bakery.example", "business": "Mitchell Bakehouse",
  "form": "end-of-page",
  "submittedAt": "2026-09-02T20:50:33.402Z",
  "pageUrl": "https://…/?utm_source=google", "referrer": null,
  "utm": { "source": "google", "medium": "cpc", "campaign": "kitchens_la",
           "term": null, "content": null, "gclid": "XYZ123", "fbclid": null }
}
```

`form` is `mid-page` or `end-of-page`, so the two forms can be told apart. UTM,
`gclid` and `fbclid` are read off the landing URL for attribution.

**Delivery.** `navigator.sendBeacon` first — the browser takes ownership of the
request, so it completes even though the page navigates a moment later — with
`fetch(keepalive)` as fallback. The body is sent as `text/plain` on purpose:
`application/json` makes it a preflighted cross-origin request and sendBeacon cannot
preflight, while `text/plain` stays a simple request that any origin accepts. Zapier,
Make and n8n all parse a JSON body regardless of the stated type.

**Two limits worth knowing**, both inherent to posting from a static page rather than
a server, and neither fixable client-side:

- **The URL is public.** It sits in the page source, so anyone can post fabricated
  leads to it. The receiver needs its own spam handling — Zapier and Make both offer
  filter steps.
- **Delivery is fire-and-forget.** A cross-origin response is opaque, so the page
  cannot tell whether the lead was accepted, and nothing is retried. If a lead must
  never be lost, put a small server in front: an Amplify function that holds the real
  endpoint plus a shared secret, with the page posting to that instead.

## Vendored libraries

`support.js` fetches React and ReactDOM from `unpkg.com` at load, and `map.html`
fetches Leaflet the same way. unpkg carries no uptime SLA, and if it stalls the page
renders blank — the entire page is React-rendered. All four files are committed
under `vendor/` and served from our own origin instead.

They are byte-identical to the CDN copies: each one's SHA-384 was checked against
the SRI hashes already pinned inside `support.js` and `map.html`. `support.js`
short-circuits its own CDN fetch when `window.React` and `window.ReactDOM` are
already set, so pre-loading them in `<head>` is all it takes.

To revert, delete `vendor/` and drop the injected tags in `scripts/build.mjs`.

## Performance

Measured on the built `dist/`, before and after this pass:

| | before | after |
| --- | --- | --- |
| First paint | 212 ms | **44 ms** |
| First contentful paint | 836 ms | **468 ms** |
| DOMContentLoaded | 374 ms | **142 ms** |
| Load event | 378 ms | **146 ms** |

Three changes did it:

- **Scripts deferred.** React, ReactDOM and `support.js` were synchronous in `<head>`,
  so the parser stopped on ~210 KB before it reached `<body>` and could not discover
  a single image. They are `defer` now: still in order, still before
  `DOMContentLoaded`, and `support.js` boots either way because it checks
  `document.readyState`. Deferring means its own `hideRawTemplate()` no longer runs
  during head parsing, so an inline `x-dc{display:none}` closes that window instead —
  verified with no flash of the raw template even at 8x CPU throttling.
- **Fonts unchained.** The design system loaded Google Fonts through an `@import` on
  line 2 of its stylesheet, which cannot start until that sheet has been fetched and
  parsed: html -> styles.css -> css2 -> woff2, four hops before text renders in the
  right face. The build lifts it into a `<link>` in `<head>` with `preconnect` to both
  font origins, so it starts in parallel with the stylesheet.
- **Hero preloaded.** `<link rel="preload" as="image" fetchpriority="high">` on the
  hero, the LCP element.

Two things deliberately *not* done:

- **Images were not re-encoded.** They look oversized — most are about twice their
  displayed width — but that is exactly right for the 2x displays that phones and
  modern laptops have. Shrinking them would trade 1 MB for a blurry page.
- **The runtime's `fetch(location.href)` was not disabled.** Setting
  `window.__resources` skips that second request for the page's own HTML, and the
  page still *looks* identical — but the refetch is what recovers camelCase
  attributes the HTML parser lowercases. Without it `noValidate` is lost, native
  browser validation pre-empts the designed inline errors, and `onSubmit` never runs.
  Tested and reverted. `customHttp.yml` already makes HTML revalidate, so in
  production that request is a 304, not a second 152 KB download.

## Responsiveness

Audited at 320 / 360 / 390 / 414 / 430 / 768 / 820 / 1024 / 1280 / 1440 / 1920 /
2560 px across all three pages: no horizontal overflow, no broken images, no JS
errors, no 4xx.

Getting there fixed a real bug. The export builds its layout from
`repeat(auto-fit, minmax(<N>px, 1fr))` tracks, and 19 of the 20 used a bare pixel
minimum. A bare minimum is a floor the track cannot go below, so at 320 px — where
the content box is 280 px after `--edge` padding — every track of 300, 320 or 330 px
pushed the document 30 px wider than the viewport and the whole page scrolled
sideways in four separate sections. The build rewrites them to
`minmax(min(100%, <N>px), 1fr)`, the guarded form the export already used in its one
remaining place. It is a no-op wherever the container is at least `<N>` wide, so
every tablet and desktop layout is unchanged — confirmed by measuring 150 bounding
boxes at 390 / 768 / 1440 against an unguarded build: identical.

Known, not fixed: two links on the landing page are under the 24x24 px WCAG 2.2
SC 2.5.8 target size — the header logo (105x20) and the footer "Schedule a tour"
(101x18). Both need padding on elements inside the design export, which would shift
its layout, so they are left for a deliberate design decision rather than changed
here.

## Connecting the app in the Amplify console

1. **Host a web app** → connect this repository and the branch you want to deploy.
2. Amplify will detect `amplify.yml` at the root. Confirm the build settings show
   `baseDirectory: dist`; no framework preset is needed.
3. **App settings → Rewrites and redirects.** Amplify has no repo-side redirects
   file (unlike Netlify's `_redirects`), so the 404 rule has to be added here to
   serve `site/404.html`:

   | Source | Target | Type |
   | --- | --- | --- |
   | `/<*>` | `/404.html` | `404 (Redirect)` |

   Or paste as JSON in the console's editor:

   ```json
   [
     {
       "source": "/<*>",
       "target": "/404.html",
       "status": "404",
       "condition": null
     }
   ]
   ```

   Do **not** add the SPA rule (`/<*>` → `/index.html`, `404-200`). This is a
   single-page static site, not a client-side router, and that rule would return
   the landing page with a 200 for every mistyped URL.
4. `customHttp.yml` is picked up automatically from the repo root. It sets HSTS,
   `nosniff`, `Referrer-Policy`, a `Permissions-Policy`, and cache lifetimes.
   `X-Frame-Options` is `SAMEORIGIN` rather than `DENY` on purpose — the page
   iframes `map.html` from this same origin for the two location maps, and `DENY`
   would blank both.
5. Attach the custom domain, then add the `Sitemap:` line to `site/robots.txt` and
   consider adding `og:`/`twitter:` tags and a `<link rel="canonical">` to
   `scripts/build.mjs` — those need the final domain, so they were left out.

Nothing here provisions AWS resources or sets environment variables.

## Known gaps, not addressed here

These are behaviours of the design prototype, left alone deliberately:

- **Both lead forms are still simulated.** `submit()` validates, waits 1.5s, and
  redirects to `/thank-you`. Nothing is sent anywhere and nothing is stored — the
  name and phone live only in that visitor's own `sessionStorage` and are cleared on
  render. The funnel now *looks* complete end to end, which makes this more
  dangerous than before, not less: every lead is still dropped. Wire the submit to a
  real endpoint before driving traffic here.
- **The header phone CTA is commented out** in the export, in 10 places
  (`(844) 435-1255`). The number is still live on 14 other `tel:` links.
- **Maps use OpenStreetMap's public infrastructure** — `tile.openstreetmap.org` for
  tiles and `nominatim.openstreetmap.org` for geocoding. OSM's usage policies
  discourage commercial production traffic against both; a paid tile provider is
  worth budgeting for.
- **The hero video is a Vimeo embed** (`vimeo.com/703398003`). Worth confirming the
  video and its licensing are right for production.
- **No Content-Security-Policy.** The design styles every element with inline
  `style` attributes and ships its logic in an inline script, so any workable policy
  needs `'unsafe-inline'` for both `script-src` and `style-src`. `customHttp.yml`
  carries an accurate origin list in a comment if you want to enable one anyway.
- **Cache lifetimes are short** (one day for images, revalidate for HTML) because no
  filename carries a content hash. Fingerprint the assets and these can go to a
  year.

## Verified

Against the built `dist/`, in headless Chromium at 390 / 768 / 1440 px:

- All 25 local references resolve; 34 images load, 0 broken; no 4xx or 5xx.
- Design-system stylesheet applied, `--font-heading` resolving, `.btn-primary` at
  `#B07A1C`.
- No requests to `unpkg.com`. Leaflet 1.9.4 initialises from `vendor/`.
- No template leakage — zero `x-dc`, `sc-if` or `{{ }}` left in the DOM.
- No horizontal overflow at any breakpoint. No duplicate IDs. All 10 in-page anchor
  targets exist.
- Interactivity: 5 equipment tabs, 8 FAQ accordions, form validation and submit
  states, sticky CTA, reviews expand, accessibility panel (text size / contrast /
  underline links / stop motion), in-place video player.
- Thank-you flow: both forms redirect to `/thank-you` with no trailing slash; hero
  centred; the headline carries the submitted name and the panel the formatted phone;
  click-to-play swaps in the Vimeo player; 6 screenshots, 12 testimonials and 5 photos
  render with no broken images; a refresh, a direct visit and a private-mode visit all
  fall back to generic copy with the panel hidden; the back button returns to the
  landing page.
- Corner removal: 0 `.corner` nodes on every page, `.blueprint` border intact, and
  150 bounding boxes byte-identical to the previous build at all three widths.
