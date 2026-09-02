#!/usr/bin/env node
/**
 * Assembles the deployable site into dist/.
 *
 * The Claude Design export under palette-and-photography-decisions/ is treated as
 * read-only source: re-exporting from Claude Design overwrites that directory, so
 * every deploy-time fixup lives here instead of being patched into the design file.
 *
 * Run locally with:  node scripts/build.mjs && npx http-server dist -p 8080 -c-1
 */

import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'palette-and-photography-decisions', 'project');
const OUT = join(ROOT, 'dist');

/** Entry point of the design export. Becomes dist/index.html. */
const ENTRY = 'ON Kitchens Landing.dc.html';

/** Copied verbatim from the export. `uploads/` is deliberately absent: 23 MB of
 *  design-tool source material that nothing on the page references. */
const PASS_THROUGH = ['assets', '_ds', 'support.js', 'map.html'];

/** Pinned library versions, vendored under vendor/ so the page has no runtime
 *  dependency on a third-party CDN. Each file was verified byte-identical to the
 *  CDN copy against the SRI hashes pinned in support.js and map.html. */
const REACT = 'vendor/react-18.3.1.production.min.js';
const REACT_DOM = 'vendor/react-dom-18.3.1.production.min.js';
const LEAFLET_CSS = 'vendor/leaflet-1.9.4/leaflet.css';
const LEAFLET_JS = 'vendor/leaflet-1.9.4/leaflet.js';

/** Venue photography reused on the thank-you page. Two of these are decorative in
 *  the landing page and carry an empty alt there; as gallery content they need real
 *  descriptions, so alt text is written here rather than scraped. `flour-hands` is a
 *  wide banner crop and `could-be-you` an annotated marketing graphic — neither is a
 *  photograph of the premises, so both are left out. */
const VENUE_PHOTOS = [
  ['kitchen-hero.webp', 'Commercial exhaust hood over a stainless line, with combi oven and prep table'],
  ['prep-rail.webp', 'Refrigerated prep rail with stocked pans, mixing bowls and cut citrus on the cutting board'],
  ['prep-overhead.webp', 'Two cooks portioning bowls and packing delivery containers across a stainless prep table'],
  ['walk-in.webp', 'Walk-in cooler stocked with produce crates, dairy and pans on wire shelving'],
  ['delivery-line.webp', 'Packed delivery containers lined up on a stainless table with kraft bags ready for pickup'],
];

/** Clean URL for the post-submission page.
 *
 *  Emitted as a flat thank-you.html, NOT thank-you/index.html. Amplify resolves an
 *  extensionless request by looking for `<path>.html` first and serving it at the
 *  clean URL with a 200; only when that is missing does it 404, redirect to
 *  `<path>/`, and serve `<path>/index.html`. The flat file therefore lands on
 *  /thank-you exactly, with no redirect hop and no trailing slash. */
const THANK_YOU_PATH = '/thank-you';
const THANK_YOU_FILE = 'thank-you.html';

/** The web fonts the design system asks for. Declared here as a <link> in <head>
 *  and stripped from the stylesheet's @import — see the head comment in buildIndex(). */
const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700' +
  '&family=Barlow+Condensed:wght@400;600&display=swap';

/**
 * Where a submitted lead is POSTed, read from the environment at build time and
 * baked into the page. Set it in the Amplify console under
 * App settings -> Environment variables as LEAD_WEBHOOK_URL, then redeploy.
 *
 * Unset (the default) the page behaves exactly as before: validate, store the name
 * and phone for the thank-you page, redirect. Nothing is sent and nothing errors.
 *
 * This is a static site, so the POST is made by the visitor's browser. Two things
 * follow from that and neither can be engineered away client-side:
 *   - The URL is visible in the page source. Anyone who views source can post
 *     fabricated leads to it, so the receiver needs its own spam handling.
 *   - The response is opaque. The browser cannot read a cross-origin reply without
 *     CORS headers, so delivery is fire-and-forget: a rejected lead is not retried
 *     and not reported.
 * A server-side relay (an Amplify function, or a receiver that accepts a shared
 * secret) is the fix for both; the README says so.
 */
const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || '';

/**
 * Inline sender, injected into <head>.
 *
 * sendBeacon is the primary path: the browser takes ownership of the request, so it
 * completes even though the page navigates to /thank-you a moment later. The body
 * goes as text/plain rather than application/json deliberately — application/json
 * makes it a preflighted cross-origin request, and sendBeacon cannot preflight.
 * text/plain keeps it a simple request that any origin will accept, and every common
 * receiver (Zapier, Make, n8n) parses a JSON body regardless of the stated type.
 * fetch with keepalive is the fallback for browsers where sendBeacon is unavailable
 * or refuses the payload.
 */
function leadSenderScript(url) {
  if (!url) {
    return `<script>window.__onSendLead=function(){};/* LEAD_WEBHOOK_URL unset at build time */</script>`;
  }
  return `<script>
window.__onSendLead = function (lead) {
  try {
    var q = new URLSearchParams(location.search);
    var payload = JSON.stringify({
      name: lead.name, phone: lead.phone, email: lead.email,
      business: lead.business, form: lead.form,
      submittedAt: new Date().toISOString(),
      pageUrl: location.href, referrer: document.referrer || null,
      utm: {
        source: q.get('utm_source'), medium: q.get('utm_medium'),
        campaign: q.get('utm_campaign'), term: q.get('utm_term'),
        content: q.get('utm_content'), gclid: q.get('gclid'), fbclid: q.get('fbclid')
      }
    });
    var url = ${JSON.stringify(url)};
    var type = 'text/plain;charset=UTF-8';
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([payload], { type: type }))) return;
    fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true,
                 headers: { 'Content-Type': type }, body: payload }).catch(function () {});
  } catch (err) { /* never let delivery block the redirect */ }
};
</script>`;
}

const PAGE_TITLE = 'ŌN Kitchens — Commercial Kitchen Rental, Los Angeles';
const PAGE_DESCRIPTION =
  'Private, fully certified commercial kitchen space in Van Nuys and Los Angeles ' +
  '— already built, already equipped. You bring the menu. We handle zoning, ' +
  'permitting and the city.';

/**
 * Strips the blueprint corner decoration — the "+" crosshair registration marks
 * drawn just outside each corner of a `.blueprint` box.
 *
 * The marks are `<i class="corner tl|tr|bl|br">` elements; the design system turns
 * each into an 11x11 box offset -6px outside the corner with crossing 1px
 * ::before/::after rules. They are `position: absolute`, so removing them cannot
 * move anything: absolutely positioned children sit outside normal flow and are
 * excluded from flex and grid layout, contributing nothing to their parent's size
 * or gaps. The `.blueprint` class itself is untouched, so every card, section and
 * button keeps its plain 1px border.
 *
 * Applied to the design export at build time rather than edited into it, so a
 * re-export from Claude Design cannot bring the decoration back.
 */
function stripCornerMarkup(html, label) {
  const TAG = /<i class="corner (?:tl|tr|bl|br)"[^>]*><\/i>/g;
  const kept = [];
  let removed = 0;

  for (const line of html.split('\n')) {
    if (!line.includes('class="corner')) {
      kept.push(line);
      continue;
    }
    removed += (line.match(TAG) || []).length;
    const rest = line.replace(TAG, '');
    // A line that held nothing but corner marks is dropped outright, rather than
    // left behind as stray indentation.
    if (rest.trim() !== '') kept.push(rest);
  }

  const out = kept.join('\n');
  if (out.includes('class="corner')) {
    throw new Error(
      `[build] ${label}: a corner element survived stripping — its markup no longer ` +
        `matches the expected <i class="corner tl|tr|bl|br"> shape. Update stripCornerMarkup().`
    );
  }
  return { html: out, removed };
}

/**
 * Guards the export's grid minimums against very narrow viewports.
 *
 * The layout is built from `repeat(auto-fit, minmax(<N>px, 1fr))` tracks. A bare
 * pixel minimum is a floor the track cannot go below, so on a 320px phone — where
 * the content box is 280px after the 20px `--edge` padding either side — every
 * track wider than that (300, 320, 330) pushed the document 30px wider than the
 * viewport and the whole page scrolled sideways.
 *
 * `minmax(min(100%, <N>px), 1fr)` is the standard fix, and the export already uses
 * it in one place, so this just applies its own pattern consistently. It is a no-op
 * wherever the container is at least <N> wide, which means every tablet and desktop
 * layout is byte-for-byte unchanged; it only engages on the widths that were broken.
 */
function guardGridMinimums(html, label) {
  const BARE = /minmax\((\d+)px, 1fr\)/g;
  const found = [...html.matchAll(BARE)].length;
  const out = html.replace(BARE, 'minmax(min(100%, $1px), 1fr)');
  if (/minmax\(\d+px, 1fr\)/.test(out)) {
    throw new Error(`[build] ${label}: a bare grid minimum survived guarding.`);
  }
  return { html: out, guarded: found };
}

/** Rewrites the design-system stylesheet for publication: drops the corner
 *  decoration's own rules so no `.corner` selector survives, and lifts out the
 *  Google Fonts @import, which the built page declares as a <link> in <head>
 *  instead. `.blueprint`'s border rule is deliberately left in place. */
function stripCornerStyles(css) {
  css = replaceExactly(
    css,
    `@import url('${FONT_CSS}');\n`,
    '',
    1,
    'font @import'
  );
  const RULES = `.blueprint > .corner {
  position: absolute; width: 11px; height: 11px;
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}
.blueprint > .corner::before, .blueprint > .corner::after {
  content: ""; position: absolute; background: currentColor;
}
.blueprint > .corner::before { left: 5px; top: 0; width: 1px; height: 100%; }
.blueprint > .corner::after  { top: 5px; left: 0; width: 100%; height: 1px; }
.blueprint > .corner.tl { top: -6px; left: -6px; }
.blueprint > .corner.tr { top: -6px; right: -6px; }
.blueprint > .corner.bl { bottom: -6px; left: -6px; }
.blueprint > .corner.br { bottom: -6px; right: -6px; }
`;
  let out = replaceExactly(css, RULES, '', 1, 'corner style rules');
  // Two comments elsewhere in the file describe the marks; leaving them would keep
  // `.corner` greppable in the shipped CSS for a feature that no longer exists.
  out = replaceExactly(
    out,
    `/* The overlay image treatments (halftone, duotone) clip their overlay
   (overflow:hidden); a blueprint wrapper draws its registration marks
   outside the box, so when both classes share a wrapper the frame must
   win. */
`,
    '',
    1,
    'corner overflow comment'
  );
  out = replaceExactly(
    out,
    `/* — blueprint frame: components are wireframe objects (see .blueprint
     and .corner above) — square, transparent, hairline-bordered — */`,
    `/* — blueprint frame: components are wireframe objects (see .blueprint
     above) — square, transparent, hairline-bordered — */`,
    1,
    'corner reference comment'
  );
  return out;
}

/** Replace `find` in `text` exactly `expected` times, or throw. Guards against a
 *  future re-export silently changing the markup out from under a rewrite. */
function replaceExactly(text, find, replacement, expected, label) {
  const count = text.split(find).length - 1;
  if (count !== expected) {
    throw new Error(
      `[build] ${label}: expected ${expected} occurrence(s) of ${JSON.stringify(
        find.slice(0, 80)
      )}, found ${count}. The design export likely changed — update scripts/build.mjs.`
    );
  }
  return text.split(find).join(replacement);
}

/**
 * Rewrites the design export's entry file into a deployable index.html.
 *
 * The load-bearing change is hoisting the design-system stylesheet into the real
 * <head>. In the export that <link> lives inside <x-dc><helmet>; support.js's
 * boot() removes the whole <x-dc> subtree and React re-inserts the link, at which
 * point the browser fetches it and populates link.sheet but never adds it to
 * document.styleSheets — so none of its rules apply. Every .btn, .blueprint,
 * .field and .input renders unstyled and --font-heading/--font-body are undefined,
 * dropping all headings to Times New Roman. A copy in the real <head> is parsed
 * normally and applies. The helmet copy is left in place so the file still round-
 * trips through Claude Design; it resolves to the same URL and is served from cache.
 */
async function buildIndex() {
  let html = await readFile(join(SRC, ENTRY), 'utf8');

  const dsHref = html.match(
    /<link rel="stylesheet" href="(_ds\/[^"]+\/styles\.css)">/
  );
  if (!dsHref) {
    throw new Error('[build] could not find the design-system stylesheet link in ' + ENTRY);
  }

  html = replaceExactly(html, '<html>', '<html lang="en">', 1, 'html lang');

  // Everything the document needs before support.js runs, in the real <head>.
  //
  // React is pre-loaded so loadReactUmd() sees window.React/window.ReactDOM already
  // set and short-circuits its unpkg.com fetch entirely.
  //
  // All three scripts are deferred. Loaded synchronously they blocked the parser on
  // ~210 KB before it reached <body>, which delayed discovery of the hero image and
  // every other asset. Deferred scripts still execute in order, still run before
  // DOMContentLoaded, and support.js boots either way — it checks document.readyState
  // and calls __dcBoot() directly when parsing has already finished.
  //
  // Deferring means support.js's own hideRawTemplate() no longer runs during head
  // parsing, so the raw <x-dc> template would flash before being hidden. The inline
  // style below closes that window from the first byte of <body>.
  //
  // The font stylesheet is linked here rather than left as the @import on line 2 of
  // the design-system CSS. An @import cannot start until its parent sheet has been
  // fetched and parsed, so the fonts sat behind a three-hop chain
  // (html -> styles.css -> css2 -> woff2); as a <link> it starts in parallel with
  // styles.css, and the preconnects warm both font origins ahead of it.
  const head = [
    `<title>${PAGE_TITLE}</title>`,
    `<meta name="description" content="${PAGE_DESCRIPTION}">`,
    `<link rel="icon" href="favicon.svg" type="image/svg+xml">`,
    `<style>x-dc{display:none!important}</style>`,
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="${FONT_CSS}">`,
    `<!-- Hoisted out of <helmet> so the browser actually applies it. See buildIndex(). -->`,
    `<link rel="stylesheet" href="${dsHref[1]}">`,
    `<link rel="preload" as="image" href="assets/kitchen-hero.webp" fetchpriority="high">`,
    leadSenderScript(LEAD_WEBHOOK_URL),
    `<script defer src="${REACT}"></script>`,
    `<script defer src="${REACT_DOM}"></script>`,
  ].join('\n');

  html = replaceExactly(
    html,
    '<script src="./support.js"></script>',
    head + '\n<script defer src="./support.js"></script>',
    1,
    'head injection'
  );

  // A completed lead form sends the visitor to /thank-you instead of swapping in the
  // export's inline success state. Name and phone travel in sessionStorage, not the
  // query string, so a phone number never lands in browser history, in the Referer
  // header of an outbound link, or in analytics that log page paths. The artificial
  // 1.5s "Sending…" state is kept so the submit still reads as an action rather than
  // an abrupt jump, and the simulateError prop still forces the error state.
  html = replaceExactly(
    html,
    `    setTimeout(() => {
      this.patchForm(id, () => ({ status: this.props.simulateError ? 'error' : 'success' }));
    }, 1500);`,
    `    setTimeout(() => {
      if (this.props.simulateError) {
        this.patchForm(id, () => ({ status: 'error' }));
        return;
      }
      var lead = {
        name: cur.f.fullName.trim(),
        phone: cur.f.phone.trim(),
        email: cur.f.email.trim(),
        business: (cur.f.business || '').trim(),
        form: id === 'mid' ? 'mid-page' : 'end-of-page'
      };
      try {
        sessionStorage.setItem('on-lead', JSON.stringify({ name: lead.name, phone: lead.phone }));
      } catch (err) { /* private mode — the thank-you page falls back to generic copy */ }
      window.__onSendLead(lead);
      window.location.assign('${THANK_YOU_PATH}');
    }, 1500);`,
    1,
    'lead form redirect'
  );

  const stripped = stripCornerMarkup(html, 'index.html');
  const guarded = guardGridMinimums(stripped.html, 'index.html');
  await writeFile(join(OUT, 'index.html'), guarded.html);
  console.log(
    `  index.html      <- ${ENTRY} (+ head fixes, stylesheet hoisted, /thank-you redirect, ` +
      `${stripped.removed} corner marks removed, ${guarded.guarded} grid minimums guarded)`
  );
}

/**
 * Builds the post-submission thank-you page at /thank-you.
 *
 * Emitted as a flat thank-you.html so Amplify serves it at /thank-you directly —
 * see THANK_YOU_FILE. Reviews are lifted out of the design
 * export at build time rather than copied by hand, so the page can never drift from
 * the landing page it mirrors — including the six review screenshots and all twelve
 * testimonials, the latter of which are half-hidden behind "show more" on the
 * landing page but shown in full here.
 */
async function buildThankYou() {
  const src = await readFile(join(SRC, ENTRY), 'utf8');
  const star = (n) =>
    `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

  const quotes = [];
  const quoteRe =
    /<blockquote[^>]*>&ldquo;(.*?)&rdquo;<\/blockquote>[\s\S]*?<figcaption[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>/g;
  for (let m; (m = quoteRe.exec(src)); ) {
    quotes.push({ quote: m[1], name: m[2].trim(), date: m[3].trim() });
  }
  if (quotes.length !== 12) {
    throw new Error(`[build] thank-you: expected 12 testimonials in the export, found ${quotes.length}`);
  }

  // The marquee lists every screenshot twice — once described, then again with
  // alt="" for the seamless loop. Drop the empty-alt copies before deduping, or the
  // Map keeps the second (undescribed) one.
  const shots = [
    ...new Map(
      [...src.matchAll(/<img src="(assets\/reviews\/[^"]+)"[^>]*alt="([^"]*)"/g)]
        .filter((m) => m[2])
        .map((m) => [m[1], m[2]])
    ),
  ];
  if (shots.length !== 6) {
    throw new Error(`[build] thank-you: expected 6 review screenshots in the export, found ${shots.length}`);
  }

  const html = (await readFile(join(ROOT, 'templates', 'thank-you.html'), 'utf8'))
    .replace('{{STARS_LG}}', star(26).repeat(5))
    .replace(
      '{{REVIEW_SHOTS}}',
      shots
        .map(
          ([s, alt]) =>
            `\n        <figure class="blueprint">` +
            `<img src="/${s}" alt="${alt}" loading="lazy"></figure>`
        )
        .join('') + '\n      '
    )
    .replace(
      '{{REVIEW_QUOTES}}',
      quotes
        .map(
          (q) =>
            `\n        <figure class="blueprint">` +
            `<div role="img" aria-label="Rated 5 out of 5" class="stars">${star(14).repeat(5)}</div>` +
            `<blockquote>&ldquo;${q.quote}&rdquo;</blockquote>` +
            `<figcaption><b>${q.name}</b><span>${q.date}</span></figcaption></figure>`
        )
        .join('') + '\n      '
    )
    .replace(
      '{{VENUE_PHOTOS}}',
      VENUE_PHOTOS.map(
        ([file, alt]) =>
          `\n        <figure class="blueprint">` +
          `<img src="/assets/${file}" alt="${alt}" loading="lazy"></figure>`
      ).join('') + '\n      '
    );

  if (html.includes('{{')) throw new Error('[build] thank-you: a template placeholder was left unfilled');

  await writeFile(join(OUT, THANK_YOU_FILE), html);
  console.log(
    `  ${THANK_YOU_FILE.padEnd(15)} <- templates/thank-you.html (${shots.length} review shots, ${quotes.length} testimonials, ${VENUE_PHOTOS.length} photos) — served at ${THANK_YOU_PATH}`
  );
}

/** Points map.html's Leaflet tags at the vendored copy. Paths are relative to the
 *  publish root, and map.html sits there too, so they need no prefix. */
async function buildMap() {
  let html = await readFile(join(SRC, 'map.html'), 'utf8');

  html = replaceExactly(
    html,
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">',
    `<link rel="stylesheet" href="${LEAFLET_CSS}">`,
    1,
    'leaflet css'
  );
  html = replaceExactly(
    html,
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>',
    `<script src="${LEAFLET_JS}"></script>`,
    1,
    'leaflet js'
  );

  await writeFile(join(OUT, 'map.html'), html);
  console.log('  map.html        <- map.html (Leaflet vendored)');
}

async function main() {
  if (!existsSync(SRC)) throw new Error('[build] design export not found at ' + SRC);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const entry of PASS_THROUGH) {
    if (entry === 'map.html') continue; // rewritten below
    await cp(join(SRC, entry), join(OUT, entry), { recursive: true });
    console.log(`  ${entry.padEnd(15)} <- copied verbatim`);
  }

  // _ds/ ships only what the page loads. The rest of the directory is Claude Design's
  // own tooling metadata — the system's readme, its component manifest and an oxlint
  // config — which has no business on a public origin and still documents the corner
  // decoration. The stylesheet is then rewritten in place to drop the corner rules.
  for (const dir of await readdir(join(OUT, '_ds'))) {
    for (const file of await readdir(join(OUT, '_ds', dir))) {
      if (file !== 'styles.css' && file !== '_ds_bundle.js') {
        await rm(join(OUT, '_ds', dir, file), { recursive: true, force: true });
        console.log(`  _ds/${file.padEnd(11)} <- dropped (design-tool metadata)`);
      }
    }
    const css = join(OUT, '_ds', dir, 'styles.css');
    await writeFile(css, stripCornerStyles(await readFile(css, 'utf8')));
    console.log('  _ds styles.css  <- corner rules stripped');
  }

  await cp(join(ROOT, 'vendor'), join(OUT, 'vendor'), { recursive: true });
  console.log('  vendor/         <- pinned react, react-dom, leaflet');

  for (const entry of await readdir(join(ROOT, 'site'))) {
    await cp(join(ROOT, 'site', entry), join(OUT, entry), { recursive: true });
    console.log(`  ${entry.padEnd(15)} <- site/`);
  }

  await buildIndex();
  await buildMap();
  await buildThankYou();

  console.log(
    LEAD_WEBHOOK_URL
      ? `\n[build] lead webhook: ${LEAD_WEBHOOK_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1/…')}`
      : `\n[build] lead webhook: not configured (set LEAD_WEBHOOK_URL to enable)`
  );
  console.log(`[build] dist/ ready — publish this directory (amplify.yml baseDirectory).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
