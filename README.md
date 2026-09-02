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
```

## Build and preview

```bash
node scripts/build.mjs
npx http-server dist -p 8080 -c-1
```

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
  renders with all 33 `.btn`, 58 `.blueprint` wrappers, 232 `.corner` registration
  marks and 8 `.field`/`.input` completely unstyled, and with `--font-heading`,
  `--font-body`, `--shadow-lg`, `--color-neutral-*`, `--space-*` and `--radius-*`
  undefined, which drops every heading to Times New Roman. The build emits the same
  `<link>` in the real `<head>`, where it is parsed normally.
- **The head was missing `<title>`, `lang` and a favicon.** The build adds them.

Keeping this in the build rather than editing the export means re-exporting from
Claude Design will not clobber any of it. `scripts/build.mjs` asserts on the exact
markup it rewrites, so if a future export changes shape the build fails loudly
instead of publishing a silently broken page.

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

- **Both lead forms are simulated.** `submit()` in the page's script runs
  `setTimeout(…, 1500)` and then shows the success state. Nothing is sent anywhere
  and nothing is stored. The forms look like they work and drop every lead — wire
  them to a real endpoint before driving traffic here.
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
  `#B07A1C`, blueprint corner marks drawn.
- No requests to `unpkg.com`. Leaflet 1.9.4 initialises from `vendor/`.
- No template leakage — zero `x-dc`, `sc-if` or `{{ }}` left in the DOM.
- No horizontal overflow at any breakpoint. No duplicate IDs. All 10 in-page anchor
  targets exist.
- Interactivity: 5 equipment tabs, 8 FAQ accordions, form validation and submit
  states, sticky CTA, reviews expand, accessibility panel (text size / contrast /
  underline links / stop motion), video modal.
