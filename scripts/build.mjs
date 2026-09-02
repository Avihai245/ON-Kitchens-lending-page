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

  await writeFile(join(OUT, 'index.html'), html);
  console.log(`  index.html      <- ${ENTRY} (+ head fixes, stylesheet hoisted)`);
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

  console.log(`\n[build] dist/ ready — publish this directory (amplify.yml baseDirectory).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
