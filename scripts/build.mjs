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

const PAGE_TITLE = 'ŌN Kitchens — Commercial Kitchen Rental, Los Angeles';
const PAGE_DESCRIPTION =
  'Private, fully certified commercial kitchen space in Van Nuys and Los Angeles ' +
  '— already built, already equipped. You bring the menu. We handle zoning, ' +
  'permitting and the city.';

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
  // React is pre-loaded so loadReactUmd() sees window.React/window.ReactDOM
  // already set and short-circuits its unpkg.com fetch entirely.
  const head = [
    `<title>${PAGE_TITLE}</title>`,
    `<meta name="description" content="${PAGE_DESCRIPTION}">`,
    `<link rel="icon" href="favicon.svg" type="image/svg+xml">`,
    `<!-- Hoisted out of <helmet> so the browser actually applies it. See buildIndex(). -->`,
    `<link rel="stylesheet" href="${dsHref[1]}">`,
    `<script src="${REACT}"></script>`,
    `<script src="${REACT_DOM}"></script>`,
  ].join('\n');

  html = replaceExactly(
    html,
    '<script src="./support.js"></script>',
    head + '\n<script src="./support.js"></script>',
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
      try {
        sessionStorage.setItem('on-lead', JSON.stringify({
          name: cur.f.fullName.trim(),
          phone: cur.f.phone.trim()
        }));
      } catch (err) { /* private mode — the thank-you page falls back to generic copy */ }
      window.location.assign('${THANK_YOU_PATH}');
    }, 1500);`,
    1,
    'lead form redirect'
  );

  await writeFile(join(OUT, 'index.html'), html);
  console.log(`  index.html      <- ${ENTRY} (+ head fixes, stylesheet hoisted, /thank-you redirect)`);
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
            `\n        <figure class="blueprint"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>` +
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
            `<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>` +
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
          `\n        <figure class="blueprint"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>` +
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

  await cp(join(ROOT, 'vendor'), join(OUT, 'vendor'), { recursive: true });
  console.log('  vendor/         <- pinned react, react-dom, leaflet');

  for (const entry of await readdir(join(ROOT, 'site'))) {
    await cp(join(ROOT, 'site', entry), join(OUT, entry), { recursive: true });
    console.log(`  ${entry.padEnd(15)} <- site/`);
  }

  await buildIndex();
  await buildMap();
  await buildThankYou();

  console.log(`\n[build] dist/ ready — publish this directory (amplify.yml baseDirectory).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
