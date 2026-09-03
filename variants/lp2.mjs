/**
 * Page-specific changes for the /lp2 variant.
 *
 * /lp2 is a duplicate of the landing page that exists so changes can be tried on it
 * without touching the page at `/`. Both are built from the same design export
 * through the same pipeline in scripts/build.mjs, so anything fixed for the base
 * page — a bug, a performance change, an accessibility change — reaches /lp2 for
 * free. Everything that should apply to /lp2 ALONE goes in this file, and nothing in
 * this file can affect `/`.
 *
 * `transform` receives the finished HTML — after every shared transform, after the
 * corner strip, the grid guarding and the desktop widening — and returns the HTML to
 * write. Running last is deliberate: what you see here is exactly what ships to `/`,
 * so an override reads as "the live page, then my change", and edits here cannot
 * trip the count assertions the shared passes make against the pristine export.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE DOES, AND WHY
 *
 * The page measured 15,517px tall at 390px — about nineteen phone screens — for
 * 1,095 rendered words. Counting how often each promise is actually stated showed
 * the problem is not volume but repetition: `certified` ×7, `permitting` ×7,
 * `24/7` ×5, `construction` ×4, `hood` ×4, `walk-in` ×4. The middle of the page
 * says five things five times, so the eye never feels it is making progress.
 *
 * So almost everything cut below is already said somewhere else on the page.
 *
 * The hero (617px, with its video) and the reviews section (1,371px) are untouched
 * by instruction — 1,988px locked — which means a 33% cut of the whole page has to
 * come out of the 13,529px that remain, a 38% cut of everything else.
 * ---------------------------------------------------------------------------
 */

/** Section openers, as they appear in the FINISHED html — after widenDesktopLayout
 *  has rewritten `max-width: 1240px` and addScrollMotion has added `data-band`. */
const WIDE = 'max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto;';
const OPEN = {
  partners: '<section aria-label="Our partners" style="border-bottom: 1px solid var(--color-divider); background: var(--color-bg);">',
  howItWorks: '<section aria-label="How it works" style="border-bottom: 1px solid var(--color-divider);">',
  pain: `<section data-rev style="${WIDE} padding: clamp(48px, 6vw, 96px) var(--edge);">`,
  upgrade: '<section data-band="dark" style="background: #141414; padding: clamp(48px, 6vw, 88px) 0; margin-top: clamp(24px, 3vw, 40px);">',
  kitchens: `<section id="kitchens" data-rev style="${WIDE} padding: clamp(48px, 6vw, 96px) var(--edge);">`,
  mission: '<section data-band="dark" aria-label="Our mission" style="position: relative; background: #141414; color: #FAF8F5; overflow: hidden;">',
  included: `<section id="included" data-rev style="${WIDE} padding: clamp(48px, 6vw, 96px) var(--edge);">`,
  tourMid: `<section id="tour-mid" aria-label="Schedule a tour" style="${WIDE} padding: clamp(48px, 6vw, 88px) var(--edge) clamp(16px, 2vw, 24px);">`,
  locations: `<section id="locations" data-rev style="${WIDE} padding: clamp(48px, 6vw, 96px) var(--edge);">`,
  faq: `<section id="faq" data-rev style="${WIDE} padding: clamp(48px, 6vw, 96px) var(--edge);">`,
};

const CLOSE = '</section>';

/** [before, section, after] around the section that starts with `open`, section
 *  inclusive of its closing tag. Throws unless the opener appears exactly once. */
function slice(html, open, label) {
  const i = html.indexOf(open);
  if (i === -1 || html.indexOf(open, i + 1) !== -1) {
    throw new Error(`[lp2] ${label}: section anchor missing or not unique.`);
  }
  // Sections here contain no nested <section>, which the count below asserts.
  const j = html.indexOf(CLOSE, i);
  if (j === -1) throw new Error(`[lp2] ${label}: no closing </section>.`);
  const body = html.slice(i, j + CLOSE.length);
  if (body.includes('<section')  && body.indexOf('<section', 1) !== -1) {
    throw new Error(`[lp2] ${label}: nested <section> — the slice would be wrong.`);
  }
  return [html.slice(0, i), body, html.slice(j + CLOSE.length)];
}

/** Removes a whole section. */
function cut(html, open, label) {
  const [before, , after] = slice(html, open, label);
  return before + after;
}

/** Moves the section at `open` so it sits immediately before the one at `target`. */
function moveBefore(html, open, target, label) {
  const [before, body, after] = slice(html, open, label);
  const rest = before + after;
  const i = rest.indexOf(target);
  if (i === -1 || rest.indexOf(target, i + 1) !== -1) {
    throw new Error(`[lp2] ${label}: destination anchor missing or not unique.`);
  }
  return rest.slice(0, i) + body + '\n\n  ' + rest.slice(i);
}


/** Styling for the components this file introduces. Injected into <head> rather
 *  than written inline on every element: the export writes inline styles because a
 *  design tool generated it, which is not a reason for hand-written markup to. */
const LP2_CSS = `
<style>
/* ---- compact facility list, replacing the four-card "More than a kitchen" ---- */
.lp2-also { margin-top: clamp(30px, 4vw, 44px); border-top: 1px solid var(--color-divider); }
.lp2-also > h3 {
  font-family: var(--font-heading); font-weight: 600; font-size: 13px; line-height: 1.35;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-accent-700);
  margin: 18px 0 4px;
}
.lp2-also dl { margin: 0; display: grid; gap: 0; }
.lp2-also dl > div {
  display: grid; grid-template-columns: minmax(96px, 132px) 1fr; gap: 4px 18px;
  align-items: baseline; padding: 13px 0; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
}
.lp2-also dl > div:last-child { border-bottom: 0; }
.lp2-also dt {
  font-family: var(--font-heading); font-weight: 600; font-size: 15px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.lp2-also dd {
  margin: 0; font-size: 16px; line-height: 26px;
  color: color-mix(in srgb, var(--color-text) 78%, transparent);
}
@media (max-width: 560px) {
  .lp2-also dl > div { grid-template-columns: 1fr; gap: 2px; padding: 11px 0; }
}

/* ---- mid-page CTA strip, replacing the duplicate lead form ---- */
.lp2-cta {
  background: #141414; color: #FAF8F5;
  padding: clamp(34px, 5vw, 56px) 0;
  margin-top: clamp(24px, 3vw, 40px);
}
.lp2-cta > div {
  max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto; padding: 0 var(--edge);
  display: flex; flex-wrap: wrap; align-items: center; gap: 18px 32px;
}
.lp2-cta h2 {
  font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(26px, 3.2vw, 38px); line-height: 1.06; letter-spacing: 0.01em;
  text-transform: uppercase; margin: 0; flex: 1 1 320px; max-width: 20ch;
}
.lp2-cta p {
  margin: 0; flex: 1 1 260px; max-width: 42ch;
  font-size: 16px; line-height: 26px;
  color: color-mix(in srgb, #FAF8F5 80%, transparent);
}
.lp2-cta .btn { flex: none; }

/* ---- locations: the two 300px maps were most of the section ----
   The addresses and the two "Tour X" buttons are what a landing page needs; the
   map is for someone who has already booked. Dropping both also drops two Leaflet
   iframes and the OpenStreetMap tile traffic the README flags as a licensing risk. */
#locations .blueprint { display: none !important; }

/* ---- vertical rhythm: less text needs less scaffolding around it ---- */
section[aria-label="Our partners"] [data-marquee-wrap] {
  padding-top: clamp(16px, 2.4vw, 26px) !important;
  padding-bottom: clamp(18px, 2.8vw, 32px) !important;
}
#tour > div { padding-top: clamp(38px, 5vw, 72px) !important; padding-bottom: clamp(38px, 5vw, 72px) !important; }
/* The base page raised phone section padding from 48px to 68px because the copy was
   dense enough to run together. With a third of it gone the gaps can come back down
   without the sections merging again — 58px is still more than twice the 24px inside
   a card, which is the ratio that made a section break read as a section break. */
@media (max-width: 760px) {
  main [style*="padding: clamp(48px, 6vw, 96px) var(--edge);"],
  main > [style*="padding: clamp(48px, 6vw, 96px) var(--edge);"] { padding-top: 58px !important; padding-bottom: 58px !important; }
  main [style*="padding: clamp(48px, 6vw, 88px)"]:not(#reviews):not(#film) { padding-top: 58px !important; }
  main [style*="var(--edge) clamp(48px, 6vw, 96px)"] { padding-bottom: 58px !important; }
  main [style*="padding: clamp(48px, 6vw, 88px) 0;"] { padding-top: 46px !important; padding-bottom: 46px !important; }
}
footer > div { padding-top: clamp(30px, 4vw, 52px) !important; padding-bottom: clamp(24px, 3vw, 40px) !important; }
footer nav, footer ul { row-gap: 6px !important; }

/* ---- equipment tabs: five buttons wrapped to three rows on a phone ---- */
@media (max-width: 620px) {
  [role="tablist"] {
    flex-wrap: nowrap !important;
    overflow-x: auto; scroll-snap-type: x proximity;
    scrollbar-width: none; margin-inline: calc(var(--edge) * -1) !important;
    padding-inline: var(--edge);
  }
  [role="tablist"]::-webkit-scrollbar { display: none; }
  [role="tablist"] > button { flex: none; scroll-snap-align: start; }
}

/* ---- the partner strip is a trust cue, not a section ---- */
section[aria-label="Our partners"] > div {
  padding-top: clamp(24px, 3vw, 44px) !important;
  padding-bottom: 0 !important;
}

/* ---- swipeable tracks: stacked blocks become one horizontal row on a phone ----
   Five audience rows and four process steps were 1,836px of vertical stacking for
   twelve short sentences. As scroll-snap tracks they are one screen each and the
   reader drives them, which is where the interactivity asked for actually belongs:
   in content they were going to scroll past anyway. CSS only — no new runtime
   state, nothing to go wrong when the DC runtime re-renders. */
@media (max-width: 900px) {
  .lp2-track {
    display: grid !important;
    grid-auto-flow: column; grid-auto-columns: min(80%, 320px);
    overflow-x: auto; scroll-snap-type: x mandatory;
    gap: 12px !important; padding-bottom: 16px !important;
    border-top: 0 !important;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }
  .lp2-track::-webkit-scrollbar { display: none; }
  .lp2-track > * {
    scroll-snap-align: start;
    border: 1px solid var(--color-divider) !important;
    padding: 18px !important;
    margin: 0 !important;
    align-content: start;
  }
  .lp2-track > * > * { max-width: none !important; }
  .lp2-hint { display: block !important; }
}
.lp2-hint {
  display: none;
  font-family: var(--font-heading); font-weight: 600; font-size: 13px;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-accent-700); margin: 10px 0 0;
}
@media (prefers-reduced-motion: reduce) { .lp2-track { scroll-behavior: auto; } }
</style>
`;

export function transform(html, { replaceExactly }) {
  let out = html;

  // The stylesheet for everything this file adds.
  out = replaceExactly(out, '</head>', LP2_CSS + '</head>', 1, 'lp2 stylesheet');

  // ---- 1. the problem comes before the solution -----------------------------
  // "How it works" (the four steps) sat at position 3 and "Why operators call us"
  // (the pain) at position 4 — the process explained before the reader had agreed
  // there was a problem to solve. Swapping them is the cheapest change on the page
  // with the largest effect on how it reads.
  out = moveBefore(out, OPEN.pain, OPEN.howItWorks, 'pain above how-it-works');

  // ---- 2. "Our mission" comes out -------------------------------------------
  // 441px of brand narrative at 30% scroll — the one section on the page that asks
  // nothing of the reader and answers no objection. Its single idea (we have built
  // these kitchens before) already appears in the pain section and in the benefits
  // sheet's Health Department row.
  out = cut(out, OPEN.mission, 'our mission');

  // ---- 3. the facility list folds into the kitchens section ------------------
  // "More than a kitchen" spent 1,174px on four bordered cards holding thirteen
  // tick-marked bullets — 40 words. It answers the same question the kitchens tabs
  // above it answer ("what is in it"), so it does not need a section header, an
  // eyebrow, a rule and its own vertical padding to ask it a second time. The same
  // thirteen facts become four labelled lines at the foot of the kitchens section.
  {
    const [before, , after] = slice(out, OPEN.included, 'included');
    out = before + after;
    const ALSO = [
      ['Access', 'Open 24/7/365 &middot; Free gated parking &middot; Locker rooms &middot; Bathrooms'],
      ['Workspace', 'Office space &middot; Free WiFi &middot; Cold, frozen and dry storage'],
      ['Upkeep', 'Daily cleaning &middot; Laundry room'],
      ['Support', 'Onboarding &middot; Permitting'],
    ];
    const block =
      '<div class="lp2-also">\n' +
      '      <h3>Also included</h3>\n' +
      '      <dl>\n' +
      ALSO.map(([k, v]) => `        <div><dt>${k}</dt><dd>${v}</dd></div>\n`).join('') +
      '      </dl>\n' +
      '    </div>\n\n    ';
    // Ahead of the section's closing note and CTA, so the call to action stays last.
    const NOTE =
      '<div style="margin-top: clamp(32px, 4vw, 48px); padding-top: 24px; ' +
      'border-top: 1px solid var(--color-divider); display: flex; flex-wrap: wrap; ' +
      'gap: 16px; align-items: center; justify-content: space-between;">';
    out = replaceExactly(
      out,
      NOTE,
      block + NOTE,
      1,
      'also-included block'
    );
  }

  // ---- 4. the duplicate mid-page form becomes a CTA strip --------------------
  // tour-mid carried a second copy of the whole lead form — 1,142px, four fields,
  // the same headline promise as the closing form. One form on a landing page is
  // enough; what the middle of the page needs is a way in, not a second identical
  // ask. It also moves up to sit before the film section, which brings the first
  // conversion point from 72% of the scroll to roughly half.
  {
    const [before, , after] = slice(out, OPEN.tourMid, 'tour-mid');
    out = before + after;
    const strip =
      '<section class="lp2-cta" data-band="dark" data-rev aria-label="Schedule a tour">\n' +
      '    <div>\n' +
      '      <h2>Seen enough? Come see it in person.</h2>\n' +
      '      <p>Sizes, terms and pricing are all covered on the tour.</p>\n' +
      '      <a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 28px; min-height: 52px;">Schedule a Tour</a>\n' +
      '    </div>\n' +
      '  </section>\n\n  ';
    const FILM = '<section data-band="dark" id="film" aria-label="Watch the kitchens"';
    out = replaceExactly(out, FILM, strip + FILM, 1, 'mid CTA strip');
  }

  // ---- 5. the FAQ stops re-answering the page --------------------------------
  // Four of the eight questions were answered above them: what is included (the
  // tabs and the list added in step 3), permitting (the fix section), where you
  // are (the locations section) and night access (24/7, stated five times). Cutting
  // all four leaves four questions that each remove a real objection —
  // and the one people actually open the FAQ for, "What does it cost?", moves from
  // last to first instead of sitting at 83% of the scroll.
  {
    const ITEM = '<div style="border-bottom: 1px solid var(--color-divider);">';
    const [before, sec, after] = slice(out, OPEN.faq, 'faq');
    const parts = sec.split(ITEM);
    if (parts.length !== 9) {
      throw new Error(`[lp2] faq: expected 8 questions, found ${parts.length - 1}.`);
    }
    // parts[1..8] are the questions in page order; the tail after the eighth is the
    // list's own closing markup and has to stay put.
    const last = parts[8];
    const endsAt = last.lastIndexOf('</div>\n      </div>');
    if (endsAt === -1) throw new Error('[lp2] faq: could not find the end of the last question.');
    const tail = last.slice(endsAt + '</div>\n      </div>'.length);
    const items = parts.slice(1).map((p, i) => ITEM + (i === 7 ? last.slice(0, endsAt + '</div>\n      </div>'.length) : p));
    //           cost   size   private/hourly   what you need
    const keep = [7,     0,     1,               6];
    out = before + parts[0] + keep.map(i => items[i]).join('') + tail + after;
  }

  // ---- 6. the benefits sheet drops from five rows to three -------------------
  // Rows 04 and 05 said one thing twice — "our team handles zoning, permitting and
  // city regulations" and "a certified space and a team that has built these
  // kitchens before makes Health Department approval a far shorter conversation":
  // 37 words, one promise. `permitting` appears seven times on the page. Row 01
  // also restates the pain section's fourth card almost word for word. So the sheet
  // keeps the two facts stated only here, plus one merged row for the paperwork.
  {
    const ROW = '<div data-rev-item style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 24px; padding: 18px 24px; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);">';
    const [before, sec, after] = slice(out, OPEN.upgrade, 'benefits sheet');
    const parts = sec.split(ROW);
    if (parts.length !== 5) {
      throw new Error(`[lp2] benefits sheet: expected 4 bordered rows, found ${parts.length - 1}.`);
    }
    // parts[4] holds row 04's content, then the unbordered fifth row, then the
    // section's own closing markup — so it is split at the fifth row's opener
    // rather than dropped, or the </section> would go with it.
    const LAST = '<div data-rev-item style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 24px; padding: 18px 24px;">';
    const k = parts[4].indexOf(LAST);
    if (k === -1) throw new Error('[lp2] benefits sheet: the unbordered fifth row is missing.');
    // Keep bordered rows 02 and 03, then the fifth row, which becomes the merged
    // paperwork row below. Rows 01 and 04 go.
    let band = parts[0] + ROW + parts[2] + ROW + parts[3] + parts[4].slice(k);

    // Everything below is scoped to this section, where the numerals are unique.
    band = replaceExactly(band, 'Health Department assistance', 'Permitting &amp; Health Department', 1, 'merged row title');
    band = replaceExactly(
      band,
      'A certified space and a team that has built these kitchens before makes Health Department approval a far shorter conversation.',
      'Zoning, permitting and Health Department approval &mdash; handled. You don&rsquo;t learn the municipal code to sell food.',
      1,
      'merged row body'
    );
    band = replaceExactly(band, '>02</span>', '>01</span>', 1, 'renumber row 1');
    band = replaceExactly(band, '>03</span>', '>02</span>', 1, 'renumber row 2');
    band = replaceExactly(band, '>05</span>', '>03</span>', 1, 'renumber row 3');
    out = before + band + after;
  }

  // ---- 7. the maps come out of the markup, not just out of sight -------------
  // Hiding them with CSS left two Leaflet iframes in the document. Removing the
  // markup removes the tile traffic with it — which the README flags as a
  // licensing risk on OpenStreetMap's public servers for commercial use.
  {
    const MAP = /<div class="blueprint" style="margin-bottom: 22px;">\s*<iframe[\s\S]*?<\/iframe>\s*<\/div>\s*/g;
    const found = (out.match(MAP) || []).length;
    if (found !== 2) throw new Error(`[lp2] locations: expected 2 maps, found ${found}.`);
    out = out.replace(MAP, '');
  }

  // ---- 8. two stacked lists become swipeable tracks --------------------------
  // The five "Who it's for" rows and the four process steps were the page's two
  // tallest pieces of pure stacking. Turning them into scroll-snap tracks is the
  // one place on this page where interactivity earns its keep: it shortens the
  // scroll AND gives the reader something to do with content they were going to
  // pass anyway. See the .lp2-track rules above for why this is CSS only.
  {
    out = replaceExactly(
      out,
      '<dl style="margin: 0; border-top: 1px solid var(--color-divider);">',
      '<dl class="lp2-track" style="margin: 0; border-top: 1px solid var(--color-divider);">',
      1,
      'who-it-is-for track'
    );
    out = replaceExactly(
      out,
      '<ol style="list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: clamp(24px, 3vw, 40px);">',
      '<ol class="lp2-track" style="list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: clamp(24px, 3vw, 40px);">',
      1,
      'how-it-works track'
    );
    // A track that scrolls sideways has to say so, or half the readers never find
    // the other four cards. Three <dl>s exist on the page, so the hint is anchored
    // to the close of the one just tagged rather than to '</dl>'.
    {
      const i = out.indexOf('<dl class="lp2-track"');
      const j = out.indexOf('</dl>', i);
      if (i === -1 || j === -1) throw new Error('[lp2] who-it-is-for: track not found.');
      const at = j + '</dl>'.length;
      out = out.slice(0, at) + '\n        <p class="lp2-hint">Swipe for more &rarr;</p>' + out.slice(at);
    }
  }

  // ---- 9. the pain cards become the third track ------------------------------
  // Four problem statements stacked to 1,315px. As a track the reader swipes
  // through them and stops at the one that is about them, which is what this
  // section is for; the three tracks also give the page one consistent gesture
  // instead of three different ways of presenting a short list.
  out = replaceExactly(
    out,
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: clamp(24px, 3vw, 40px);">',
    '<div class="lp2-track" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: clamp(24px, 3vw, 40px);">',
    1,
    'pain track'
  );
  {
    const i = out.indexOf('<div class="lp2-track" style="display: grid');
    const j = out.indexOf('</section>', i);
    out = out.slice(0, j) + '  <p class="lp2-hint">Swipe for more &rarr;</p>\n  ' + out.slice(j);
  }

  // ---- 10. the copy stops repeating itself -----------------------------------
  // Each of these said something the reader had already been told. The full
  // equipment list is in the tabs directly below the first one; the five
  // categories cut from the second are the five tab labels on the next line.
  const TRIMS = [
    [
      'Hood, three-compartment sink, walk-in, dish pit, loading dock. Everything a production kitchen runs on, none of it on your balance sheet.',
      'Hood, walk-in, dish pit, dock &mdash; everything a production kitchen runs on, none of it on your balance sheet.',
      'pain 02',
    ],
    [
      'Every kitchen is a self-contained certified unit — cooking, sanitation, cold chain, utilities and a loading area, behind your own door. Here is what is in it.',
      'A certified unit behind your own door. Here is what is in it.',
      'kitchens intro',
    ],
    [
      "Volume is outrunning your range and your fridge — and the accounts you want next won't take product from a residential address.",
      'Your range and your fridge are the ceiling &mdash; and the accounts you want next won&rsquo;t buy from a home address.',
      'pain 01',
    ],
    [
      'Move delivery production into its own kitchen and give the line back to the guests sitting in front of you.',
      'Move delivery into its own kitchen and give the line back to the guests in front of you.',
      'pain 03',
    ],
    [
      'No build-out, no contractor timeline, no construction capital. Start in a kitchen that is already standing and already certified.',
      'No build-out, no contractor, no construction capital. Start in a kitchen that is already standing.',
      'pain 04',
    ],
    [
      "Walk the space with your menu and your volume. We'll tell you which kitchen fits.",
      'Bring your menu and your volume. We&rsquo;ll tell you which kitchen fits.',
      'kitchens note',
    ],
    [
      'A short look inside — the line, the walk-ins, the loading area and the people already cooking here.',
      'A short look inside &mdash; the line, the walk-ins, and the people already cooking here.',
      'film intro',
    ],
  ];
  for (const [from, to, label] of TRIMS) {
    out = replaceExactly(out, from, to, 1, `copy: ${label}`);
  }

  // ---- 11. the repeats themselves --------------------------------------------
  // Cutting sections shortened the page but left the duplicated *phrases*, which is
  // what made it read as going in circles. Each line below repeats something the
  // reader has already been given, so it keeps only what is new about it: the two
  // location lines both restated 24/7 and free parking, which the facility list two
  // sections earlier already covers, and only the last item on each line actually
  // distinguishes one site from the other.
  const DEDUPE = [
    ['Open 24/7/365 · Free gated parking · Two loading docks', 'Two loading docks', '24/7 in Van Nuys'],
    ['Open 24/7/365 · Free gated parking · Food delivery pickup area', 'Food delivery pickup area', '24/7 in LA'],
    ['Onboarding, permitting, Health Department support.', 'We handle the paperwork.', 'permitting in step 03'],
    ['Hood capacity sized for real production, with the extraction and cooling to keep the room workable through a full service.',
     'Sized for real production, and the cooling to keep the room workable through a full service.', 'hood in the tab intro'],
    ['A production kitchen and a dedicated driver pickup area, with no dining room to pay for.',
     'A production kitchen and a driver pickup area, with no dining room to pay for.', 'delivery-only'],
    ['Cold storage, dock access and 24-hour entry for the night before a 300-cover event.',
     'Cold storage and dock access the night before a 300-cover event.', 'caterers'],
    ['A certified address, onboarding and permitting support, and no construction between you and your first order.',
     'A certified address and nothing to build between you and your first order.', 'food entrepreneurs'],
    ['Walk-in cooler and freezer, dishwashing area and the counter space a batch week actually needs.',
     'Cooler, freezer and the counter space a batch week actually needs.', 'meal prep'],
    ['A second kitchen for prep, catering or delivery volume, without a second lease on a storefront.',
     'A second kitchen for prep or delivery, without a second lease.', 'growing restaurants'],
  ];
  for (const [from, to, label] of DEDUPE) {
    out = replaceExactly(out, from, to, 1, `dedupe: ${label}`);
  }

  return out;
}
