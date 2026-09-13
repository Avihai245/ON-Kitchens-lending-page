/**
 * The shortened, redesigned page — what ships at `/`.
 *
 * `/lp` is the original, kept at a secondary URL so nothing that already linked to it
 * breaks; it gets nothing from this file. Both pages are built from the same design
 * export through the same pipeline in scripts/build.mjs, so anything fixed for the
 * shared pipeline — a bug, a performance change, an accessibility change — reaches
 * both without being written twice. Everything below is what makes `/` diverge from
 * `/lp`, and nothing in this file can affect `/lp`.
 *
 * `transform` receives the finished HTML — after every shared transform, after the
 * corner strip, the grid guarding and the desktop widening — and returns the HTML to
 * write. Running last is deliberate: what you see here is exactly what ships to `/`,
 * so an override reads as "the shared page, then my change", and edits here cannot
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
  reviews: '<section id="reviews" data-rev style="padding: clamp(48px, 6vw, 88px) 0 clamp(40px, 5vw, 64px);">',
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

/** Puts the swipe hint immediately after the element opened by `open` and closed by
 *  the first `close` that follows it — safe only for elements with no nesting of
 *  that tag, which every caller below asserts by construction. The hint is hidden
 *  by CSS above the phone breakpoint, so it speaks only where the row scrolls. */
function hintAfter(html, open, close, label, cls = '') {
  const i = html.indexOf(open);
  if (i === -1 || html.indexOf(open, i + 1) !== -1) {
    throw new Error(`[lp2] ${label}: hint anchor missing or not unique.`);
  }
  const j = html.indexOf(close, i);
  if (j === -1) throw new Error(`[lp2] ${label}: no ${close} after the anchor.`);
  const at = j + close.length;
  return html.slice(0, at) +
    `\n      <p class="lp2-hint${cls ? ' ' + cls : ''}">Swipe for more &rarr;</p>` +
    html.slice(at);
}


/** Styling for the components this file introduces. Injected into <head> rather
 *  than written inline on every element: the export writes inline styles because a
 *  design tool generated it, which is not a reason for hand-written markup to. */
const LP2_CSS = `
<style>
/* ---- compact facility list, replacing the four-card "More than a kitchen" ---- */
.lp2-also { margin-top: clamp(18px, 2.6vw, 32px); border-top: 1px solid var(--color-divider); }
.lp2-also > h3 {
  font-family: var(--font-heading); font-weight: 600; font-size: 13px; line-height: 1.35;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-accent-700);
  margin: 18px 0 4px;
}
.lp2-also dl { margin: 0; display: grid; gap: 0; }
.lp2-also dl > div {
  display: grid; grid-template-columns: minmax(96px, 132px) 1fr; gap: 4px 18px;
  align-items: baseline; padding: 10px 0; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
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
  .lp2-also dl > div { grid-template-columns: 1fr; gap: 2px; padding: 9px 0; }
}

/* A 56px gap ahead of a one-line note and its button was more air than the note
   is worth, and it sits directly under the list above. */
#kitchens [style*="border-top: 1px solid var(--color-divider); display: flex"] {
  margin-top: 20px !important; padding-top: 16px !important;
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

/* ---- the mid-page lead form ----
   Dark, because #tour at the foot of the page is dark and this is the same ask; the
   site already reads a dark band as "a form you are meant to fill in". It also
   continues the black of the .lp2-could photograph directly above, so the picture and
   the ask land as one block before handing off to the light reviews below.

   Two columns on desktop deliberately. The export's own mid-page form was 1,142px of
   stacked fields, which is most of a viewport spent on a second copy of the closing
   ask; side by side it costs about a third of that, and the copy stays beside the
   fields where it can still do some work. Below 760px — the same breakpoint the rest
   of the page turns on — it stacks. */
.lp2-mid {
  background: #141414; color: #FAF8F5;
  padding: clamp(40px, 5.5vw, 72px) 0;
}
.lp2-mid > div {
  max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto; padding: 0 var(--edge);
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px clamp(40px, 6vw, 88px);
  align-items: start;
}
.lp2-mid-eyebrow {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--color-accent); margin-bottom: 14px;
}
.lp2-mid h2 {
  font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(28px, 3.4vw, 42px); line-height: 1.06; letter-spacing: 0.01em;
  text-transform: uppercase; margin: 0; max-width: 16ch;
}
.lp2-mid p {
  margin: 18px 0 0; max-width: 46ch;
  font-size: 16px; line-height: 26px;
  color: color-mix(in srgb, #FAF8F5 82%, transparent);
}
.lp2-mid ul {
  list-style: none; margin: 26px 0 0; padding: 18px 0 0;
  border-top: 1px solid color-mix(in srgb, #FAF8F5 30%, transparent);
  display: flex; flex-wrap: wrap; gap: 10px 26px;
  font-family: var(--font-heading); font-weight: 600; font-size: 15px;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: color-mix(in srgb, #FAF8F5 82%, transparent);
}
.lp2-mid form { display: grid; gap: 16px; }
.lp2-mid label {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 13px; line-height: 1.35; letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 6px;
}
.lp2-mid label i {
  font-style: normal; font-weight: 400; letter-spacing: 0.04em;
  /* 82% of #FAF8F5 on #141414 clears AA for this size; the modal's 70%-of-text value
     is tuned for a light panel and would not. */
  color: color-mix(in srgb, #FAF8F5 82%, transparent);
}
.lp2-mid .input {
  min-height: 48px; font-size: 16px; width: 100%; box-sizing: border-box;
  background: #FAF8F5; color: #141414;
}
.lp2-mid button[type="submit"] {
  width: 100%; min-height: 52px; margin-top: 4px;
  text-transform: uppercase; letter-spacing: 0.06em; font-size: 16px;
}
@media (max-width: 760px) {
  .lp2-mid > div { grid-template-columns: 1fr; gap: 26px; }
  .lp2-mid h2 { max-width: none; }
  .lp2-mid ul { margin-top: 20px; }
}

/* ---- the sticky bar stands down while this form is on screen ----
   On a phone the bar covers the bottom ~76px of the viewport, which is exactly where
   the submit button sits while someone is filling the form in. Worse than covering it:
   the bar's own "Schedule a Tour" opens the modal, so a thumb aiming for BOOK MY TOUR
   can land on a control that throws a third form over the one being typed into.

   Hidden with CSS, not by unmounting it. The export used to drop the bar when #tour was
   visible and that caused a documented feedback loop — the bar's in-flow spacer changed
   the document height, which moved the scroll position, which re-crossed the observer
   threshold. Here the bar is position:fixed and the spacer is untouched, so visibility
   costs no layout at all and the loop cannot come back. pointer-events goes too, or an
   invisible bar would still swallow the tap. */
html[data-lp2-atform] [data-band="dark"][style*="position: fixed; left: 0px; right: 0px; bottom: 0px"] {
  opacity: 0; pointer-events: none;
}
/* The chat launcher goes with it, on phones only. Measured at 320 and 390: with the
   button near the foot of the viewport the two floating launchers cover 21-32% of its
   width — its ends, not its middle, so it stays tappable, and five of six scroll
   positions are completely clear. Worth fixing anyway for the chat, because it is a
   competing lead path sitting on top of a lead form, which is the same objection as the
   sticky bar. The accessibility launcher stays: hiding an accessibility affordance to
   tidy a layout is the wrong trade, and on the left it clips the button's edge only. */
@media (max-width: 760px) {
  html[data-lp2-atform] .on-chat-fab { opacity: 0; pointer-events: none; }
}

/* ---- locations: the two 300px maps were most of the section ----
   The addresses and the two "Tour X" buttons are what a landing page needs; the
   map is for someone who has already booked. Dropping both also drops two Leaflet
   iframes and the OpenStreetMap tile traffic the README flags as a licensing risk.
   The map's markup is removed outright below (step 7), not just hidden — so there
   is no CSS rule here for it. There used to be one: #locations .blueprint set to
   display: none !important, meant for the map's own wrapper. But "Tour Van
   Nuys" and "Tour Los Angeles" carry .blueprint too — it is this page's generic
   hairline-border utility, not a map-specific hook — and with the map's wrapper
   gone, that rule's only remaining target was the two buttons this section exists
   to show. A real, currently-shipping bug, found while widening this section's
   columns: both buttons rendered at display: none, unclickable, invisible. */

/* ---- locations: side by side on a phone, not stacked ----
   Each card is a name, two address lines and one button — short enough that forcing
   the pair onto one row roughly halves the section's height on a phone, which is where
   a stacked pair costs the most scroll. The trade is the longer address line wrapping
   to two lines and the button losing some of its horizontal padding; both are cheap
   against the height this section was taking. */
@media (max-width: 760px) {
  #locations > div[style*="grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr))"] {
    grid-template-columns: 1fr 1fr !important;
    gap: 20px !important;
  }
  #locations h3 { font-size: 21px !important; line-height: 24px !important; }
  #locations address { font-size: 15px !important; line-height: 22px !important; }
  #locations .btn { padding: 12px 14px !important; font-size: 13px !important; }
}

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

/* ---- the lead modal ----
   Every CTA on the page was an anchor to the closing form: a scroll, a re-orientation
   and a second decision before anyone could type. The modal puts the form under the
   button that was clicked. Open state lives in a data attribute on <html>, never on a
   React-managed node — the DC runtime re-renders on every scroll threshold, and the
   documentElement is the one place it cannot reach. Centred panel on a desktop,
   bottom sheet below 760px: a side drawer would collide with the sticky CTA on the
   bottom edge and the accessibility panel bottom-right. */
.lp2-modal { display: none; }
html[data-lp2-modal] .lp2-modal { display: block; position: fixed; inset: 0; z-index: 200; }
html[data-lp2-modal] body { overflow: hidden; }
.lp2-modal-back { position: absolute; inset: 0; background: color-mix(in srgb, #141414 76%, transparent); }
.lp2-modal-panel {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 32px));
  max-height: min(88dvh, 760px); overflow-y: auto; overscroll-behavior: contain;
  background: var(--color-bg); color: var(--color-text);
  /* The hairline is drawn here rather than by adding .blueprint: that class also sets
     position: relative, which beat this rule's position: absolute and left the panel
     sitting in the flow at content height instead of filling the sheet. */
  border: 1px solid var(--color-divider);
  padding: clamp(22px, 3vw, 32px); box-shadow: var(--shadow-lg);
}
.lp2-modal-x {
  position: absolute; top: 8px; right: 8px;
  width: 44px; height: 44px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  background: none; border: 0; cursor: pointer; color: var(--color-text);
}
.lp2-modal-x:hover { color: var(--color-accent-700); }
.lp2-modal-eyebrow {
  display: block; font-size: 13px; line-height: 1.35; letter-spacing: 0.14em;
  text-transform: uppercase; font-weight: 600; color: var(--color-accent-700);
  margin: 0 44px 10px 0;
}
.lp2-modal-panel h2 {
  font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(24px, 4.4vw, 30px); line-height: 1.08; letter-spacing: 0.01em;
  text-transform: uppercase; margin: 0 0 10px;
}
.lp2-modal-panel > p {
  margin: 0 0 20px; font-size: 16px; line-height: 26px;
  color: color-mix(in srgb, var(--color-text) 78%, transparent);
}
.lp2-modal-panel form { display: grid; gap: 14px; }
.lp2-modal-panel label {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 13px; line-height: 1.35; letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 6px;
}
.lp2-modal-panel label i {
  font-style: normal; font-weight: 400; letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
}
.lp2-modal-panel .input { min-height: 48px; font-size: 16px; }
.lp2-err {
  margin: 6px 0 0; font-size: 13px; line-height: 18px; color: var(--color-accent-700);
}
.lp2-err:empty { display: none; }
/* The honeypot. Taken out of flow and parked off-screen rather than display:none or
   visibility:hidden, both of which the more careful bots test for before filling a
   field. Nothing here is reachable: aria-hidden keeps it out of the accessibility
   tree and tabindex="-1" keeps it out of the tab order, so no real visitor can put a
   value in it and a submission that has one did not come from a person. */
.lp2-hp {
  position: absolute; left: -9999px; top: auto;
  width: 1px; height: 1px; overflow: hidden;
}
.lp2-modal-panel button[type="submit"] {
  margin-top: 4px; width: 100%; min-height: 52px;
  text-transform: uppercase; letter-spacing: 0.06em; font-size: 16px;
}
/* A bottom sheet on a phone, not a takeover. The panel used to be inset: 0 — edge
   to edge, the page gone behind it — so the only way back was a 44px X in the
   corner and nothing on screen said the site was still there. Capped at 86dvh it
   leaves a band of the dimmed page above it, which is both the signal that the
   page is still there and the tap target that closes the form: the backdrop
   handler already closes on any click outside the panel, there was simply no
   backdrop left to click. */
@media (max-width: 760px) {
  .lp2-modal-panel {
    left: 0; right: 0; top: auto; bottom: 0; transform: none;
    width: auto; max-height: 86dvh; padding: 20px 20px 28px;
  }
}
@media (prefers-reduced-motion: reduce) { .lp2-modal-panel { scroll-behavior: auto; } }

/* ---- hero social proof ----
   The 4.9 / 380+ rating sat at ~55% of the scroll inside the reviews section, so a
   first-time visitor never saw it before deciding whether to keep reading. This is the
   same block the reviews section uses, at a smaller size, directly under the CTA — small
   enough not to compete with a clamp(44px, 6.4vw, 88px) headline and a 52px button.
   The stars take --color-accent-400 #D9AB56, not --color-accent #B07A1C: the hero is a
   dark band, where the darker amber measures 2.0:1 and #D9AB56 measures 8.7:1. It is
   also the accent the hero already uses for "No waiting." */
.lp2-rating {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin: 18px 0 0;
}
.lp2-rating .stars { display: flex; gap: 3px; }
.lp2-rating .stars svg { display: block; }
.lp2-rating b {
  font-family: var(--font-heading); font-weight: 600; font-size: 17px;
  line-height: 1; letter-spacing: 0.02em; color: #FAF8F5;
}
.lp2-rating span {
  font-size: 15px; line-height: 1.2;
  color: color-mix(in srgb, #FAF8F5 80%, transparent);
}

/* ---- the "this could be you" band ----
   The annotations are burned into the photograph, so the band carries no copy of its
   own: a section heading above it would compete with THIS COULD BE YOU set inside it.
   Full-bleed on a phone, capped at the file's own 1200px above that — stretched to the
   page's 1760px content width it visibly softens, and this is the one image that cannot
   afford to look cheap. */
/* Flush against its neighbours: a full-bleed image does not also need a full
   section's padding above and below it — the picture is its own separator. */
.lp2-could { display: block; margin: -28px 0; background: #141414; }
.lp2-could img {
  display: block; width: 100%; height: auto;
  max-width: 1200px; margin: 0 auto;
}

/* ---- the edge fade, shared by every horizontal scroller on the page ----
   A row that runs past the screen has to say so. The partner marquee already
   solved this on this page — it fades its own edges with a mask — so the tab row
   and the swipe tracks reuse the idiom rather than inventing an arrow. Right edge
   only: at rest there is nothing hidden to the left, and a fade on both sides
   would suggest there is. */
:root { --lp2-edge-fade: linear-gradient(to right, #000 calc(100% - 52px), transparent); }

/* ---- equipment tabs: five buttons wrapped to three rows on a phone ----
   Measured at 390px the row is 787px of buttons in a 390px box: 397px of it — half
   the categories — sat past the right edge with no scrollbar (deliberately), no
   sliced button and no hint. It scrolled; nothing said so. */
@media (max-width: 760px) {
  [role="tablist"] {
    flex-wrap: nowrap !important;
    overflow-x: auto; scroll-snap-type: x proximity;
    scrollbar-width: none; margin-inline: calc(var(--edge) * -1) !important;
    padding-inline: var(--edge);
    -webkit-mask-image: var(--lp2-edge-fade); mask-image: var(--lp2-edge-fade);
    /* the hint takes over the gap the row already reserved below itself, so the
       affordance costs the page about eight pixels rather than a whole line */
    margin-bottom: 8px !important;
  }
  [role="tablist"]::-webkit-scrollbar { display: none; }
  [role="tablist"] > button { flex: none; scroll-snap-align: start; }
  .lp2-hint-tabs { margin-bottom: clamp(18px, 2.4vw, 28px); }
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
@media (max-width: 760px) {
  .lp2-track {
    display: grid !important;
    grid-auto-flow: column; grid-auto-columns: min(80%, 320px);
    overflow-x: auto; scroll-snap-type: x proximity;
    gap: 12px !important; padding-bottom: 16px !important;
    border-top: 0 !important;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-mask-image: var(--lp2-edge-fade); mask-image: var(--lp2-edge-fade);
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

  /* ---- the scroll reveal does not run inside a track ----
     The reveal hides everything below the fold and un-hides it when it crosses
     the VIEWPORT. A card parked off the right edge of a track never crosses it,
     so on a phone two of the four pain cards and two of the four process steps
     stayed at opacity 0 for the whole visit — measured after scrolling the page
     end to end — and then slid up from 18px below, on a 90ms stagger, under the
     reader's thumb the moment a swipe brought them in. That is the "dancing".
     Inside a track the swipe is the reveal, so the entrance is dropped: the
     section around it still fades in, and above 760px, where these are ordinary
     grids again, the reveal runs exactly as it does on the base page. */
  .lp2-track [data-rev-item],
  .lp2-track [data-rev-item][data-hide] { opacity: 1 !important; transform: none !important; }
  .lp2-track [data-step][data-hide]::after,
  .lp2-track [data-step][data-hide] > span[aria-hidden="true"] { transform: none !important; }
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

/** The modal's behaviour. Delegated on `document` throughout, because the DC runtime
 *  re-renders the whole tree on every scroll threshold and per-element listeners would
 *  be attached to nodes React can replace. Same reasoning — and the same capture-phase
 *  care — as the mobile menu's outside-click handler. */
const LP2_MODAL_JS = String.raw`
<script>
(function () {
  var root = document.documentElement;
  var opener = null;

  function openModal(from) {
    opener = from || null;
    root.setAttribute('data-lp2-modal', '');
    // Set here, not just in the markup. type="email" with a malformed address makes
    // the browser refuse to fire submit at all, so the handler below never runs and
    // the reader gets a native bubble instead of the message the rest of the page
    // uses. The markup carries noValidate too, but the DC runtime rewrites attributes
    // through React and this is the one that cannot be allowed to go missing.
    var form = document.getElementById('lp2-form');
    if (form) form.noValidate = true;
    var first = document.getElementById('lp2-name');
    if (first) setTimeout(function () { first.focus(); }, 0);
  }
  function closeModal() {
    if (!root.hasAttribute('data-lp2-modal')) return;
    root.removeAttribute('data-lp2-modal');
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  // Every CTA on the page is an <a href="#tour">, the sticky bar's included, so one
  // delegated handler covers all of them and anything added later. preventDefault only
  // fires once the modal is actually going to open, so with JS off every CTA is still
  // an anchor to a working form at the foot of the page.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-lp2-close]')) { ev.preventDefault(); closeModal(); return; }
    var cta = t.closest('a[href="#tour"]');
    if (cta) { ev.preventDefault(); openModal(cta); return; }
    if (root.hasAttribute('data-lp2-modal') && !t.closest('[data-lp2-panel]')) closeModal();
  });

  document.addEventListener('keydown', function (ev) {
    if (!root.hasAttribute('data-lp2-modal')) return;
    if (ev.key === 'Escape') { ev.stopPropagation(); closeModal(); return; }
    if (ev.key !== 'Tab') return;
    var panel = document.querySelector('[data-lp2-panel]');
    if (!panel) return;
    var f = panel.querySelectorAll('button:not([disabled]), input, select, textarea, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  // Two forms share this handler: the modal (lp2-) and the mid-page section
  // (lp2-mid-). Both are built by the same field() helper and differ only in their id
  // prefix and the tag they send, so one validator serves both. That is the whole
  // point — the rules below are copied from validate() in the page's own runtime, and
  // a form that rejected input differently would be worse than not having it.
  var FORMS = {
    'lp2-form': { prefix: 'lp2-', tag: 'modal' },
    'lp2-mid-form': { prefix: 'lp2-mid-', tag: 'mid-page' }
  };

  // While the mid-page form is on screen, stand the sticky bar down — see the
  // [data-lp2-atform] rule for why. The flag lives on <html>, the one node the DC
  // runtime's re-render cannot reach.
  //
  // Deliberately a scroll listener re-querying the element, not an IntersectionObserver
  // holding a reference to it. This script runs before the runtime mounts, so the node
  // it would observe is the one inside <x-dc> — which React then replaces, leaving the
  // observer watching a detached element that never intersects anything. Measured: the
  // flag never fired. Re-reading the rect each time is the same approach the sticky bar
  // itself takes in build.mjs, and for the same reason.
  (function () {
    var ticking = false;
    function measure() {
      ticking = false;
      var el = document.getElementById('tour-form');
      if (!el) return;
      var r = el.getBoundingClientRect();
      var on = r.bottom > 0 && r.top < (window.innerHeight || 0);
      if (on) root.setAttribute('data-lp2-atform', '');
      else root.removeAttribute('data-lp2-atform');
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measure();
  })();
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    var spec = form && FORMS[form.id];
    if (!spec) return;
    ev.preventDefault();

    var p = spec.prefix;
    var IDS = { fullName: p + 'name', phone: p + 'phone', email: p + 'email' };

    var f = {
      fullName: val(IDS.fullName), phone: val(IDS.phone),
      email: val(IDS.email), business: val(p + 'business')
    };

    var e = {};
    if (!f.fullName.trim() || f.fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
    var digits = f.phone.replace(/[^0-9]/g, '');
    if (!f.phone.trim()) e.phone = 'Please enter a phone number.';
    else if (digits.length < 10) e.phone = 'Please enter a 10-digit phone number.';
    if (!f.email.trim()) e.email = 'Please enter your email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'That email address does not look right.';

    Object.keys(IDS).forEach(function (k) {
      var msg = document.getElementById(IDS[k] + '-err');
      var input = document.getElementById(IDS[k]);
      if (msg) msg.textContent = e[k] || '';
      if (input) input.setAttribute('aria-invalid', e[k] ? 'true' : 'false');
    });
    var firstBad = Object.keys(e)[0];
    if (firstBad) {
      var el = document.getElementById(IDS[firstBad]);
      if (el) el.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    // The same three steps the inline form takes, so the lead lands in the same place:
    // the thank-you page reads on-lead to greet the visitor, __onSendLead carries the
    // payload and its UTM capture to the webhook, then the redirect. The tag is the one
    // difference, so each form can be told apart downstream.
    var lead = {
      name: f.fullName.trim(), phone: f.phone.trim(), email: f.email.trim(),
      business: (f.business || '').trim(), form: spec.tag,
      // The honeypot travels with the lead rather than being checked here, so the drop
      // happens at the one seam every path shares — and so this handler keeps behaving
      // identically either way: sessionStorage, redirect, no hint that anything differed.
      trap: val(p + 'website')
    };
    try {
      sessionStorage.setItem('on-lead', JSON.stringify({ name: lead.name, phone: lead.phone }));
    } catch (err) { /* private mode — the thank-you page falls back to generic copy */ }
    try { window.__onSendLead(lead); } catch (err) { /* never block the redirect */ }
    window.location.assign('/thank-you');
  });
})();
</script>
`;

/** One field, for either of the two forms this file builds — the tour modal and the
 *  mid-page section. Both go through here so their markup cannot drift apart: the same
 *  label/input/error triple, the same ids relative to their prefix, which is what lets
 *  a single delegated handler in LP2_MODAL_JS validate both.
 *
 *  aria-required rather than required — `required` would hand validation to the browser,
 *  whose bubbles would pre-empt the messages the rest of the page uses. */
const leadField = (prefix, id, label, type, auto, optional) =>
  '        <div>\n' +
  `          <label for="${prefix}${id}">${label}${optional ? ' <i>(optional)</i>' : ''}</label>\n` +
  `          <input class="input" id="${prefix}${id}" name="${id}" type="${type}" autoComplete="${auto}"` +
  (optional ? '' : ' aria-required="true"') +
  (optional ? '' : ` aria-describedby="${prefix}${id}-err"`) + ' />\n' +
  (optional ? '' : `          <p class="lp2-err" id="${prefix}${id}-err" role="alert"></p>\n`) +
  '        </div>\n';

/** The four fields plus the honeypot, in order. Sharing this is the point: a form that
 *  asked for different things, or protected itself differently, would be a second thing
 *  to keep in sync.
 *
 *  The honeypot is never shown, never focusable and never announced, so a person cannot
 *  fill it and a form-filling bot usually will. Off-screen rather than display:none,
 *  which the cruder bots check for. "Company website" is plausible on purpose — exactly
 *  the kind of field an autofiller reaches for. It is read into the lead's `trap` key and
 *  dropped at __onSendLead, the one seam every path shares. */
const leadFields = (prefix) =>
  leadField(prefix, 'name', 'Full name', 'text', 'name') +
  leadField(prefix, 'phone', 'Phone', 'tel', 'tel') +
  leadField(prefix, 'email', 'Email', 'email', 'email') +
  leadField(prefix, 'business', 'Business name', 'text', 'organization', true) +
  '        <div class="lp2-hp" aria-hidden="true">\n' +
  `          <label for="${prefix}website">Company website</label>\n` +
  `          <input id="${prefix}website" name="website" type="text" tabindex="-1" autoComplete="off" />\n` +
  '        </div>\n';

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
    // The nav still points "What's Included" at the section this step just removed —
    // a real, currently-shipping dead link, found while chasing an unrelated bug in
    // this same file. Both the desktop and mobile-panel copies of the link need it;
    // /lp keeps id="included" as a real section, so this is a here-only fix, not a
    // shared one — changing the nav itself would break the link there instead.
    out = replaceExactly(out, 'href="#included"', 'href="#kitchens"', 2, 'nav target folded into kitchens');
  }

  // ---- 4. the duplicate mid-page form becomes a CTA strip --------------------
  // tour-mid carried a second copy of the whole lead form — 1,142px, four fields, the
  // same headline promise as the closing form — sitting where the reader had not yet
  // been given a reason to act. What that position needs is a way in, not a second
  // identical ask, so it becomes a CTA strip and moves up before the film section.
  //
  // This page does now carry a second real form: step 15 puts one at the pivot,
  // between the "this could be you" photograph and the reviews. That is not this one
  // coming back. It is 550px rather than 1,142px, it earns its place by sitting
  // between the want and the proof rather than ahead of both, and its headline is
  // deliberately not the closing form's — which was the actual objection here.
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
    // A row that scrolls sideways has to say so, or half the readers never find the
    // other cards — and the hint was on two of the four scrollers, not on the
    // process steps and not on the equipment tabs. Anchored to the element just
    // tagged rather than to a bare '</dl>': three <dl>s exist on the page.
    out = hintAfter(out, '<dl class="lp2-track"', '</dl>', 'who-it-is-for hint');
    out = hintAfter(out, '<ol class="lp2-track"', '</ol>', 'how-it-works hint');
    // The tab row is the fourth scroller and the worst offender: 397px of it is off
    // screen at 390px. It is a flex row of five buttons and nothing else, so the
    // first </div> after it is its own.
    out = hintAfter(out, '<div role="tablist"', '</div>', 'equipment tabs hint', 'lp2-hint-tabs');
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

  // ---- 12. the "this could be you" photograph moves to the pivot -------------
  // could-be-you.webp is the one asset that asks the reader to picture themselves in
  // the space rather than telling them about it — THIS COULD BE YOU over the cook,
  // AND THIS COULD BE YOUR KITCHEN over the line, YOUR LOGO COULD BE HERE over a
  // blank kraft bag. On / it sits inside the mid-page lead form, under a headline
  // that already says "Seen enough?" — by then the reader has decided, and the image
  // is decoration beside a form rather than the thing that got them there. Step 4
  // above then dropped that form from this page, and the image went with it.
  //
  // It belongs at the pivot: pain, then this, then process. "This could be you" only
  // lands once there is a reason to want to be someone else, and the section above
  // has just spent four cards establishing one. The hero is protected, so this is the
  // earliest position on the page where the picture can do its work.
  {
    const IMG = out.match(/<img src="assets\/could-be-you\.webp"[^>]*>/);
    if (IMG) throw new Error('[lp2] could-be-you: already on the page — step 4 should have removed it.');
    const ALT = 'A cook plating bowls in a stainless commercial kitchen, annotated: this could be you, and this could be your kitchen, your logo could be here';
    const band =
      '<div class="lp2-could">\n' +
      `      <img src="assets/could-be-you.webp" alt="${ALT}" loading="lazy" width="1200" height="932" />\n` +
      '    </div>\n\n  ';
    out = replaceExactly(out, OPEN.howItWorks, band + OPEN.howItWorks, 1, 'could-be-you band');
  }

  // ---- 13. the proof moves up behind the photograph --------------------------
  // The reviews sat at roughly 70% of the scroll, after the process, the benefits,
  // the kitchens, the audience list, a CTA and the film — six sections of the page
  // talking about itself before anyone else vouched for it. Moved to just after the
  // "this could be you" photograph, the sequence reads the way a decision actually
  // forms: here is the problem you have, here is you standing in the kitchen, here
  // are 380 people who did exactly that. Everything the section contains — the
  // twelve testimonials, the six screenshots, the 4.9 — moves with it untouched;
  // this step only changes where it sits. It runs after step 12 on purpose: both
  // anchor to the same opener, so the photograph lands first and the reviews land
  // behind it.
  out = moveBefore(out, OPEN.reviews, OPEN.howItWorks, 'reviews');

  // ---- 14. the rating moves to where it can still change a mind ---------------
  // 4.9 out of 380+ reviews is the page's strongest trust signal and it lived at ~55%
  // of the scroll, inside the reviews section. A visitor deciding whether this page
  // is worth their time never got to it. It goes directly under the hero CTA — after
  // the button, before the 24/7 fact strip — so it reads as evidence for the CTA
  // rather than as one more fact about the building.
  {
    const star =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="var(--color-accent-400)" ' +
      'stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 ' +
      '18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    const rating =
      '<div class="lp2-rating">\n' +
      '        <span class="stars" role="img" aria-label="Rated 4.9 out of 5 from more than 380 reviews">' +
      star.repeat(5) + '</span>\n' +
      '        <b>4.9</b>\n' +
      '        <span>&middot; 380+ reviews</span>\n' +
      '      </div>\n      ';
    const FACTS = '<ul style="list-style: none; margin: 34px 0 0; padding: 16px 0 0; border-top: 1px solid color-mix(in srgb, #FAF8F5 30%, transparent); display: flex; flex-wrap: wrap; gap: 10px 26px; font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: color-mix(in srgb, #FAF8F5 82%, transparent);">';
    out = replaceExactly(out, FACTS, rating + FACTS, 1, 'hero rating');
  }

  // ---- 15. a place to convert at the pivot ------------------------------------
  // Step 4 took the export's mid-page form out, and its reasoning still holds for the
  // form it removed: 1,142px of stacked fields repeating the closing ask, at a point
  // the reader had not yet been given a reason to act. This is not that form back.
  //
  // It sits at the pivot instead — straight after the "this could be you" photograph
  // and straight before 380 people saying they did exactly that. The picture creates
  // the want and the proof answers the doubt; the ask belongs between them, not after
  // both. It is also the only real form in the top two-thirds of the page: everything
  // else up here is a CTA that opens the modal, which is a fine way in for someone who
  // has decided and a worse one for someone who is merely persuaded.
  //
  // The copy deliberately differs from the closing form's "Come see the kitchen you'd
  // be cooking in." Two identical promises on one page is the thing step 4 objected to,
  // and the objection was right.
  //
  // Deliberately no data-rev: this file runs after addScrollMotion(), so an injected
  // section is never staged for reveal. That is the safe direction — a section the
  // observer never sees would stay at opacity 0 forever, which has already happened
  // once on this page.
  {
    const section =
      // id="tour-form", not "tour-mid": the export's #tour-mid was cut by step 4, and
      // reusing the name would silently revive two stale href="#tour-mid" buttons that
      // sit BELOW this section — clicking them would scroll the visitor backwards. Those
      // two are repointed at the modal just below instead.
      '<section id="tour-form" class="lp2-mid" data-band="dark" aria-labelledby="lp2-mid-title">\n' +
      '    <div>\n' +
      '      <div>\n' +
      '        <span class="lp2-mid-eyebrow">Book a tour</span>\n' +
      '        <h2 id="lp2-mid-title">See it before you commit to anything.</h2>\n' +
      '        <p>Walk the line, open the walk-in, meet the people already cooking here. ' +
      'Leave your details and we&rsquo;ll call to set a time at Van Nuys or Washington Blvd.</p>\n' +
      '        <ul>\n' +
      '          <li>No build-out</li>\n' +
      '          <li>Already permitted</li>\n' +
      '          <li>Month to month</li>\n' +
      '        </ul>\n' +
      '      </div>\n' +
      '      <form id="lp2-mid-form" noValidate>\n' +
      leadFields('lp2-mid-') +
      '        <button type="submit" class="btn btn-primary blueprint">Book My Tour</button>\n' +
      '      </form>\n' +
      '    </div>\n' +
      '  </section>\n\n  ';
    // Anchored on the reviews rather than on the photograph, and placed after step 13
    // has moved them: steps 12 and 13 both hang off OPEN.howItWorks, so anchoring there
    // would make the result depend on their ordering. This lands between the two
    // whatever those steps do.
    out = replaceExactly(out, OPEN.reviews, section + OPEN.reviews, 1, 'mid-page lead form');

    // Two dead CTAs, found while placing this section. Step 4 removed #tour-mid from
    // this page but left two buttons pointing at it — one under the benefits band, one
    // under "Who it's for" — so both have been doing nothing at all. They cannot be
    // pointed at the new form either: both sit below it, so the page would scroll
    // backwards. #tour is what every other CTA on the page uses, and the delegated
    // handler turns it into the modal.
    out = replaceExactly(out, 'href="#tour-mid"', 'href="#tour"', 2, 'dead tour-mid CTAs');
  }

  // ---- 16. the form comes to the CTA ----------------------------------------
  // The inline #tour form stays exactly where it is: it is the no-JS fallback and the
  // natural close of the page. This is a second, focused copy that opens on the spot.
  // Its fields carry the lp2- prefix so nothing collides with the m- and f- fields.
  {
    const modal =
      '<div class="lp2-modal">\n' +
      '    <div class="lp2-modal-back" data-lp2-close></div>\n' +
      '    <div class="lp2-modal-panel" data-lp2-panel role="dialog" aria-modal="true" aria-labelledby="lp2-modal-title">\n' +
      '      <button type="button" class="lp2-modal-x" data-lp2-close aria-label="Close">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>' +
      '</button>\n' +
      '      <span class="lp2-modal-eyebrow">Schedule a tour</span>\n' +
      '      <h2 id="lp2-modal-title">Come see the kitchen you&rsquo;d be cooking in.</h2>\n' +
      '      <p>Leave your details and we&rsquo;ll call to set a time at Van Nuys or Washington Blvd.</p>\n' +
      '      <form id="lp2-form" noValidate>\n' +
      leadFields('lp2-') +
      '        <button type="submit" class="btn btn-primary blueprint">Schedule My Tour</button>\n' +
      '      </form>\n' +
      '    </div>\n' +
      '  </div>\n\n  ';
    out = replaceExactly(out, '</main>', '</main>\n\n  ' + modal.trim() + '\n', 1, 'lead modal markup');
    out = replaceExactly(out, '</body>', LP2_MODAL_JS + '</body>', 1, 'lead modal script');
  }

  return out;
}
