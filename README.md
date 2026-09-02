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
