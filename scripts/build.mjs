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

/** Desktop content width. `clamp` pins to the export's original 1240px at 1378px
 *  viewport and below, so nothing changes on laptops, tablets or phones; above that
 *  it tracks 90vw to a 1760px ceiling. */
const CONTENT_MAX = 'clamp(1240px, 90vw, 1760px)';

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
 * Scroll motion, appended to the export's own helmet <style> so every rule sits with
 * the existing [data-rev] / [data-tab] / [data-faq] motion rather than in a second
 * stylesheet with a different cascade position.
 *
 * The hiding strategy is deliberately the opposite of [data-rev]'s. That one writes
 * inline `opacity: 0`, which beats any non-important stylesheet rule — which is why
 * applyA11y has to carry an `!important` override for it, and why forgetting one
 * leaves content permanently invisible. These items hide via a `[data-hide]`
 * attribute the script adds instead, so the FINAL state is the default: if the
 * script never runs, if IntersectionObserver is missing, or if the visitor has
 * reduced motion, the content is simply already in place.
 *
 * Stagger comes from :nth-child rather than a JS-computed delay — the items are
 * siblings in all three sections (4 <li> steps, 4 cards, 5 rows).
 */
const MOTION_CSS = `
/* ---- per-item scroll reveal (build-time addition) ----
   The stagger delay is written by the script, not by :nth-child. Only items below
   the fold at mount are hidden, so on a phone where a group straddles the fold the
   first items are never hidden at all — an :nth-child delay would then leave a hole
   in the sequence and a dead beat before anything moved. The script counts hidden
   siblings instead, so the cascade is always 0, 90, 180… over what actually animates. */
[data-rev-item] { transition: opacity .55s ease, transform .55s ease; }
[data-rev-item][data-hide] { opacity: 0; transform: translateY(18px); }
/* how-it-works: the datum rail draws itself over the step's own top border, then
   the survey marker is planted — both reuse the section's existing vocabulary */
[data-step]::after {
  content: ""; position: absolute; top: -1px; left: 0; right: 0; height: 1px;
  background: var(--color-accent); transform-origin: left;
  transition: transform .6s ease;
}
[data-step][data-hide]::after { transform: scaleX(0); }
[data-step] > span[aria-hidden="true"] { transition: transform .45s cubic-bezier(.34, 1.4, .64, 1) .15s; }
[data-step][data-hide] > span[aria-hidden="true"] { transform: scale(0); }
/* pain cards: the numeral as a ghosted watermark, giving the flat boxes depth */
[data-num] { overflow: hidden; }
[data-num]::before {
  content: attr(data-num); position: absolute; right: -4px; top: -18px;
  font-family: var(--font-heading); font-weight: 600; font-size: 96px; line-height: 1;
  letter-spacing: 0.02em; pointer-events: none;
  color: color-mix(in srgb, var(--color-text) 7%, transparent);
}
/* benefits band: redefining two tokens recolours every inline
   color-mix(... var(--color-text) ...) inside the section at once.
   --color-accent-700 is remapped because #7A5216 is 2.7:1 on #141414 (fails AA)
   while #D9AB56 is 8.7:1. --color-bg is deliberately NOT redefined — the section
   never uses it, but .btn-primary reads it for its label colour and the CTA must
   stay identical to every other CTA on the page. */
[data-band="dark"] {
  --color-text: #FAF8F5;
  --color-divider: color-mix(in srgb, #FAF8F5 22%, transparent);
  --color-accent-700: #D9AB56;
  background: #141414;
  color: #FAF8F5;
}
/* The band remaps --color-accent-700 for its numerals, and .btn-primary's hover
   reads that same token — so inside a dark band the CTA's hover resolved to the
   band's #D9AB56: a 2.00:1 label, worse than the resting state this change was
   made to fix. Restoring the token inside the button keeps the ramp identical on
   every ground, which is the same reason --color-bg is left alone above. */
[data-band="dark"] .btn-primary { --color-accent-700: #7A5216; }
/* A dark band prints as white-on-white: browsers drop backgrounds when printing but
   keep colours. One rule restores the whole band because the colours are tokens. */
@media print {
  [data-band="dark"] {
    --color-text: #141414;
    --color-divider: color-mix(in srgb, #141414 16%, transparent);
    --color-accent-700: #7A5216;
    background: #fff !important;
    color: #141414 !important;
  }
}
`;

/**
 * Readability and mobile rhythm, appended to the same helmet <style> as MOTION_CSS.
 *
 * The rules key off the inline styles the design already writes rather than off
 * hook attributes, because the export sets every dimension inline and there is no
 * class to hang them on. That is safe for LENGTHS but not for colours: the DC
 * runtime parses each style attribute into a React style object and re-serialises
 * it through CSSOM, which rewrites #141414 to rgb(20, 20, 20) — the reason the
 * export's own [style*="#141414"] rescue rule matched nothing — while leaving
 * lengths and clamp() expressions byte-identical. Measured in the built page:
 * [style*="font-size: 15px"] matches 38 elements on a phone, [style*="#141414"]
 * matches 0.
 *
 * Why a media query at all: the export ships exactly ONE for the whole site
 * (prefers-reduced-motion). Everything else is clamp() and auto-fit, which scales
 * layout but not type — so a phone renders the desktop type scale verbatim, and
 * every clamp() floor tuned for a desktop minimum becomes a phone's fixed value.
 * 760px is the runtime's own phone breakpoint (matchMedia('(max-width: 760px)')).
 */
const READABILITY_CSS = `
/* ---- readability (build-time addition) ----
   The headline can out-measure a 320-414px viewport while the fallback font is
   still swapping in. The hero is a grid, and a grid item's automatic minimum size
   is its min-content width, so for the length of that swap the whole document
   scrolled sideways. Both rules are inert once Barlow Condensed lands. */
[style*="padding: clamp(88px, 11vh, 150px)"] { min-width: 0; }
[style*="padding: clamp(88px, 11vh, 150px)"] h1 { overflow-wrap: break-word; }

/* Mobile navigation. The button is always in the markup and hidden above the
   breakpoint, so it cannot blink in while isDesktop corrects itself at mount; the
   panel is absolute inside the sticky header so opening it moves nothing. */
[data-navpanel] {
  position: absolute; left: 0; right: 0; top: 100%;
  display: flex; flex-direction: column;
  margin: 0; padding: 0 var(--edge) 10px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-divider);
  box-shadow: var(--shadow-lg);
  max-height: calc(100dvh - 100%);
  overflow-y: auto; overscroll-behavior: contain;
}
[data-navpanel] a {
  display: flex; align-items: center; min-height: 52px;
  border-top: 1px solid var(--color-divider);
  font-family: var(--font-heading); font-weight: 600; font-size: 16px;
  letter-spacing: 0.06em; text-transform: uppercase;
  text-decoration: none; color: var(--color-text);
}
[data-navpanel] a:first-child { border-top: 0; }
@media (min-width: 1000px) { [data-navbtn], [data-navpanel] { display: none !important; } }

/* The closing form's fields are near-black; its placeholders need the band's ink,
   not the page's. Higher specificity than the bare ::placeholder rule above, so
   order does not matter. */
[data-form="end"]::placeholder { color: color-mix(in srgb, #FAF8F5 62%, transparent); }
/* WCAG 2.2 SC 2.5.8, both layout-neutral — see the note in improveReadability(). */
[data-tap="logo"] { padding-block: 2px; }
[data-tap="footer"] { display: inline-block; }

@media (max-width: 900px) {
  /* The hero reserves 82vh and bottom-aligns ~510px of content inside it, so the
     leftover — 45px at 390x844, 108px at 430x932, 217px at 768x1024 — stacks on
     top of a 93-113px padding and reads as dead space under the header. Both have
     to come down: dropping only the padding hands the space straight back to the
     grid. Carried past 760px because a portrait tablet has the worst of it. */
  [style*="min-height: clamp(600px, 82vh, 880px)"] { min-height: 0 !important; }
  [style*="padding: clamp(88px, 11vh, 150px)"] { padding-top: clamp(28px, 4vh, 44px) !important; }
}

@media (max-width: 760px) {
  /* 13px is the single most common size in the export (67 declarations) and it is
     nearly all uppercase labels tracked at 0.14em; 15px is the body default. */
  [style*="font-size: 13px"] { font-size: 14px !important; }
  [style*="font-size: 15px"] { font-size: 16px !important; }
  /* line-height 12px under a 13px font — a leading smaller than the type. It
     collides with itself the moment the label wraps, which the hero eyebrow does
     on every phone width. */
  [style*="line-height: 12px"] { line-height: 1.35 !important; }
  /* 1.50 is the WCAG 1.4.12 floor, not a comfortable phone measure. Scoped to the
     two body sizes so the 20/24 and 21/24 headings keep their tight leading. */
  [style*="font-size: 15px"][style*="line-height: 24px"],
  [style*="font-size: 16px"][style*="line-height: 24px"] { line-height: 1.6 !important; }
  /* Section padding pins to its 48px floor on a phone (6vw is 23px at 390) while
     the cards inside are padded 24px — so a section boundary reads barely stronger
     than a card edge and the page runs together. */
  [style*="padding: clamp(48px, 6vw, 96px) var(--edge);"] { padding-top: 68px !important; padding-bottom: 68px !important; }
  [style*="padding: clamp(48px, 6vw, 88px)"] { padding-top: 68px !important; }
  [style*="var(--edge) clamp(48px, 6vw, 96px)"] { padding-bottom: 68px !important; }
}
`;

/** Every element that paints its own #141414 background. Tagging them `data-band`
 *  gives the accessibility panel's high-contrast mode a selector that actually
 *  matches — see rewriteA11y() for why the export's own one cannot. */
const DARK_BANDS = [
  ['hero', '<section style="position: relative; isolation: isolate; background: #141414;'],
  ['mission', '<section aria-label="Our mission" style="position: relative; background: #141414;'],
  ['film', '<section id="film" aria-label="Watch the kitchens" style="background: #141414;'],
  ['final CTA', '<section id="tour" style="background: #141414;'],
  ['sticky bar', '<div style="position: fixed; left: 0; right: 0; bottom: 0; z-index: 80;'],
];

/** Returns [before, section, after] split around the section that starts with
 *  `openTag`, so a transform can be scoped to one section. Needed because the pain
 *  cards' markup (`class="blueprint" style="padding: 24px;"`) is byte-identical to
 *  four cards in the unrelated facility section. */
function sectionSlice(html, openTag, label) {
  const i = html.indexOf(openTag);
  if (i === -1 || html.indexOf(openTag, i + 1) !== -1) {
    throw new Error(`[build] ${label}: section anchor is missing or not unique.`);
  }
  const j = html.indexOf('</section>', i);
  if (j === -1) throw new Error(`[build] ${label}: no closing </section>.`);
  return [html.slice(0, i), html.slice(i, j), html.slice(j)];
}

/**
 * Adds the per-item scroll motion and turns the benefits sheet into a dark band.
 *
 * Must run BEFORE stripCornerMarkup: that pass deletes whole lines that held nothing
 * but corner marks, and the pain cards' corner line sits directly under the anchor
 * used here. Must also run before widenDesktopLayout, which counts `max-width: 1240px`
 * across the whole document and expects exactly 18 — the benefits restructure MOVES
 * that declaration onto a new inner div rather than adding one, keeping the count.
 */
function addScrollMotion(html, label) {
  const OPEN_A = '<section aria-label="How it works" style="border-bottom: 1px solid var(--color-divider);">';
  const OPEN_B = '<section data-rev style="max-width: 1240px; margin: 0 auto; padding: clamp(48px, 6vw, 96px) var(--edge);">';
  const OPEN_C = '<section data-rev style="max-width: 1240px; margin: 0 auto; padding: clamp(24px, 3vw, 40px) var(--edge) clamp(48px, 6vw, 96px);">';
  const CARD = '<div class="blueprint" style="padding: 24px;">';
  let out = html;

  // ---- stylesheet: append to the export's own motion block ----
  out = replaceExactly(
    out,
    '[data-marquee-wrap]:hover [data-marquee] { animation-play-state: paused; }\n',
    '[data-marquee-wrap]:hover [data-marquee] { animation-play-state: paused; }\n' + MOTION_CSS + READABILITY_CSS,
    1,
    'motion css'
  );
  out = replaceExactly(
    out,
    '  [data-rev], [data-faq] svg, [data-tab] { transition: none !important; }',
    '  [data-rev], [data-rev-item], [data-step]::after, [data-step] > span[aria-hidden="true"],\n' +
      '  [data-faq] svg, [data-tab] { transition: none !important; }',
    1,
    'reduced-motion list'
  );

  // ---- tag every dark band so high contrast has a selector that matches ----
  for (const [name, anchor] of DARK_BANDS) {
    const tagged = anchor.replace(/^<(section|div)/, (m, t) => `<${t} data-band="dark"`);
    out = replaceExactly(out, anchor, tagged, 1, `dark band: ${name}`);
  }

  // ---- section A: stagger the steps, draw the rail, plant the markers ----
  out = replaceExactly(
    out,
    '<li style="border-top: 1px solid var(--color-divider); padding-top: 16px; position: relative;">',
    '<li data-rev-item data-step style="border-top: 1px solid var(--color-divider); padding-top: 16px; position: relative;">',
    4,
    'how-it-works steps'
  );

  // ---- section B: stagger the pain cards, add the ghosted numeral ----
  // The card markup is byte-identical to four cards in the facility section, so this
  // is scoped to section B and the global count is asserted either side.
  const cardsBefore = (out.match(new RegExp(CARD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (cardsBefore !== 8) {
    throw new Error(`[build] ${label}: expected 8 identical 24px cards, found ${cardsBefore}.`);
  }
  {
    const [pre, sec, post] = sectionSlice(out, OPEN_B, `${label} section B`);
    const parts = sec.split(CARD);
    if (parts.length !== 5) {
      throw new Error(`[build] ${label}: expected 4 pain cards in section B, found ${parts.length - 1}.`);
    }
    let rebuilt = parts[0];
    for (let i = 1; i < parts.length; i++) {
      rebuilt += `<div class="blueprint" data-rev-item data-num="0${i}" style="padding: 24px;">` + parts[i];
    }
    out = pre + rebuilt + post;
  }
  const cardsAfter = (out.match(new RegExp(CARD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (cardsAfter !== 4) {
    throw new Error(`[build] ${label}: expected 4 untouched cards to remain, found ${cardsAfter}.`);
  }

  // ---- section C: dark band, its own eyebrow, row-by-row reveal ----
  {
    const [pre, sec, post] = sectionSlice(out, OPEN_C, `${label} section C`);
    let body = sec.slice(OPEN_C.length);

    // Rows reveal one at a time — the list visibly fills in.
    body = replaceExactly(
      body,
      '<div style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 24px; padding: 18px 24px; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);">',
      '<div data-rev-item style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 24px; padding: 18px 24px; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);">',
      4,
      'benefit rows'
    );
    body = replaceExactly(
      body,
      '<div style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 24px; padding: 18px 24px;">',
      '<div data-rev-item style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 24px; padding: 18px 24px;">',
      1,
      'benefit last row'
    );

    // The section carries no eyebrow of its own, which is why the page's numbered
    // spine reads 01 -> 03 with 02 missing. Give it the 02 slot it already claims
    // inside the frame as "Sheet 02".
    body = replaceExactly(
      body,
      '<div class="blueprint" style="position: relative;">',
      '<span style="display: block; font-size: 13px; line-height: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: var(--color-accent-700); margin-bottom: 12px;">02 &middot; The easy upgrade</span>\n' +
        '      <hr style="height: 1px; border: 0; margin: 0 0 clamp(28px, 4vw, 44px); background: var(--color-divider);" />\n' +
        '      <div class="blueprint" style="position: relative;">',
      1,
      'benefits eyebrow'
    );

    // Full-bleed dark band. max-width and the horizontal padding stay on the SAME
    // element so box-sizing keeps the content box identical to every other section;
    // only the vertical padding moves out to the band. data-rev moves inward too —
    // left on the band it would fade and slide the dark background itself.
    const open =
      '<section data-band="dark" style="background: #141414; padding: clamp(48px, 6vw, 88px) 0; margin-top: clamp(24px, 3vw, 40px);">\n' +
      '    <div data-rev style="max-width: 1240px; margin: 0 auto; padding: 0 var(--edge);">';
    out = pre + open + body + '\n    </div>\n  ' + post;
  }

  return out;
}

/**
 * The readability changes that live in the markup rather than the stylesheet.
 *
 * Runs after addScrollMotion, so the benefits-band restructure is already in place,
 * and before stripCornerMarkup and guardGridMinimums, whose counts are unaffected:
 * moving figures between two grids inside one section changes neither the number of
 * corner marks nor the number of grid minimums.
 */
function improveReadability(html, label) {
  let out = html;

  // ---- contrast: the four fades that fail WCAG AA on the light ground ----
  // Composited over #FAF8F5 the export's muted tiers measure 4.01:1 (55%),
  // 4.42:1 (58%), 4.72:1 (60%) and 5.05:1 (62%) against a 4.5:1 requirement —
  // 19 declarations, all of them `color:`. The four 8% uses are `border-bottom`
  // hairlines and are deliberately untouched; raising those would turn the
  // page's hairlines into rules.
  //
  // They collapse onto one 70% tier (6.66:1) instead of being nudged
  // individually: no reader distinguishes 4.01 from 5.05, and the hierarchy that
  // does carry meaning is the one above — 70 < 72 < 78 < 80 < 86 < 100.
  for (const [pct, n] of [['55', 2], ['58', 12], ['60', 3], ['62', 2]]) {
    out = replaceExactly(
      out,
      `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`,
      'color-mix(in srgb, var(--color-text) 70%, transparent)',
      n,
      `contrast floor ${pct}%`
    );
  }

  // ---- placeholders: a latent trap, not a live bug ----
  // Nothing renders through these rules today — the design gives every field a
  // visible label and sets no placeholder attribute anywhere, which is the better
  // pattern and the reason this went unnoticed. But the export ships a single
  // `::placeholder` rule for the whole site, and the closing form sits on the
  // #141414 band with `background: color-mix(in srgb, #FAF8F5 8%, transparent)` —
  // a field resolving to rgb(38, 38, 38). A 42%-black placeholder over that
  // resolves to rgb(31, 31, 31): 1.06:1, invisible. Adding one placeholder to the
  // page's primary conversion form would have produced exactly that, silently.
  // 64% is 5.12:1 over the light form's --color-surface field, and the dark form
  // gets its own light variant in READABILITY_CSS keyed on the data-form="end"
  // every input in it already carries.
  out = replaceExactly(
    out,
    '::placeholder { color: color-mix(in srgb, #141414 42%, transparent); }',
    '::placeholder { color: color-mix(in srgb, #141414 64%, transparent); }',
    1,
    'placeholder contrast'
  );

  // ---- tap targets ----
  // Two links are under the 24x24 of WCAG 2.2 SC 2.5.8. Both reach it without
  // moving anything, which is why they are fixed here rather than left as a design
  // decision: the header row's height is set by the 52px CTA inside a 68px
  // min-height, and the footer link's paragraph line box is already 24px, so the
  // link only has to fill it.
  out = replaceExactly(
    out,
    '<a href="#top" style="display: flex; align-items: baseline; gap: 8px;',
    '<a href="#top" data-tap="logo" style="display: flex; align-items: baseline; gap: 8px;',
    1,
    'header logo tap target'
  );
  out = replaceExactly(
    out,
    '<p style="margin: 0; font-size: 15px; line-height: 24px;"><a href="#tour">Schedule a tour</a></p>',
    '<p style="margin: 0; font-size: 15px; line-height: 24px;"><a href="#tour" data-tap="footer">Schedule a tour</a></p>',
    1,
    'footer link tap target'
  );

  // ---- reviews: open with three quotes instead of six ----
  // The section shows 6 of 12 and hides the rest behind a "See more reviews"
  // button that already exists, driven by state that already exists. Three of the
  // visible six move into that hidden grid: no new state, no new markup, nothing
  // deleted, and the control's own label already covers both directions. On a
  // phone the grid is one column, so this takes three full cards of near-identical
  // praise out of the scroll — the largest perceived-density win available without
  // touching a word of copy. The 4.9 aggregate and the screenshot marquee, both
  // above it, still carry the proof.
  {
    const GRID = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: clamp(20px, 2.6vw, 32px)';
    const OPEN_VISIBLE = `<div style="${GRID};">`;
    const OPEN_HIDDEN = `<div style="${GRID}; margin-top: clamp(20px, 2.6vw, 32px);">`;
    const FIG = '<figure class="blueprint" style="margin: 0; padding: 22px; display: flex; flex-direction: column; gap: 14px;">';
    const END = '</figure>';

    const total = out.split(FIG).length - 1;
    if (total !== 12) {
      throw new Error(`[build] ${label}: expected 12 testimonial figures, found ${total}.`);
    }
    const iVis = out.indexOf(OPEN_VISIBLE);
    const iHid = out.indexOf(OPEN_HIDDEN);
    if (iVis === -1 || iHid <= iVis || out.indexOf(OPEN_VISIBLE, iVis + 1) !== -1) {
      throw new Error(`[build] ${label}: the two review grids are missing or out of order.`);
    }
    const parts = out.slice(iVis + OPEN_VISIBLE.length, iHid).split(FIG);
    if (parts.length !== 7) {
      throw new Error(`[build] ${label}: expected 6 visible reviews, found ${parts.length - 1}.`);
    }
    // Everything after the sixth </figure> is the grid's own close plus the <sc-if>
    // that opens the hidden half; it has to stay where it is.
    const cut = parts[6].lastIndexOf(END) + END.length;
    const figures = parts.slice(1).map((p, i) => FIG + (i === 5 ? p.slice(0, cut) : p));
    out =
      out.slice(0, iVis + OPEN_VISIBLE.length) +
      parts[0] + figures.slice(0, 3).join('') +
      parts[6].slice(cut) +
      OPEN_HIDDEN + figures.slice(3).join('') +
      out.slice(iHid + OPEN_HIDDEN.length);

    if (out.split(FIG).length - 1 !== 12) {
      throw new Error(`[build] ${label}: a testimonial was lost moving the reviews.`);
    }
  }

  return out;
}

/** The header's five section links, lifted from the desktop <nav> so the two menus
 *  can never drift apart. */
const NAV_LINKS = [
  ['#kitchens', 'Kitchens'],
  ['#included', "What's Included"],
  ['#reviews', 'What Clients Say'],
  ['#locations', 'Locations'],
  ['#faq', 'FAQ'],
];

/**
 * Gives every viewport under 1000px a navigation menu, because none had one.
 *
 * The header's <nav> is wrapped in `<sc-if value="{{ isDesktop }}">` and isDesktop is
 * `matchMedia('(min-width: 1000px)')` — so phones AND portrait tablets rendered no
 * navigation at all, not a collapsed one. This adds the button and the panel, wired
 * through the runtime's own state machine exactly as `moreReviews` is: state,
 * handler, render values, <sc-if>.
 *
 * Two decisions worth keeping:
 *
 * The button is unconditional markup hidden by a media query, not an <sc-if> on a
 * state value. isDesktop starts optimistically `true` and is corrected in
 * componentDidMount, so a state-gated button would blink into existence on every
 * phone load.
 *
 * The panel is `position: absolute`, not another line in the header's flex row. The
 * header is `position: sticky`, and a stuck sticky element still occupies its flow
 * box up-page — so growing it would push the whole document down by the panel's
 * height while the scroll position stayed put, and the content under the reader's
 * thumb would jump.
 */
function addMobileNav(html, label) {
  let out = html;

  // ---- state, handler, render values, and the two places that close it ----
  out = replaceExactly(
    out,
    '      moreReviews: false,',
    '      moreReviews: false, navOpen: false,',
    1,
    'nav state'
  );
  out = replaceExactly(
    out,
    '  toggleReviews = () => this.setState(s => ({ moreReviews: !s.moreReviews }));',
    '  toggleReviews = () => this.setState(s => ({ moreReviews: !s.moreReviews }));\n' +
      '  toggleNav = () => this.setState(s => ({ navOpen: !s.navOpen }));',
    1,
    'nav handler'
  );
  out = replaceExactly(
    out,
    '      toggleReviews: this.toggleReviews,',
    '      toggleReviews: this.toggleReviews,\n' +
      '      navOpen: s.navOpen,\n' +
      '      navClosed: !s.navOpen,\n' +
      '      toggleNav: this.toggleNav,',
    1,
    'nav render values'
  );
  out = replaceExactly(
    out,
    "    this._onKey = (ev) => { if (ev.key === 'Escape' && this.state.a11yOpen) this.setState({ a11yOpen: false }); };",
    "    this._onKey = (ev) => {\n" +
      "      if (ev.key !== 'Escape') return;\n" +
      "      if (this.state.a11yOpen) this.setState({ a11yOpen: false });\n" +
      "      if (this.state.navOpen) this.setState({ navOpen: false });\n" +
      "    };\n" +
      "    // A tap anywhere outside the header closes the menu.\n" +
      "    //\n" +
      "    // Capture phase, deliberately. In the bubble phase this fires after React has\n" +
      "    // already re-rendered — and the button's own click swaps its hamburger icon for\n" +
      "    // a close icon, so ev.target is the <path> that render just detached. closest()\n" +
      "    // on an orphaned node returns null, the header test fails, and the menu closes\n" +
      "    // in the same click that opened it. Running first means the DOM is still intact\n" +
      "    // and this.state is still the pre-click value: the opening click sees navOpen\n" +
      "    // false and bails, and a click on the button while open is inside <header> and\n" +
      "    // bails too, leaving React's own toggle to close it.\n" +
      "    this._onDocClick = (ev) => {\n" +
      "      if (!this.state.navOpen) return;\n" +
      "      if (ev.target && ev.target.closest && ev.target.closest('header')) return;\n" +
      "      this.setState({ navOpen: false });\n" +
      "    };\n" +
      "    document.addEventListener('click', this._onDocClick, true);",
    1,
    'nav escape + outside click'
  );
  // Crossing a breakpoint closes it, so the button's aria-expanded can never disagree
  // with a panel the media query has hidden.
  out = replaceExactly(
    out,
    '    const sync = () => this.setState({\n      isPhone: this._mq.matches,',
    '    const sync = () => this.setState({\n      navOpen: false,\n      isPhone: this._mq.matches,',
    1,
    'nav closes on breakpoint change'
  );
  out = replaceExactly(
    out,
    '    if (this._onKey) window.removeEventListener(\'keydown\', this._onKey);',
    '    if (this._onKey) window.removeEventListener(\'keydown\', this._onKey);\n' +
      '    if (this._onDocClick) document.removeEventListener(\'click\', this._onDocClick, true);',
    1,
    'nav listener cleanup'
  );

  // ---- the button and the panel, in the header ----
  const icon = (paths) =>
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' + paths + '</svg>';
  const button =
    '<button type="button" data-navbtn onClick="{{ toggleNav }}" aria-expanded="{{ navOpen }}" ' +
      'aria-controls="site-nav" aria-label="Menu" class="btn btn-secondary" ' +
      'style="width: 48px; height: 48px; min-height: 48px; padding: 0; flex: none;">\n' +
    '      <sc-if value="{{ navClosed }}" hint-placeholder-val="{{ true }}">' +
      icon('<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>') +
      '</sc-if>\n' +
    '      <sc-if value="{{ navOpen }}">' +
      icon('<path d="M6 6l12 12"></path><path d="M18 6L6 18"></path>') +
      '</sc-if>\n' +
    '    </button>\n';
  const panel =
    '<sc-if value="{{ navOpen }}">\n' +
    '      <nav id="site-nav" data-navpanel aria-label="Sections">\n' +
    NAV_LINKS.map(([href, text]) =>
      `        <a href="${href}" onClick="{{ toggleNav }}">${text}</a>\n`).join('') +
    '      </nav>\n' +
    '    </sc-if>\n';
  const CTA =
    '<a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; ' +
    'letter-spacing: 0.06em; padding: 10px 18px; font-size: 14px; white-space: nowrap;">';
  out = replaceExactly(out, '    ' + CTA, '    ' + button + '    ' + panel + '    ' + CTA, 1, 'nav markup');

  return out;
}

/**
 * Patches the export's runtime: the reveal observer, the sticky CTA, the
 * accessibility sheet, and the hero video's phone gate.
 */
function rewriteRuntime(html, label) {
  let out = html;

  // ---- reveal observer ----
  // Two changes. It now also drives [data-rev-item], which hides via an attribute
  // rather than an inline style so the final state is the default. And it bails when
  // the accessibility panel's Stop motion is already on: that setting is persisted
  // separately from the OS one and applied before setState has landed, so without
  // this the observer hides content the panel's stylesheet then has to fight back
  // into view with !important — and toggling Stop motion off would drop that shield
  // and blank whatever had not been scrolled past yet.
  out = replaceExactly(
    out,
    `    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    // Only hide what is already below the fold, so nothing visible ever flashes
    // and the page reads fine with JS disabled.
    const targets = Array.from(document.querySelectorAll('[data-rev]'))
      .filter(el => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    if (!targets.length) return;
    targets.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; });
    this._io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.style.opacity = '1';
        en.target.style.transform = 'none';
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    targets.forEach(el => this._io.observe(el));`,
    `    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stillOn = false;
    try { stillOn = !!(JSON.parse(localStorage.getItem('on-a11y') || 'null') || {}).still; } catch (err) { /* private mode */ }
    if (reduce || stillOn || !('IntersectionObserver' in window)) return;
    // Only hide what is already below the fold, so nothing visible ever flashes
    // and the page reads fine with JS disabled.
    const below = el => el.getBoundingClientRect().top > window.innerHeight * 0.9;
    const targets = Array.from(document.querySelectorAll('[data-rev]')).filter(below);
    const items = Array.from(document.querySelectorAll('[data-rev-item]')).filter(below);
    if (!targets.length && !items.length) return;
    targets.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; });
    // Stagger across the hidden siblings only. A group that straddles the fold has
    // its first items left visible, so counting all children would leave a hole in
    // the cascade and a dead beat before anything moved.
    const rank = new Map();
    items.forEach(el => {
      const n = rank.get(el.parentElement) || 0;
      rank.set(el.parentElement, n + 1);
      if (n) el.style.transitionDelay = (n * 90) + 'ms';
      el.setAttribute('data-hide', '');
    });
    this._io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        if (en.target.hasAttribute('data-rev-item')) {
          en.target.removeAttribute('data-hide');
        } else {
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
        }
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    targets.concat(items).forEach(el => this._io.observe(el));`,
    1,
    'reveal observer'
  );

  // ---- sticky CTA: on as soon as the visitor scrolls, and on to the end ----
  // Two things were wrong. #hero-sentinel is named for the hero but sits *below* the
  // partners strip and the how-it-works list, so the bar did not appear until ~1350px
  // of scroll — 13% of the page, measured. And `!tourVisible` fought the 76px spacer
  // the fixed bar needs to clear the footer: that spacer is inside the document, so
  // dropping it shortened the page, which moved the scroll position, which moved
  // #tour back across the observer's 0.15 threshold, which put the spacer back. A
  // feedback loop, worst on a short viewport where 76px is a large share of the
  // screen. Measured on the previous build: the document alternated between 15441 and
  // 15517px while scrolling.
  //
  // So: the bar keys off <main> with a small hysteresis, the #tour observer is gone,
  // and the spacer below is unconditional — the document height is now constant.
  // The read stays getBoundingClientRect()-based, which is what the export was
  // reaching for with a sentinel: it does not assume the viewport is the scroller.
  out = replaceExactly(
    out,
    `    const sentinel = document.getElementById('hero-sentinel');
    if (sentinel && 'IntersectionObserver' in window) {
      this._ioHero = new IntersectionObserver(([en]) => {
        const past = !en.isIntersecting && en.boundingClientRect.top < 0;
        if (past !== this.state.scrolled) this.setState({ scrolled: past });
      }, { threshold: 0 });
      this._ioHero.observe(sentinel);
    }
    // belt and braces: the scroll container may be body rather than the viewport
    this._onScroll = () => {
      if (!sentinel) return;
      const past = sentinel.getBoundingClientRect().top < 0;
      if (past !== this.state.scrolled) this.setState({ scrolled: past });
    };
    document.addEventListener('scroll', this._onScroll, { capture: true, passive: true });
    this._onScroll();
    const tour = document.getElementById('tour');
    if (tour && 'IntersectionObserver' in window) {
      this._ioTour = new IntersectionObserver(([en]) => this.setState({ tourVisible: en.isIntersecting }), { threshold: 0.15 });
      this._ioTour.observe(tour);
    }`,
    `    const top = document.getElementById('top');
    let ticking = false;
    const measure = () => {
      ticking = false;
      if (!top) return;
      const y = -top.getBoundingClientRect().top;
      // hysteresis, so a scroll that rests on the boundary cannot chatter
      const past = this.state.scrolled ? y > -16 : y > 8;
      if (past !== this.state.scrolled) this.setState({ scrolled: past });
    };
    this._onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    document.addEventListener('scroll', this._onScroll, { capture: true, passive: true });
    measure();`,
    1,
    'sticky CTA trigger'
  );
  out = replaceExactly(
    out,
    '      showSticky: s.scrolled && !s.tourVisible,',
    '      showSticky: s.scrolled,',
    1,
    'sticky CTA condition'
  );
  out = replaceExactly(
    out,
    '      scrolled: false, tourVisible: false, videoOpen: false,',
    '      scrolled: false, videoOpen: false,',
    1,
    'drop tourVisible state'
  );
  out = replaceExactly(
    out,
    '    if (this._ioTour) this._ioTour.disconnect();\n',
    '',
    1,
    'drop tour observer cleanup'
  );
  // The spacer that keeps the fixed bar off the footer stops being conditional: a
  // document whose height changes with the bar is what made the bar flicker.
  out = replaceExactly(
    out,
    '  <sc-if value="{{ showSticky }}">\n    <div style="height: 76px;"></div>\n  </sc-if>',
    '  <div aria-hidden="true" style="height: 76px;"></div>',
    1,
    'sticky CTA spacer'
  );

  // ---- high contrast: give it a selector that actually matches ----
  // The export's rescue rule keys off [style*="#141414"], but the DC runtime parses
  // every style attribute into a React style object and re-serialises it through
  // CSSOM, so the served DOM says `background: rgb(20, 20, 20)` and that selector
  // matches nothing. The blanket `color: #000000` therefore lands unopposed on every
  // dark section: verified 1.02:1 black-on-black across the hero, the film section
  // and the final CTA today. Keyed on the data-band attribute instead.
  out = replaceExactly(
    out,
    `      '[style*="#FAF8F5"] p, [style*="#141414"] p, [style*="#141414"] li { color: #ffffff !important; }'`,
    `      '[data-band="dark"] { background: #000000 !important; color: #ffffff !important; --color-text: #ffffff; --color-divider: #ffffff; --color-accent-700: #ffffff; }',
      '[data-band="dark"] p, [data-band="dark"] li, [data-band="dark"] dd, [data-band="dark"] dt, [data-band="dark"] span, [data-band="dark"] h1, [data-band="dark"] h2, [data-band="dark"] h3, [data-band="dark"] label, [data-band="dark"] a { color: #ffffff !important; }'`,
    1,
    'high-contrast dark bands'
  );

  // High contrast redefines --color-accent and --color-accent-700 at :root but not
  // -600, which is now what the primary button paints with — so without this the
  // page's main call to action would be the one thing the mode could not reach.
  // #5c4008 is 9.58:1 against the mode's white ground.
  out = replaceExactly(
    out,
    "':root { --color-text: #000000; --color-bg: #ffffff; --color-accent: #6b4409; --color-accent-700: #4a2f06; --color-divider: #000000; }'",
    "':root { --color-text: #000000; --color-bg: #ffffff; --color-accent: #6b4409; --color-accent-600: #5c4008; --color-accent-700: #4a2f06; --color-divider: #000000; }'",
    1,
    'high-contrast accent-600'
  );

  // ---- stop motion: un-hide anything the observer had already staged ----
  // The CSS rescue alone is not enough. It only masks the staged state, so turning
  // Stop motion back OFF drops the mask and re-hides every element the visitor had
  // not yet scrolled past. Clearing the staged state outright and retiring the
  // observer makes the change one-way, so the off path has nothing left to expose.
  out = replaceExactly(
    out,
    `      '[data-rev] { opacity: 1 !important; transform: none !important; }'`,
    `      '[data-rev] { opacity: 1 !important; transform: none !important; }',
      '[data-hide] { opacity: 1 !important; transform: none !important; }'`,
    1,
    'stop-motion rescue'
  );
  out = replaceExactly(
    out,
    `    el.textContent = rules.join('\\n');
    try { localStorage.setItem('on-a11y', JSON.stringify(a)); } catch (err) { /* private mode */ }`,
    `    el.textContent = rules.join('\\n');
    if (a.still) {
      // one-way: drop the staged state so toggling Stop motion off cannot re-hide
      document.querySelectorAll('[data-rev], [data-rev-item]').forEach(node => {
        node.style.opacity = '';
        node.style.transform = '';
        node.style.transitionDelay = '';
        node.removeAttribute('data-hide');
      });
      if (this._io) { this._io.disconnect(); this._io = null; }
    }
    try { localStorage.setItem('on-a11y', JSON.stringify(a)); } catch (err) { /* private mode */ }`,
    1,
    'stop-motion unstage'
  );

  // ---- stop both Vimeo players preloading on every visit ----
  // The raw <x-dc> template is real markup in the document, so the HTML parser
  // reaches its two <iframe src="player.vimeo.com/…"> tags and starts fetching them
  // long before boot() removes the subtree. x-dc{display:none} hides them; it does
  // not stop an iframe loading. The result, measured: two Vimeo player documents
  // requested on every visit, on every device — including phones, where the export
  // deliberately renders only a poster, and including the click-to-play modal that
  // nobody has opened. loading="lazy" suppresses the fetch for markup that is not
  // near the viewport, which covers both template copies, while the real iframes
  // React renders are in view when they mount and so still load normally.
  out = replaceExactly(
    out,
    '<iframe src="https://player.vimeo.com/video/703398003?background=1',
    '<iframe loading="lazy" src="https://player.vimeo.com/video/703398003?background=1',
    1,
    'hero video lazy'
  );
  out = replaceExactly(
    out,
    '<iframe src="https://player.vimeo.com/video/703398003?autoplay=1',
    '<iframe loading="lazy" src="https://player.vimeo.com/video/703398003?autoplay=1',
    1,
    'modal video lazy'
  );

  // ---- hero video on phones ----
  // The export gates the Vimeo background iframe off below 760px. Enabled here, with
  // the one guard the platform actually offers: navigator.connection, read once so a
  // mid-session estimate change cannot swap the iframe in and out. Note this API is
  // absent on Safari/iOS, so iPhones are not covered — see the README.
  out = replaceExactly(
    out,
    `      isPhone: this._mq.matches,`,
    `      isPhone: this._mq.matches,
      cheapNet: (() => {
        const c = navigator.connection || {};
        return !c.saveData && !/^(slow-2g|2g)$/.test(c.effectiveType || '');
      })(),`,
    1,
    'connection probe'
  );
  // Starts false so the Vimeo iframe is never rendered — and never begins fetching —
  // before componentDidMount has actually measured the connection. Left true, the
  // first render requests the player on every device and the data guard only removes
  // it afterwards, which is too late to save the bytes.
  out = replaceExactly(
    out,
    `      isPhone: false, isDesktop: true, reduced: false,`,
    `      isPhone: false, isDesktop: true, reduced: false, cheapNet: false,`,
    1,
    'cheapNet initial state'
  );
  out = replaceExactly(
    out,
    `      showHeroVideo: !s.isPhone && !s.reduced,`,
    `      showHeroVideo: !s.reduced && s.cheapNet,`,
    1,
    'hero video gate'
  );

  return out;
}

/**
 * Widens the page on large desktop screens and centres the closing lead form.
 *
 * The export pins all 18 content wrappers to a flat `max-width: 1240px`. On a 1920px
 * monitor that leaves 340px of dead space either side — 35% of the screen — and 52%
 * at 2560px, while the hero photograph behind it runs edge to edge. The result reads
 * as a narrow column floating on a wide background.
 *
 * The replacement ramps instead of jumping: at 1378px and below `clamp` pins to the
 * old 1240px, so every laptop, tablet and phone layout is untouched and there is no
 * snap while resizing. Above that it tracks 90vw up to a 1760px ceiling — wide
 * enough to use the screen, capped so line lengths stay sane. Body copy is
 * unaffected either way: every paragraph and heading already carries its own `ch`
 * cap (60ch, 46ch, 24ch and so on), so only grids, images and the nav actually grow.
 *
 * The closing form is 760px inside a 1096px panel, sitting hard left with 291px of
 * empty panel to its right. Widening the page would have made that worse, so it is
 * centred in the same pass.
 */
function widenDesktopLayout(html, label) {
  const before = (html.match(/max-width: 1240px/g) || []).length;
  if (before !== 18) {
    throw new Error(`[build] ${label}: expected 18 content wrappers at 1240px, found ${before}.`);
  }
  let out = html.split('max-width: 1240px').join(`max-width: ${CONTENT_MAX}`);

  // The testimonial grid is the one wrapper that must not widen. Its tracks are
  // `auto-fit` over a 280px minimum, so a wider container fits five columns — and
  // the section holds 6 quotes, or 12 once "show more" is open. Five columns leaves
  // a single orphan on the last row in both cases, where three divides both evenly.
  // No `auto-fit` minimum can hold three columns at both 1096px and 1616px of usable
  // width, so the container keeps the width the design was drawn at and centres.
  out = replaceExactly(
    out,
    `max-width: ${CONTENT_MAX}; margin: clamp(40px, 5vw, 64px) auto 0; padding: 0 var(--edge);`,
    `max-width: 1240px; margin: clamp(40px, 5vw, 64px) auto 0; padding: 0 var(--edge);`,
    1,
    'testimonial grid width'
  );

  // The closing form: block-centre it in its panel. Text stays left-aligned.
  out = replaceExactly(
    out,
    `gap: 20px 24px; align-items: start; max-width: 760px;`,
    `gap: 20px 24px; align-items: start; max-width: 760px; margin-inline: auto;`,
    1,
    'closing form centring'
  );
  return { html: out, widened: before };
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
 *  decoration's own rules so no `.corner` selector survives, lifts out the Google
 *  Fonts @import (the built page declares it as a <link> in <head> instead), and
 *  darkens the primary button by one step of its own ramp. `.blueprint`'s border
 *  rule is deliberately left in place.
 *
 *  The button: `#FAF8F5` on `--color-accent` `#B07A1C` measures 3.51:1 against
 *  AA's 4.5:1, on all 11 amber buttons — every "Schedule a Tour", the sticky bar
 *  and the skip link. No new colour was needed. `--color-accent-600` `#96661A` is
 *  4.70:1 and is already the button's own hover value, so rest/hover/active shift
 *  to 600/700/800 and stay inside the palette the design system ships. Nothing
 *  else amber changes: the survey markers, the stars, the rail and the -400
 *  eyebrows on the dark bands all still read `--color-accent`.
 *
 *  These rules live here rather than in the helmet block because the design-system
 *  stylesheet is a <link> in <head> and the helmet <style> lands elsewhere in the
 *  cascade — same specificity, so source order would decide, which is not a thing
 *  to leave to chance for the page's primary call to action. */
function rewriteDesignSystemCss(css) {
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

  // The primary button, one step darker. See the note above the function.
  out = replaceExactly(
    out,
    `.btn-primary { background: var(--color-accent); color: var(--color-bg); }
.btn-primary:hover { background: var(--color-accent-600); }
.btn-primary:active { background: var(--color-accent-700); }`,
    `.btn-primary { background: var(--color-accent-600); color: var(--color-bg); }
.btn-primary:hover { background: var(--color-accent-700); }
.btn-primary:active { background: var(--color-accent-800); }`,
    1,
    'primary button ramp'
  );
  out = replaceExactly(
    out,
    '.btn-primary { border-color: var(--color-accent); }',
    '.btn-primary { border-color: var(--color-accent-600); }',
    1,
    'primary button border'
  );
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

  html = addScrollMotion(html, 'index.html');
  html = improveReadability(html, 'index.html');
  html = addMobileNav(html, 'index.html');
  html = rewriteRuntime(html, 'index.html');

  const stripped = stripCornerMarkup(html, 'index.html');
  const guarded = guardGridMinimums(stripped.html, 'index.html');
  const widened = widenDesktopLayout(guarded.html, 'index.html');
  await writeFile(join(OUT, 'index.html'), widened.html);
  console.log(
    `  index.html      <- ${ENTRY} (+ head fixes, stylesheet hoisted, /thank-you redirect, ` +
      `${stripped.removed} corner marks removed, ${guarded.guarded} grid minimums guarded, ` +
      `${widened.widened} wrappers widened, scroll motion + dark benefits band, contrast floor + mobile type scale, mobile nav + persistent sticky CTA)`
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
    await writeFile(css, rewriteDesignSystemCss(await readFile(css, 'utf8')));
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
