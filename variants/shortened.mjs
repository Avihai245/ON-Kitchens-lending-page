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
    `\n      <p class="lp2-hint${cls ? ' ' + cls : ''}" aria-hidden="true">Swipe for more &rarr;</p>` +
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
   site already reads a dark band as "a form you are meant to fill in". The black also
   frames the photograph this section now contains, and hands off cleanly to the light
   reviews below.

   Two columns on desktop deliberately, and the photograph is one of them. It shipped
   for a while as a full-bleed band of its own directly above this section, and that
   was wrong twice over: 932px of picture with nothing to do next, and a headline
   underneath that looked unrelated to it. The picture is the argument for the form —
   "this could be you" is a reason to book a tour — so the two belong in one frame,
   sized against each other. Below 760px — the same breakpoint the rest of the page
   turns on — it stacks, photograph first. */
.lp2-mid {
  background: #141414; color: #FAF8F5;
  padding: clamp(40px, 5.5vw, 72px) 0;
}
/* The photograph and the ask are one frame, sized against each other. Equal columns:
   the picture is the argument for the form, so neither should look like the other's
   decoration — and at 5fr/6fr the image was short enough to leave a visible run of
   empty black beneath it, since the form column's height is set by four fields and a
   button rather than by anything the image can match. */
.lp2-mid > div {
  max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto; padding: 0 var(--edge);
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px clamp(36px, 4.5vw, 72px);
  align-items: stretch;
}
/* contain, never cover. The whole argument of this photograph is burned into it as
   text — THIS COULD BE YOU across the cook, AND THIS COULD BE YOUR KITCHEN across the
   line, YOUR LOGO COULD BE HERE on the bag — and those sit at the frame's edges, so
   cover ate them: at 5fr of a 1240px grid the first two words of each line were gone.
   contain fits the whole picture and centres it, and because the leftover space is the
   section's own #141414 there is nothing to see where the image is not. The column
   still stretches, so the two halves stay the same height. */
.lp2-mid-shot { margin: 0; min-height: 0; display: flex; }
.lp2-mid-shot img {
  display: block; width: 100%; height: 100%; min-height: 300px;
  /* Top, not centre: the column stretches to the form's height, so centring floated the
     picture ~84px below the eyebrow and the two halves stopped looking like one block.
     Aligned to the top the eye gets a single clean edge across both columns, and the
     leftover below is the section's own black, which reads as nothing at all. */
  object-fit: contain; object-position: 50% 0;
}
.lp2-mid-eyebrow {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--color-accent); margin-bottom: 12px;
}
/* Sized to sit beside a photograph, not to carry a section on its own. At the previous
   clamp(28px, 3.4vw, 42px) it broke to three lines in this column and read as a banner
   with nothing under it. */
.lp2-mid h2 {
  font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(24px, 2.3vw, 32px); line-height: 1.08; letter-spacing: 0.01em;
  text-transform: uppercase; margin: 0;
}
.lp2-mid p {
  margin: 12px 0 22px; max-width: 48ch;
  font-size: 15px; line-height: 24px;
  color: color-mix(in srgb, #FAF8F5 82%, transparent);
}
.lp2-mid form { display: grid; gap: 14px; }
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
  .lp2-mid > div { grid-template-columns: 1fr; gap: 22px; }
  /* The ask comes first on a phone and the photograph follows it. Stacked, the picture
     costs a whole screenful before the reader reaches anything they can act on, so it
     goes below: the ask lands immediately and the picture reinforces it underneath.
     Only the order property moves, so the desktop layout cannot be affected by this.

     Reordering visually matters when it scrambles focus sequence; it does not here.
     The element that moves is a non-focusable <figure><img>, and everything interactive
     stays inside .lp2-mid-ask in DOM order. */
  .lp2-mid-shot { order: 2; }
  /* Stacked, the photograph has the full column width, so its natural proportions fit
     without any crop or any leftover — no object-fit needed at all. */
  .lp2-mid-shot img { height: auto; min-height: 0; }
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
  max-height: min(88vh, 760px);
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
   page is still there and the tap target that closes the form: a tap that starts
   and ends on that band closes it, once no field has focus. The vh line is for
   browsers without dvh, which would otherwise drop the cap altogether. */
@media (max-width: 760px) {
  .lp2-modal-panel {
    left: 0; right: 0; top: auto; bottom: 0; transform: none;
    width: auto; max-height: 86vh; max-height: 86dvh; padding: 20px 20px 28px;
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
/* could-be-you.webp lives inside the lead form section now — see .lp2-mid-shot. */

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
/* The hint is an instruction, not a control, and it used to be dressed as one: the
   accent colour every link on the page uses, in the tabs' uppercase type, with an
   arrow. Visitors tapped it, nothing happened, and session recordings showed the
   dead taps. It now takes the page's own secondary-text colour, the 70% mix used for
   27 other pieces of supporting copy, and is hidden from screen readers, which reach
   every card and tab directly and gain nothing from being told to swipe. */
.lp2-hint {
  display: none;
  font-family: var(--font-heading); font-weight: 600; font-size: 13px;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 70%, transparent); margin: 10px 0 0;
}
@media (prefers-reduced-motion: reduce) { .lp2-track { scroll-behavior: auto; } }
</style>
`;

/** v2 only — everything this rollout adds, appended after LP2_CSS rather than mixed
 *  into it so LP2_CSS itself never has to change for a page that hasn't opted in.
 *  Grows through the rest of this file as each v2 feature below needs a rule; kept
 *  as one constant so it is one injection point instead of several. */
const LP2_V2_CSS = `
<style>
/* ---- defensive backstop for every <img> on the page ----
   Every image here already carries its own explicit sizing (width/height
   attributes, an inline aspect-ratio, or an absolute-fill pattern -- see the
   per-image work elsewhere in this file and the raw export's own markup),
   so this rule matches nothing that isn't already correctly sized today.
   It exists as a floor for whatever isn't: an inline style="" always wins
   over this regardless of specificity, so it can only affect an <img> that
   has neither an inline height nor an explicit height attribute, which is
   exactly the case a future edit could introduce by accident. */
img { max-width: 100%; height: auto; }

/* ---- metric-matched fallback fonts, so first paint (the LCP stand-in's H1,
   in particular) doesn't reflow when the real webfont swaps in ----
   --font-heading/--font-body's shared fallback is plain system-ui, whose
   glyph widths don't match Barlow (Condensed)'s at all. That mismatch has
   always existed but was never visible: on every other page, and on this
   one before the LCP stand-in existed, nothing ever painted text in the
   fallback before the real webfont arrived, so the swap -- and the reflow
   it causes -- never had anything on screen yet to shift. The stand-in
   paints the hero H1 before support.js has even started, let alone
   finished fetching the webfont, which is exactly the condition this bug
   needed to become visible -- and PageSpeed's own "Layout shift culprits"
   audit is what caught it, the same way the stand-in exposed the
   --edge/--color-accent-400 gap below. Metrics here are Barlow Condensed
   600 and Barlow 400 against Arial AND Roboto -- both, not just Arial,
   because local('Arial') alone silently fails on stock Android (Chrome on
   Android has no font actually named Arial to find, confirmed by testing
   this exact rule in a real browser: the face's FontFace.status comes back
   "error" and the whole declaration is skipped, falling through to
   system-ui as if this fix didn't exist), and Android is most of this
   brief's own "mobile" number. A second @font-face under a second fallback
   name, sourced from local('Roboto') -- Android's actual native sans,
   present on every stock build -- with ITS OWN metrics-derived overrides,
   covers that case the same way; the two are listed in order in the
   font stack below and the browser uses whichever one it can actually
   resolve locally.

   The heading numbers below are NOT the textbook size-adjust formula's own
   output (web.dev: "Improve font fallbacks with new CSS font descriptors";
   @capsizecss/metrics' xWidthAvg-ratio approach -- that gives ~79.9%/Arial,
   ~80.0%/Roboto). Checked those against the real fonts rendering this
   page's actual headline text (this H1 specifically, all-caps per
   text-transform below) and they undershot badly, 16-19% too wide on every
   line: xWidthAvg is a whole-character-set average, and Barlow CONDENSED's
   condensing plus this headline's own all-caps transform both push it
   further from Arial/Roboto's proportions than the whole-alphabet average
   suggests. Replaced with size-adjust measured directly off this headline's
   own three lines, rendered in the real fonts at a shared reference size --
   under 2% width divergence on every line, next to the ~17% the formula
   number left on the table. Barlow 400 (below, body text, not condensed,
   not all-caps) had no such gap -- its formula and measured numbers agreed
   within ~1%, so that one keeps the textbook value. */
@font-face {
  font-family: 'Barlow Condensed Fallback: Arial';
  src: local('Arial');
  size-adjust: 67.60%;
  ascent-override: 147.93%;
  descent-override: 29.59%;
  line-gap-override: 0%;
}
@font-face {
  font-family: 'Barlow Condensed Fallback: Roboto';
  src: local('Roboto');
  size-adjust: 73.43%;
  ascent-override: 136.18%;
  descent-override: 27.24%;
  line-gap-override: 0%;
}
@font-face {
  font-family: 'Barlow Fallback: Arial';
  src: local('Arial');
  size-adjust: 96.68%;
  ascent-override: 103.43%;
  descent-override: 20.69%;
  line-gap-override: 0%;
}
@font-face {
  font-family: 'Barlow Fallback: Roboto';
  src: local('Roboto');
  size-adjust: 96.89%;
  ascent-override: 103.21%;
  descent-override: 20.64%;
  line-gap-override: 0%;
}
:root {
  --font-heading: "Barlow Condensed", "Barlow Condensed Fallback: Arial", "Barlow Condensed Fallback: Roboto", system-ui, sans-serif;
  --font-body: "Barlow", "Barlow Fallback: Arial", "Barlow Fallback: Roboto", system-ui, sans-serif;
}

/* ---- headline weight only: never swap, so the metric-matched fallback
   above is belt-and-braces rather than the only thing standing between this
   page and a shift -- confirmed by testing that BOTH local('Arial') and
   local('Roboto') fail to resolve in a plain Linux container with no
   desktop/mobile OS fonts installed, which is a believable description of
   whatever machine actually runs a PageSpeed/Lighthouse pass. If neither
   fallback face above can load on a given visitor's device either, this is
   what actually keeps the swap from happening at all, there or anywhere
   else: three @font-face rules, identical to Google Fonts' own definition
   for Barlow Condensed 600 (same URLs, same unicode-ranges -- this repo
   doesn't self-host, and duplicating the actual font bytes here would be
   its own maintenance burden for zero benefit) except for font-display,
   swap -> optional. optional gives the browser a very short window (spec:
   about 100ms, browser-dependent) to use the real font if it's already
   available, and otherwise commits to the fallback for this navigation --
   no later swap, ever, once that window closes. The preload two sections up
   makes "already available" the common case for a real visitor; optional
   is what makes the uncommon case (slow connection, cold cache, or a
   fallback that can't metric-match because neither Arial nor Roboto
   resolved) cost zero layout shift instead of one. Only the 600 weight is
   overridden -- the only weight this page's own markup sets on
   --font-heading text -- so this does not touch how any other weight or
   the shared design system's own use of the family behaves. Declared after
   the shared stylesheet in the document, so it wins the cascade for that
   one weight regardless of which finishes loading first (font selection
   follows document order, not fetch completion order). */
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: optional;
  src: url(https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B4873z3nWuZEC.woff2) format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: optional;
  src: url(https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B4873z3jWuZEC.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: optional;
  src: url(https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B4873z3bWuQ.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* ---- the popup's fallback highlight ----
   Briefly marks the form the popup's guaranteed-open check scrolled to, so a visitor
   whose popup failed to render sees why the page just moved under them. */
.lp2-highlight {
  outline: 3px solid var(--color-accent-400);
  outline-offset: 4px;
  transition: outline-color 0.3s ease;
}

/* ---- the phone line under the mid-page and popup forms ---- */
.lp2-mid-phone, .lp2-modal-phone {
  margin: 4px 0 0; font-size: 14px; line-height: 22px; text-align: center;
}
.lp2-mid-phone { color: color-mix(in srgb, #FAF8F5 76%, transparent); }
.lp2-mid-phone a, .lp2-modal-phone a { color: inherit; font-weight: 600; }
.lp2-modal-phone { color: color-mix(in srgb, var(--color-text) 70%, transparent); }
.lp2-modal-phone a { color: var(--color-accent-700); }

/* ---- the hero's own inline form ----
   Two columns from 761px up: copy on the left, the form card on the right, both
   fitting above the fold at 1366x768 without the hero forcing extra height to do
   it. Below 760px the two stack and the form sits inside the hero itself, not
   after it — see the min-height/padding overrides at the bottom of this block for
   how the hero gives up the room a headline-and-button version of it used to
   reserve for its own sake. */
.lp2-hero-copy { min-width: 0; }
.lp2-hero-phone-line {
  margin: 14px 0 0; font-size: 15px; line-height: 1.3;
  font-family: var(--font-heading); font-weight: 600; letter-spacing: 0.02em;
}
.lp2-hero-phone-line a {
  color: #FAF8F5; text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, #FAF8F5 50%, transparent);
}
.lp2-hero-facts {
  list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px;
  font-size: 13px; letter-spacing: 0.04em; color: color-mix(in srgb, #FAF8F5 76%, transparent);
}
.lp2-hero-facts li[aria-hidden] { color: var(--color-accent-400); }

.lp2-hero-form-card {
  /* The hero is a [data-band="dark"] section, which redefines --color-text (and
     --color-divider/--color-accent-700) to a light value so ordinary text sitting
     directly on the dark backdrop stays readable — every existing dark-band
     component assumes it never supplies its own background. This card is the
     first one that does: it's a light island floating on the dark hero photo, so
     it needs the *un-redefined* light-theme tokens for its own children (h2,
     label, input, the phone link) — otherwise --color-text resolves to the same
     light value as the card's own background and every label/heading disappears. */
  --color-text: #141414;
  --color-divider: color-mix(in srgb, #141414 16%, transparent);
  --color-accent-700: #7A5216;
  background: var(--color-bg); color: var(--color-text);
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg);
  padding: clamp(20px, 2.6vw, 28px); margin-top: clamp(22px, 4vw, 32px);
}
.lp2-hero-form-card h2 {
  font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(19px, 2vw, 23px); line-height: 1.15; letter-spacing: 0.01em;
  text-transform: uppercase; margin: 0 0 14px;
}
.lp2-hero-form-card form { display: grid; gap: 12px; }
.lp2-hero-form-card label {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 13px; line-height: 1.35; letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 6px;
}
.lp2-hero-form-card label i {
  font-style: normal; font-weight: 400; letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
}
.lp2-hero-form-card .input { min-height: 48px; font-size: 16px; width: 100%; box-sizing: border-box; }
.lp2-hero-form-card button[type="submit"] {
  margin-top: 4px; width: 100%; min-height: 52px;
  text-transform: uppercase; letter-spacing: 0.06em; font-size: 16px;
}
.lp2-hero-form-phone {
  margin: 10px 0 0; font-size: 14px; line-height: 20px; text-align: center;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
}
.lp2-hero-form-phone a { color: var(--color-accent-700); font-weight: 600; }

@media (min-width: 761px) {
  .lp2-hero-wrap {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
    gap: clamp(28px, 5vw, 64px); align-items: start;
  }
  .lp2-hero-form-card { margin-top: clamp(6px, 1vw, 10px); }
}

/* The export sized min-height and top padding for a headline-and-button hero that
   only had to clear the sticky header. A hero that also holds a form has to end
   where the form begins instead — min-height: 0 lets it size to its own content,
   and the padding drops to what the sticky header actually needs, not what looked
   right around three lines of display type on its own. */
@media (max-width: 760px) {
  [style*="min-height: clamp(600px, 82vh, 880px)"] { min-height: 0 !important; }
  [style*="padding: clamp(88px, 11vh, 150px) var(--edge) clamp(44px, 6vw, 76px)"] {
    padding-top: clamp(76px, 14vw, 96px) !important;
    padding-bottom: 22px !important;
  }
  .lp2-hero-form-card { padding: 18px; margin-top: 20px; }
}

/* ---- mobile hero: form above the fold, everything else reflows around it ----
   The brief: at 390x844 / 360x800, the form heading and first field must already
   be visible in the bottom third of the first viewport — not just "the hero is
   shorter," an actual reordering, since the full headline + full supporting
   paragraph + rating + badges together are taller than the budget allows no
   matter how much padding is trimmed.
   Mechanism: .lp2-hero-copy becomes display:contents on mobile, so its children
   (eyebrow, hr, headline, paragraphs, phone line, facts, rating, badges) become
   direct flex items of .lp2-hero-wrap alongside .lp2-hero-form-card, its sibling
   — only then can the form card slot in *between* them via order. Nothing here
   runs above 760px: .lp2-hero-copy stays a normal block there, so the desktop
   two-column grid (scripts above) is completely untouched.
   Content: a short, mobile-only headline and one-sentence sub-line replace the
   full-length versions above the fold; the full versions still exist for
   desktop, and reappear below the form on mobile (order puts them after
   .lp2-hero-form-card) rather than being deleted, same as the rating and the
   24/7-access badge row. */
@media (max-width: 760px) {
  .lp2-hero-wrap { display: flex; flex-direction: column; }
  .lp2-hero-copy { display: contents; }
  .lp2-hero-h1-mobile { order: 2; }
  .lp2-hero-sub-short { order: 3; }
  .lp2-hero-phone-line { order: 4; }
  .lp2-hero-facts { order: 5; }
  .lp2-hero-form-card { order: 6; }
  .lp2-hero-h1-full { display: none; }
  .lp2-hero-sub-full { order: 7; }
  .lp2-rating { order: 8; }
  .lp2-hero-badges-mobile { order: 9; }
  /* "24/7 Access · Private Kitchens · Monthly or Hourly" wraps to a second (in
     fact third) line at the export's own 15px/26px-gap sizing once it's
     narrower than ~390px, which is exactly what made the Hero taller than it
     needed to be. A smaller font alone couldn't close that gap without
     shrinking past legible — the row needed roughly half its rendered width
     back — so this is the same short/full duplicate-and-tag pattern as the
     headline and sub-line above: a separate, shorter, mobile-only version
     ("Private Kitchens" -> "Private", "Monthly or Hourly" -> "Monthly/Hourly")
     plus a smaller size, and the original full-text row hidden on mobile
     rather than resized, so desktop keeps its exact original text untouched. */
  /* Needs !important, same reason as .lp2-hero-badges-mobile below: this
     element's own inline style sets display:flex, which an ordinary class
     rule can never win against regardless of specificity. Without it, the
     desktop badge row stayed visible on mobile too, right under the eyebrow
     -- its own margin/border/padding (sized for sitting after the rating row
     on desktop) rendered as a blank gap and a stray rule line above the real
     mobile-only headline. */
  .lp2-hero-badges-full { display: none !important; }
}
@media (min-width: 761px) {
  .lp2-hero-h1-mobile, .lp2-hero-sub-short { display: none; }
  /* Needs !important: unlike the two rules above, this element's own inline
     style sets display:flex (for its own row layout), which an ordinary class
     rule can never win against regardless of specificity. */
  .lp2-hero-badges-mobile { display: none !important; }
}

/* ---- the new floating call button, directly above the chat launcher ---- */
.lp2-call-fab {
  position: fixed; right: 16px; bottom: 166px; z-index: 95;
  width: 54px; height: 54px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--color-accent-600); color: var(--color-bg);
  border: 1px solid var(--color-accent-600);
  box-shadow: var(--shadow-lg);
}
.lp2-call-fab:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); }
.lp2-call-fab:active { background: var(--color-accent-800); border-color: var(--color-accent-800); }
.lp2-call-fab svg { display: block; }
/* Stands down at a lead form on mobile, the same as the chat launcher next to it
   — [data-lp2-atform]'s own rule already covers .on-chat-fab unconditionally
   (every shortened-variant page), and now measures the hero and bottom forms too
   on this page (see the atform measurer in LP2_MODAL_JS_V2). */
@media (max-width: 760px) {
  html[data-lp2-atform] .lp2-call-fab { opacity: 0; pointer-events: none; }
}

/* ---- safe-area clearance, every floating element ----
   None of bottom:96px (the chat launcher, the accessibility launcher) or the new
   call button's bottom:166px accounted for the iOS home-indicator band; env()
   with a plain-px fallback already baked into the calc so a browser that doesn't
   support env() still gets the value it has today. !important is required here
   only because two of these three elements set their own bottom offset inline,
   and an author stylesheet needs it to outrank an inline style at all. */
.on-chat-fab,
[style*="left: 16px; bottom: 96px; z-index: 90;"] {
  bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
}
.lp2-call-fab { bottom: calc(166px + env(safe-area-inset-bottom, 0px)) !important; }
[data-band="dark"][style*="position: fixed; left: 0px; right: 0px; bottom: 0px"] {
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
}

/* ---- every floating element stands down while the popup is open ----
   A visible floating button over a modal backdrop is a second, disconnected
   click target sitting on top of the one thing on screen that should get the
   tap — and on a phone the call button in particular sits close enough to the
   panel's own close button to invite a mis-tap. */
html[data-lp2-modal] .lp2-call-fab,
html[data-lp2-modal] .on-chat-fab,
html[data-lp2-modal] [style*="left: 16px; bottom: 96px; z-index: 90;"] {
  display: none !important;
}

/* ---- the equipment spec list, replacing the five tabs ---- */
.lp2-spec-list {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: clamp(24px, 3vw, 36px);
}
.lp2-spec-group h3 {
  font-family: var(--font-heading); font-weight: 600; font-size: 15px;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-accent-700);
  margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid var(--color-divider);
}
.lp2-spec-group ul { list-style: none; margin: 0; padding: 0; }
.lp2-spec-group li {
  font-size: 15px; line-height: 22px; padding: 5px 0;
  color: color-mix(in srgb, var(--color-text) 84%, transparent);
}

/* ---- the locations card is a click target everywhere but its own buttons ---- */
.lp2-loc-card { cursor: pointer; }
.lp2-loc-card a { cursor: pointer; }
</style>
`;

/** v2 only. Internal-traffic detection and the one funnel-event helper every other v2
 *  script on the page calls — injected into <head>, ahead of every v2 script this file
 *  adds to <body> (the chat widget's script included, since addChatWidget() runs before
 *  this file and lands its script earlier in document order than anything below), so
 *  window.__lp2Track is always defined before anything tries to call it.
 *
 *  Placed in <head> rather than chasing a spot ahead of Google Tag Manager: GTM is
 *  added by a later, separate sweep (tagEveryPage(), scripts/build.mjs) anchored right
 *  after the viewport meta — textually before anything buildLandingPage() or this file
 *  can ever add to <head>. That is not a gap: GTM's bootstrap snippet only queues
 *  gtm.js to load asynchronously and never reads dataLayer synchronously, so pushing
 *  traffic_type here, guarded by the same `dataLayer = dataLayer || []` idiom GTM's
 *  own snippet uses, reaches the same array object well before the container script
 *  itself executes over the network — which is what "before GTM loads" actually needs. */
const LP2_V2_HEAD_JS = `
<script>
(function () {
  // ?internal=1 sticks across the visit; ?internal=0 clears it. An Amplify preview
  // URL is internal by construction — nobody outside the team has that link.
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('internal') === '1') localStorage.setItem('on-internal', '1');
    else if (q.get('internal') === '0') localStorage.removeItem('on-internal');
  } catch (err) { /* private mode */ }
  var internal = false;
  try {
    internal = localStorage.getItem('on-internal') === '1' || /\\.amplifyapp\\.com$/.test(location.hostname);
  } catch (err) {
    internal = /\\.amplifyapp\\.com$/.test(location.hostname);
  }
  if (internal) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ traffic_type: 'internal' });
    try { window.clarity && window.clarity('set', 'internal', '1'); } catch (err) { /* Clarity is not installed on this site yet */ }
  }

  // No personal data ever passes through here — every caller below sticks to the
  // parameter shapes the brief specifies. Clarity is not installed on this site as of
  // this change (confirmed: no snippet anywhere in the repo), so every clarity(...)
  // call is guarded the same way the dataLayer push above already is, and degrades to
  // a silent no-op rather than a thrown error until it is.
  window.__lp2Track = function (name, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params || {}));
    } catch (err) { /* never let a tag break the page */ }
    try { window.clarity && window.clarity('event', name); } catch (err) { /* Clarity is not installed on this site yet */ }
  };
})();
</script>
`;

/** The modal's behaviour on every page that does NOT opt into v2 — byte for byte
 *  what ships today. Delegated on `document` throughout, because the DC runtime
 *  re-renders the whole tree on every scroll threshold and per-element listeners
 *  would be attached to nodes React can replace. Same reasoning as the mobile
 *  menu's outside-click handler. */
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

  // Where the current press started. A click's target is where the press ENDED, so a
  // drag that began in a field (selecting its text, scrolling the sheet) and was
  // released over the backdrop used to count as a click on the backdrop and close the
  // modal on someone halfway through it. Only a press that starts AND ends on the
  // backdrop closes it now. Recorded in the capture phase from both pointer and touch
  // events, and read from the event each time rather than from a stored node, because
  // the modal's markup lives inside the React tree.
  var pressedBackdrop = false, pressedWhileTyping = false;
  function isBackdrop(el) { return !!(el && el.classList && el.classList.contains('lp2-modal-back')); }
  function notePress(ev) {
    pressedBackdrop = isBackdrop(ev.target);
    // Read now, not at click time. In most browsers pressing anything that cannot take
    // focus moves focus off the field during the press itself, so by the time the click
    // arrives the field no longer looks focused, and a check made then would close the
    // modal every time.
    var f = document.activeElement;
    pressedWhileTyping = !!(f && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName) && f.closest && f.closest('[data-lp2-panel]'));
  }
  document.addEventListener('pointerdown', notePress, true);
  document.addEventListener('touchstart', notePress, { capture: true, passive: true });

  // Every CTA on the page is an <a href="#tour">, the sticky bar's included, so one
  // delegated handler covers all of them and anything added later. preventDefault only
  // fires once the modal is actually going to open, so with JS off every CTA is still
  // an anchor to a working form at the foot of the page.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    // The X button. The backdrop carries the same data-lp2-close attribute, so it is
    // left out here and handled on its own below.
    var x = t.closest('[data-lp2-close]');
    if (x && !isBackdrop(x)) { ev.preventDefault(); closeModal(); return; }
    var cta = t.closest('a[href="#tour"]');
    if (cta) { ev.preventDefault(); openModal(cta); return; }
    if (!root.hasAttribute('data-lp2-modal')) return;
    // The backdrop is the only thing outside the panel that closes it. There used to be
    // a fallback for any click whose target was outside the panel, and that is what a
    // mis-resolved tap on a phone fell into.
    if (!isBackdrop(t) || !pressedBackdrop) return;
    ev.preventDefault();
    // A press that began while a field was focused puts the keyboard away and leaves the
    // modal open. On a phone the keyboard itself moves the sheet, so the tap after it
    // opens is the one most likely to land on the backdrop by accident. iOS can keep
    // the field focused through a tap on something unfocusable, hence the explicit blur.
    if (pressedWhileTyping) {
      var f = document.activeElement;
      if (f && f !== document.body && f.blur) f.blur();
      return;
    }
    closeModal();
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

/** v2's replacement for the block above — a separate, self-contained script rather
 *  than a patched copy of it, because so much differs (open/close now track timing
 *  and reason, the click handler drops the whole backdrop-close mechanism, the
 *  submit handler gains a third form and loses the honeypot) that interleaving the
 *  two as one conditional template risked a stray character quietly breaking the
 *  "byte for byte on every other page" guarantee LP2_MODAL_JS above exists to keep.
 *
 *  Covers: the popup fix (no backdrop-close, no autofocus on touch, a
 *  guaranteed-open fallback that scrolls to a working form instead), a third form
 *  (hero-) in the shared submit handler, the honeypot dropped, and the funnel
 *  events that live alongside the popup's own open/close state
 *  (modal_open/modal_open_failed/modal_close, cta_click, phone_click,
 *  lead_form_view/start/submit_attempt/error) — see LP2_V2_HEAD_JS for the
 *  window.__lp2Track helper every track() call below goes through. */
const LP2_MODAL_JS_V2 = String.raw`
<script>
(function () {
  var root = document.documentElement;
  var opener = null;
  var openedAt = 0;
  function track(name, params) { if (window.__lp2Track) window.__lp2Track(name, params); }

  function openModal(from) {
    opener = from || null;
    openedAt = Date.now();
    root.setAttribute('data-lp2-modal', '');
    // Set here, not just in the markup. type="email" with a malformed address makes
    // the browser refuse to fire submit at all, so the handler below never runs and
    // the reader gets a native bubble instead of the message the rest of the page
    // uses. The markup carries noValidate too, but the DC runtime rewrites attributes
    // through React and this is the one that cannot be allowed to go missing.
    var form = document.getElementById('lp2-form');
    if (form) form.noValidate = true;
    // No autofocus on touch: opening the keyboard unasked shifts the sheet under a
    // thumb that has not tapped a field yet. A pointer/hover check, not the runtime's
    // own width-based isPhone flag — this is about input type, not viewport size.
    var coarse = false;
    try { coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches; } catch (err) { /* assume desktop */ }
    var first = document.getElementById('lp2-name');
    if (first && !coarse) setTimeout(function () { first.focus(); }, 0);
    // Guaranteed open: a CTA click always tries to open the modal, but the attribute
    // write above is never trusted on its own — verify shortly after that the panel
    // is actually on screen, and if it is not, send the visitor to a form that works
    // instead of leaving them on a page where nothing looks like it happened.
    var loc = (from && from.getAttribute && from.getAttribute('data-cta-loc')) || 'content';
    setTimeout(function () {
      var panel = document.querySelector('[data-lp2-panel]');
      var r = panel ? panel.getBoundingClientRect() : null;
      var visible = !!(r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight || 0));
      if (root.hasAttribute('data-lp2-modal') && visible) { track('modal_open', { cta_location: loc }); return; }
      track('modal_open_failed', {});
      var fallback = document.getElementById('hero-form') || document.getElementById('tour-form') || document.getElementById('tour');
      if (fallback && fallback.scrollIntoView) {
        fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fallback.classList.add('lp2-highlight');
        setTimeout(function () { fallback.classList.remove('lp2-highlight'); }, 2400);
      }
    }, 300);
  }
  function hadInput() {
    var ids = ['lp2-name', 'lp2-phone', 'lp2-email', 'lp2-business'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.value && el.value.trim()) return true;
    }
    return false;
  }
  function closeModal(reason) {
    if (!root.hasAttribute('data-lp2-modal')) return;
    track('modal_close', { close_reason: reason || 'x', had_input: hadInput(), ms_open: openedAt ? (Date.now() - openedAt) : 0 });
    root.removeAttribute('data-lp2-modal');
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  function isBackdrop(el) { return !!(el && el.classList && el.classList.contains('lp2-modal-back')); }

  // Closing: the X button and Escape only. A tap on the backdrop, or anywhere else
  // in or out of the panel, does nothing — 12 of 14 recorded visitors who opened
  // this popup left it within 0-4 seconds without typing, on both mobile and
  // desktop, and in one recording a tap near the Phone field closed the popup a
  // second after it opened. The backdrop used to close on a press that started and
  // ended there; even that read a phone's own on-screen keyboard moving the sheet
  // as a deliberate tap often enough that it is gone too now.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var x = t.closest('[data-lp2-close]');
    if (x && !isBackdrop(x)) { ev.preventDefault(); closeModal('x'); return; }
    var cta = t.closest('a[href="#tour"]');
    if (cta) {
      ev.preventDefault();
      track('cta_click', { cta_location: cta.getAttribute('data-cta-loc') || 'content', cta_label: (cta.textContent || '').trim() });
      openModal(cta);
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (!root.hasAttribute('data-lp2-modal')) return;
    if (ev.key === 'Escape') { ev.stopPropagation(); closeModal('escape'); return; }
    if (ev.key !== 'Tab') return;
    var panel = document.querySelector('[data-lp2-panel]');
    if (!panel) return;
    var f = panel.querySelectorAll('button:not([disabled]), input, select, textarea, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  // Three forms share this handler: the modal (lp2-), the mid-page section
  // (lp2-mid-) and the hero (hero-). All three are built by the same field() helper
  // and differ only in their id prefix and the tag they send, so one validator
  // serves all three — copied from validate() in the page's own runtime, with email
  // optional to match every other lead path on this page.
  var FORMS = {
    'lp2-form': { prefix: 'lp2-', tag: 'modal' },
    'lp2-mid-form': { prefix: 'lp2-mid-', tag: 'mid-page' },
    'hero-form': { prefix: 'hero-', tag: 'hero' }
  };

  // While a lead form's fields or submit button are in the viewport on mobile, the
  // floating buttons and sticky bar stand down — see the [data-lp2-atform] rule for
  // why. Extended to the hero form and the closing #tour form alongside the
  // mid-page one, since this page now carries three inline forms a floating button
  // could sit on top of.
  //
  // This script runs at parse time, before the DC runtime's own first render pass
  // (the one that swaps <x-dc>'s contents in wholesale, well after DOMContentLoaded
  // under any real-world throttling) — so the very first measure() call below finds
  // none of these ids yet and leaves the flag off, same as always. That never
  // mattered while every inline form started below the fold: a real scroll always
  // arrived before the visitor could reach one, and re-ran measure() with the
  // now-real elements in place. The hero form breaks that assumption — it's meant
  // to be on screen with zero scrolling — so a body-level MutationObserver re-runs
  // measure() after that render pass lands, the same "watch a stable ancestor,
  // re-query fresh each time" approach the id lookups above already use, for the
  // same reason: any node this observed directly would be the one React replaces.
  //
  // Left running for the page's lifetime rather than disconnecting after the
  // first quiet gap: measured in production, the runtime's own render pass does
  // not always land as one atomic burst (real GTM/fonts/Vimeo contending for the
  // main thread), so a one-shot "settle once, then stop watching" observer can
  // fire on an early, irrelevant gap, find nothing yet, and never get a second
  // chance once the real form actually lands. A live, still-debounced observer
  // also self-heals the flag if the runtime re-renders again later (this same
  // runtime is known to re-render <x-dc> on scroll-threshold or media-query
  // changes, not just once on load). measure() itself is cheap and idempotent,
  // so leaving this armed indefinitely costs nothing.
  (function () {
    var ids = ['tour-form', 'hero-form', 'tour'];
    var ticking = false;
    function measure() {
      ticking = false;
      var on = false;
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (!el) continue;
        var r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < (window.innerHeight || 0)) { on = true; break; }
      }
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
    if (window.MutationObserver) {
      var settleTimer = null;
      var mo = new MutationObserver(function () {
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(onScroll, 150);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    measure();
  })();

  // lead_form_view: 50% visible, re-queried by id on scroll rather than an
  // IntersectionObserver, for the same reason the atform measurer above is one —
  // this script runs before the DC runtime mounts, so any node it observed inside
  // <x-dc> would be replaced out from under the observer on the page's first
  // re-render.
  (function () {
    var FORM_VIEW = { 'hero-form': 'hero', 'tour-form': 'mid-page', 'tour': 'end-of-page' };
    var seen = {};
    var ticking = false;
    function measure() {
      ticking = false;
      Object.keys(FORM_VIEW).forEach(function (id) {
        if (seen[id]) return;
        var el = document.getElementById(id);
        if (!el) return;
        var r = el.getBoundingClientRect();
        var vh = window.innerHeight || 0;
        var visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        if (r.height > 0 && visible / r.height >= 0.5) {
          seen[id] = true;
          track('lead_form_view', { form: FORM_VIEW[id] });
        }
      });
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

  // lead_form_start: first input into any of the four lead forms, once each per
  // page view. Matched by id prefix rather than a wrapping <form> id, so the same
  // check covers the bottom form too — its <form> carries no id, only the <section>
  // around it does.
  (function () {
    var PREFIXES = [['hero-', 'hero'], ['lp2-mid-', 'mid-page'], ['lp2-', 'modal'], ['f-', 'end-of-page']];
    var started = {};
    document.addEventListener('input', function (ev) {
      var id = ev.target && ev.target.id;
      if (!id) return;
      for (var i = 0; i < PREFIXES.length; i++) {
        if (id.indexOf(PREFIXES[i][0]) !== 0) continue;
        var tag = PREFIXES[i][1];
        if (!started[tag]) { started[tag] = true; track('lead_form_start', { form: tag }); }
        return;
      }
    }, true);
  })();

  // phone_click: every tel: link on this page carries data-phone-loc.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href^="tel:"]');
    if (!a) return;
    track('phone_click', { phone_location: a.getAttribute('data-phone-loc') || 'content' });
  });

  // The locations card is a <div>, not an <a>, precisely so its own "Check
  // Availability" and "Get directions" buttons can be ordinary nested anchors —
  // wrapping the whole card in a real <a> the way "make it all clickable" usually
  // means would nest an anchor inside an anchor. A click that lands on either
  // button takes its own href as normal; anywhere else on the card opens Maps.
  document.addEventListener('click', function (ev) {
    var card = ev.target && ev.target.closest && ev.target.closest('[data-maps-url]');
    if (!card || (ev.target.closest && ev.target.closest('a'))) return;
    var url = card.getAttribute('data-maps-url');
    if (url) window.open(url, '_blank', 'noopener');
  });

  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    var spec = form && FORMS[form.id];
    if (!spec) return;
    ev.preventDefault();
    track('lead_form_submit_attempt', { form: spec.tag });

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
      track('lead_form_error', { form: spec.tag, field: firstBad });
      var el = document.getElementById(IDS[firstBad]);
      if (el) el.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    // The same three steps the inline form takes, so the lead lands in the same place:
    // the thank-you page reads on-lead to greet the visitor, __onSendLead carries the
    // payload and its UTM capture to the webhook, then the redirect. No honeypot on
    // this page's forms any more — see __onSendLead's own comment for why flagging
    // replaced it, which is also why there is nothing left here to read into a trap key.
    var lead = {
      name: f.fullName.trim(), phone: f.phone.trim(), email: f.email.trim(),
      business: (f.business || '').trim(), form: spec.tag
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
// forceErrorUi: for a field that is optional (empty passes) but still format-
// validated when filled, which needs the error paragraph business never does,
// since business has no format rule to ever report. Only matters when optional
// is also true; a required field already gets the error UI. Nothing currently
// calls this true — only the chat widget has an optional, format-validated
// email, and the chat has its own separate implementation — but the field stays
// so a future optional-and-validated field doesn't have to reinvent it.
const leadField = (prefix, id, label, type, auto, optional, forceErrorUi) => {
  const showError = !optional || forceErrorUi;
  return '        <div>\n' +
  `          <label for="${prefix}${id}">${label}${optional ? ' <i>(optional)</i>' : ''}</label>\n` +
  `          <input class="input" id="${prefix}${id}" name="${id}" type="${type}" autoComplete="${auto}"` +
  (optional ? '' : ' aria-required="true"') +
  (showError ? ` aria-describedby="${prefix}${id}-err"` : '') + ' />\n' +
  (showError ? `          <p class="lp2-err" id="${prefix}${id}-err" role="alert"></p>\n` : '') +
  '        </div>\n';
};

/** The four fields, in order, plus the honeypot on every page that has not opted
 *  into v2. Sharing this is the point: a form that asked for different things, or
 *  protected itself differently, would be a second thing to keep in sync — which is
 *  also why v2 is a real parameter here rather than a second copy of this function:
 *  this same call builds the fields for the tour modal AND the mid-page section on
 *  every shortened-variant page, v2 or not, so the honeypot can only correctly
 *  differ per page by being threaded through, not by branching at the call site.
 *  Name, phone and email are required on every one of these forms — the only
 *  place email is optional anywhere on this page is the chat widget, which has
 *  its own separate implementation (scripts/chat-widget.mjs) and isn't built
 *  through this helper at all.
 *
 *  The honeypot is never shown, never focusable and never announced, so a person cannot
 *  fill it and a form-filling bot usually will. Off-screen rather than display:none,
 *  which the cruder bots check for. "Company website" is plausible on purpose — exactly
 *  the kind of field an autofiller reaches for. It is read into the lead's `trap` key and
 *  dropped at __onSendLead, the one seam every path shares. v2 drops it entirely: see
 *  __onSendLead's own comment for why flagging replaced dropping the lead outright. */
const leadFields = (prefix, v2) =>
  leadField(prefix, 'name', 'Full name', 'text', 'name') +
  leadField(prefix, 'phone', 'Phone', 'tel', 'tel') +
  leadField(prefix, 'email', 'Email', 'email', 'email') +
  leadField(prefix, 'business', 'Business name', 'text', 'organization', true) +
  (v2 ? '' :
  '        <div class="lp2-hp" aria-hidden="true">\n' +
  `          <label for="${prefix}website">Company website</label>\n` +
  `          <input id="${prefix}website" name="website" type="text" tabindex="-1" autoComplete="off" />\n` +
  '        </div>\n');

/** Strips comments and collapses whitespace, but never inside a quoted string --
 *  this CSS leans on [style*="..."] attribute selectors (the mobile padding
 *  overrides, the atform fade rule, more) whose quoted value has to byte-match
 *  literal inline style="" text written elsewhere in the page. A whitespace-
 *  collapsing regex applied blindly (confirmed by testing one against this exact
 *  file) silently turns `[style*="display: flex"]` into `[style*="display:flex"]`
 *  -- a selector that then matches nothing, ever, with no error and no visible
 *  symptom beyond a rule quietly not applying. Tracking quote state avoids that
 *  class of bug entirely, at the cost of being a little less aggressive than a
 *  real CSS parser would be (selector combinators like `.a > b` keep their
 *  spaces) -- a trade this file takes deliberately, since silent breakage is a
 *  far worse outcome than a few hundred extra bytes. */
function minifyCss(css) {
  const DELIMS = new Set(['{', '}', ';', ',', ':']);
  let out = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = (end === -1 ? css.length : end + 1);
      continue;
    }
    if (/\s/.test(ch)) {
      let j = i;
      while (j < css.length && /\s/.test(css[j])) j++;
      const prev = out[out.length - 1];
      const next = css[j];
      if (!DELIMS.has(prev) && !(next !== undefined && DELIMS.has(next))) out += ' ';
      i = j - 1;
      continue;
    }
    if (DELIMS.has(ch) && out[out.length - 1] === ' ') out = out.slice(0, -1);
    out += ch;
  }
  return out.replace(/;}/g, '}').trim();
}

/** Comments removed, nothing else touched -- used only to give assertQuotesPreserved
 *  a fair, apples-to-apples "before" to compare against. Without this, a naive
 *  quote-scan of the raw source treats every English contraction in a comment
 *  (form's, wasn't, doesn't) as an opening quote and then runs to the next
 *  apostrophe anywhere in the file looking for a close, which is nowhere near what
 *  minifyCss's own, correctly comment-aware quote tracking actually does. */
function stripCommentsOnly(css) {
  let out = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = (end === -1 ? css.length : end + 1);
      continue;
    }
    out += ch;
  }
  return out;
}

/** Proven, not trusted (see minifyCss's own comment): every quoted string that
 *  survives comment-stripping must appear, byte-for-byte, in the minified output
 *  -- the one thing minifyCss must never change. A single multiset comparison
 *  catches any regression here regardless of which future edit to LP2_CSS/
 *  LP2_V2_CSS causes it, without needing to know in advance what that edit is. */
function assertQuotesPreserved(sourceCss, minifiedCss, label) {
  const quoted = (s) => (s.match(/"[^"]*"|'[^']*'/g) || []).sort();
  const before = quoted(stripCommentsOnly(sourceCss));
  const after = quoted(minifiedCss);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`[build] ${label}: minifyCss changed a quoted string's contents -- refusing to ship it.`);
  }
}

export function transform(html, { replaceExactly, v2 = false, hero = null }) {
  let out = html;

  const lp2CssMin = minifyCss(LP2_CSS);
  assertQuotesPreserved(LP2_CSS, lp2CssMin, 'LP2_CSS');

  // The stylesheet for everything this file adds.
  out = replaceExactly(out, '</head>', lp2CssMin + '</head>', 1, 'lp2 stylesheet');
  if (v2) {
    const lp2V2CssMin = minifyCss(LP2_V2_CSS);
    assertQuotesPreserved(LP2_V2_CSS, lp2V2CssMin, 'LP2_V2_CSS');
    out = replaceExactly(out, '</head>', lp2V2CssMin + LP2_V2_HEAD_JS + '</head>', 1, 'lp2 v2 head additions');
  }

  // ---- RED LINE: the one allowed change inside __onSendLead ------------------
  // leadSenderScript() (scripts/build.mjs) already ran by the time this file sees
  // the page, so its output is just more text here — reached the same way as
  // everything else in this function, not by touching leadSenderScript() itself.
  // Every other line of that script — webhook URL, transport, payload keys, PAGE,
  // the no-interaction gate, the generate_lead push — is untouched.
  if (v2) {
    out = replaceExactly(
      out,
      `    var suspect = null;
    if (lead && lead.trap) suspect = 'honeypot';
    else if (!human) suspect = 'no-interaction';
    if (suspect) {
      trace('FLAGGED as ' + suspect + ' — delivered anyway, filter it in the receiver',
        suspect === 'honeypot'
          ? 'the hidden "Company website" field had a value — usually browser autofill, not a bot'
          : 'no pointer, key or touch event was seen on this page before submit');
    }`,
      `    var suspect = null;
    if (!human) suspect = 'no-interaction';
    if (suspect) {
      trace('FLAGGED as ' + suspect + ' — delivered anyway, filter it in the receiver',
        'no pointer, key or touch event was seen on this page before submit');
    }`,
      1,
      'v2 RED LINE: drop the honeypot branch'
    );
    // 'hero' joins the four existing form tags so the new Hero form reads the same
    // as the other three in whatever reads this field downstream.
    out = replaceExactly(
      out,
      `  var FORM_NAMES = {
    'mid-page': 'Form 1 (top)',
    'end-of-page': 'Form 2 (bottom)',
    'modal': 'Button (popup)',
    'chat': 'Chat'
  };`,
      `  var FORM_NAMES = {
    'hero': 'Form 0 (hero)',
    'mid-page': 'Form 1 (top)',
    'end-of-page': 'Form 2 (bottom)',
    'modal': 'Button (popup)',
    'chat': 'Chat'
  };`,
      1,
      'v2: hero in FORM_NAMES'
    );
  }

  // ---- v2: funnel tracking on the bottom (#tour) form -----------------------
  // This is the export's own DCLogic validate()/submit(id, ev) — the no-JS
  // fallback and the closing form on every shortened-variant page — reached the
  // same way as everything else here, since buildLandingPage() already ran by the
  // time this file sees the page. validate() also serves the export's own mid
  // ('m-') form, which /lp still carries; harmless there too, since /lp never sets
  // v2 and this whole block is skipped for it. Email here stays required, same as
  // every other form on this page except the chat — see leadField()'s call site
  // and the bottom form's own markup fix (section 24) for the other two.
  if (v2) {
    out = replaceExactly(
      out,
      `  submit(id, ev) {
    ev.preventDefault();
    const cur = this.state.forms[id];
    if (cur.status === 'loading') return;
    const e = this.validate(cur.f);
    if (Object.keys(e).length) {
      this.patchForm(id, () => ({ e, status: 'idle' }));
      const first = document.getElementById(FIELD_IDS[id][Object.keys(e)[0]]);
      if (first) first.focus();
      return;
    }
    this.patchForm(id, () => ({ e: {}, status: 'loading' }));`,
      `  submit(id, ev) {
    ev.preventDefault();
    if (window.__lp2Track) window.__lp2Track('lead_form_submit_attempt', { form: id === 'end' ? 'end-of-page' : 'mid-page' });
    const cur = this.state.forms[id];
    if (cur.status === 'loading') return;
    const e = this.validate(cur.f);
    if (Object.keys(e).length) {
      if (window.__lp2Track) window.__lp2Track('lead_form_error', { form: id === 'end' ? 'end-of-page' : 'mid-page', field: Object.keys(e)[0] });
      this.patchForm(id, () => ({ e, status: 'idle' }));
      const first = document.getElementById(FIELD_IDS[id][Object.keys(e)[0]]);
      if (first) first.focus();
      return;
    }
    this.patchForm(id, () => ({ e: {}, status: 'loading' }));`,
      1,
      'v2: bottom form tracking'
    );
  }

  // ---- v2: email optional in the chat --------------------------------------
  // Not a copy of the business step's `optional: true` pattern: send() below skips
  // check() entirely for an optional step, which is right for business (no format
  // rule exists for it) and wrong for email (a typed, invalid address would then
  // reach __onSendLead unchecked). Three coordinated edits instead: the step
  // itself becomes optional so the Skip button appears, check()'s email branch
  // passes an empty answer instead of rejecting it, and send() always calls
  // check() — harmless for business, whose check() branch already only ever
  // returns ''. addChatWidget() runs before this file, so CHAT_JS's assembled
  // text is already in `out` by the time this line runs, the same as every other
  // v2 edit here.
  if (v2) {
    // CHAT_JS.replace('__STEPS__', JSON.stringify(CHAT_STEPS)) in addChatWidget()
    // (scripts/build.mjs, runs before this file) leaves this as compact, single-line
    // JSON — not the multi-line object literal chat-widget.mjs itself is written as.
    out = replaceExactly(
      out,
      `{"key":"email","ask":"Your email?","placeholder":"Email","type":"email"}`,
      `{"key":"email","ask":"Your email?","placeholder":"Email","type":"email","optional":true}`,
      1,
      'v2: chat email step optional'
    );
    out = replaceExactly(
      out,
      `    if (key === 'email') {
      if (!s) return 'Please enter your email.';
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(s) ? '' : 'That email address does not look right.';
    }`,
      `    if (key === 'email') {
      if (!s) return '';
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(s) ? '' : 'That email address does not look right.';
    }`,
      1,
      'v2: chat check() email passes empty'
    );
    out = replaceExactly(
      out,
      `    var err = step.optional ? '' : check(step.key, v);`,
      `    var err = check(step.key, v);`,
      1,
      'v2: chat send() always validates'
    );
    // chat_open when the launcher actually opens the panel (open() toggles closed
    // again if it's already open, via the early `return close();` above this line
    // — so this line only runs on a genuine open). chat_step names the step key
    // only, right after it is recorded as answered — never the visitor's answer.
    out = replaceExactly(
      out,
      `    root.setAttribute('data-on-chat', '');`,
      `    root.setAttribute('data-on-chat', '');
    if (window.__lp2Track) window.__lp2Track('chat_open', {});`,
      1,
      'v2: chat_open event'
    );
    out = replaceExactly(
      out,
      `    answers[step.key] = v;`,
      `    if (window.__lp2Track) window.__lp2Track('chat_step', { step: step.key });
    answers[step.key] = v;`,
      1,
      'v2: chat_step event'
    );
    // No promised call time here either — matches the sub-line every other lead
    // path on this page now uses (section 5: CTA -> heading -> sub-line -> button
    // -> this message, one consistent story).
    out = replaceExactly(
      out,
      `say('Thanks, ' + first + '. Request received. One of our team will call you shortly to set a time at our Central Los Angeles kitchen.', 'bot');`,
      `say('Thanks, ' + first + '. Request received. Our team will call you back shortly.', 'bot');`,
      1,
      'v2: chat closing message'
    );
  }

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
      '<div class="lp2-also" id="included">\n' +
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
    // The nav's "What's Included" keeps its own href="#included". The section it named
    // is gone from this page, and this list is what replaced it, so the list carries the
    // id. The link used to be rewritten to #kitchens instead, which made it land exactly
    // where "Kitchens" does: a visitor who clicked Kitchens and then What's Included saw
    // nothing move, which session recordings show as a dead click. /lp is unaffected
    // either way, since there #included is still a real section.
  }

  // ---- 3b. v2: the equipment tabs become one open, scannable list -------------
  // Visitors opened every tab in sequence, 1-2s each — the content was wanted,
  // just hidden one click at a time behind five buttons. Cut is safe by
  // construction: isGalN/setGalN (state.gal) are used nowhere else on the page,
  // so removing the five tabpanels and their tablist leaves no dangling
  // reference, the same guarantee step 12 below already checks for a different
  // image. Photos and the one-line intro under each heading go too — "compact"
  // and "five photographs" don't fit together — leaving grouped headings and
  // short bullets only, the same dt/dd density "Also included" right below it
  // already uses.
  if (v2) {
    const TABS = /<div role="tablist" aria-label="Kitchen equipment categories"[\s\S]*?<\/sc-if>\n\n    (?=<div class="lp2-also")/;
    const found = (out.match(TABS) || []).length;
    if (found !== 1) throw new Error(`[lp2] v2 equipment spec list: expected 1 tabs block, found ${found}.`);
    const GROUPS = [
      ['Cooking &amp; Ventilation', ['Commercial exhaust hood, 8 to 12 feet', 'Extraction &amp; ventilation', 'Commercial cooling system']],
      ['Sanitation', ['Three compartment sink', 'Hand wash sink', 'Commercial dishwasher &amp; dishwashing area', 'Hygienic walls &amp; skirting']],
      ['Storage &amp; Cold Chain', ['Walk-in cooler', 'Walk-in freezer', 'Dry storage']],
      ['Utilities &amp; Safety', ['3 phase electricity', 'Fire suppression system']],
      ['Logistics', ['Two loading docks / landing areas', 'Food delivery pickup area']],
    ];
    const list =
      '<div class="lp2-spec-list">\n' +
      GROUPS.map(([name, items]) =>
        '      <div class="lp2-spec-group">\n' +
        `        <h3>${name}</h3>\n` +
        '        <ul>\n' +
        items.map((it) => `          <li>${it}</li>\n`).join('') +
        '        </ul>\n' +
        '      </div>\n'
      ).join('') +
      '    </div>\n\n    ';
    out = out.replace(TABS, list);
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
      `<section class="lp2-cta" data-band="dark" data-rev aria-label="${v2 ? 'Check availability' : 'Schedule a tour'}">\n` +
      '    <div>\n' +
      '      <h2>Seen enough? Come see it in person.</h2>\n' +
      (v2
        ? '      <p>See the space and get your questions answered.</p>\n'
        : '      <p>Sizes, terms and pricing are all covered on the tour.</p>\n') +
      `      <a href="#tour" class="btn btn-primary blueprint"${v2 ? ' data-cta-loc="content"' : ''} style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 28px; min-height: 52px;">${v2 ? 'Check Availability' : 'Schedule a Tour'}</a>\n` +
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
    // v2: "What does it cost?" (index 7) is dropped outright rather than kept and
    // reordered — the brief removes pricing from the page entirely, FAQ answer
    // included. Dropping it is also what fixes a mismatch that existed even
    // before v2: index 0 ("How big are the kitchens?") is the one FAQ item open
    // by default (faqDefaultOpen, the export's own DCLogic component) and was
    // already unaffected by this reorder — it just used to display second, behind
    // index 7. With index 7 gone it displays first, so the default-open item and
    // the first item on screen are finally the same one, with no other code
    // needing to change to make that true.
    //           cost   size   private/hourly   what you need
    const keep = v2 ? [0, 1, 6] : [7, 0, 1, 6];
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
    // One map, not two: build.mjs's singleLocation() runs before this and collapses the
    // two facilities into one before the variant ever sees the page.
    const found = (out.match(MAP) || []).length;
    if (found !== 1) throw new Error(`[lp2] locations: expected 1 map, found ${found}.`);
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
    //
    // v2 drops the hint text on all four scrollers (this one included) — the
    // carousels and native swipe stay exactly as they are, CSS only, so nothing
    // here needs to change beyond skipping the four calls that add the text. The
    // equipment-tabs one specifically would fail outright on a v2 page regardless:
    // step 3b above already removed <div role="tablist"> before this line runs.
    if (!v2) {
      out = hintAfter(out, '<dl class="lp2-track"', '</dl>', 'who-it-is-for hint');
      out = hintAfter(out, '<ol class="lp2-track"', '</ol>', 'how-it-works hint');
      // The tab row is the fourth scroller and the worst offender: 397px of it is off
      // screen at 390px. It is a flex row of five buttons and nothing else, so the
      // first </div> after it is its own.
      out = hintAfter(out, '<div role="tablist"', '</div>', 'equipment tabs hint', 'lp2-hint-tabs');
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
  if (!v2) {
    const i = out.indexOf('<div class="lp2-track" style="display: grid');
    const j = out.indexOf('</section>', i);
    out = out.slice(0, j) + '  <p class="lp2-hint" aria-hidden="true">Swipe for more &rarr;</p>\n  ' + out.slice(j);
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
    ['Onboarding, permitting, Health Department support.', 'We handle the paperwork.', 'permitting in step 03'],
    // Lives in the Cooking & Ventilation tab's own intro paragraph — v2 already
    // removed it, along with the rest of the tab panels, in step 3b above.
    ...(v2 ? [] : [[
      'Hood capacity sized for real production, with the extraction and cooling to keep the room workable through a full service.',
      'Sized for real production, and the cooling to keep the room workable through a full service.', 'hood in the tab intro',
    ]]),
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

  // ---- 12. the "this could be you" photograph is checked out of the way -------
  // could-be-you.webp is the one asset that asks the reader to picture themselves in
  // the space rather than telling them about it — THIS COULD BE YOU over the cook,
  // AND THIS COULD BE YOUR KITCHEN over the line, YOUR LOGO COULD BE HERE over a
  // blank kraft bag. In the export it sits inside the mid-page lead form; step 4
  // dropped that form from this page, and the image went with it.
  //
  // It comes back in step 15, beside the form rather than as a band of its own. It
  // was a full-bleed band here for a while and that was wrong: 932px of photograph
  // with nothing to do next, then a separate headline underneath that read as
  // unrelated to it. The picture is an argument for the form, so it belongs in the
  // same frame as the form. Only the "is it gone?" assertion stays here, next to the
  // step whose removal it is checking.
  {
    const IMG = out.match(/<img src="assets\/could-be-you\.webp"[^>]*>/);
    if (IMG) throw new Error('[lp2] could-be-you: already on the page — step 4 should have removed it.');
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
    const ALT = 'A cook plating bowls in a stainless commercial kitchen, annotated: this could be you, and this could be your kitchen, your logo could be here';
    const section =
      // id="tour-form", not "tour-mid": the export's #tour-mid was cut by step 4, and
      // reusing the name would silently revive two stale href="#tour-mid" buttons that
      // sit BELOW this section — clicking them would scroll the visitor backwards. Those
      // two are repointed at the modal just below instead.
      '<section id="tour-form" class="lp2-mid" data-band="dark" aria-labelledby="lp2-mid-title">\n' +
      '    <div>\n' +
      // The photograph is the left column, not a band above. It is the argument for the
      // form — "this could be you" is a reason to book a tour — so the two belong in one
      // frame, sized against each other, rather than as a 932px picture followed by an
      // unrelated-looking headline.
      '      <figure class="lp2-mid-shot">\n' +
      `        <img src="assets/could-be-you.webp" alt="${ALT}" loading="lazy" width="1200" height="932" />\n` +
      '      </figure>\n' +
      '      <div class="lp2-mid-ask">\n' +
      // A question the reader is already asking, then the instruction. Short on purpose:
      // two earlier drafts explained the offer here and the page has already made that
      // case three times by this point, so anything past the ask is delay. No promise
      // about call timing either, which is one less thing for someone to have to keep.
      `        <span class="lp2-mid-eyebrow">${v2 ? 'Check availability' : 'Book a tour'}</span>\n` +
      '        <h2 id="lp2-mid-title">Ready to see your kitchen?</h2>\n' +
      (v2
        ? '        <p>Leave your details and our team will call you back.</p>\n'
        : '        <p>Leave your details and we&rsquo;ll call you to schedule a tour.</p>\n') +
      '        <form id="lp2-mid-form" noValidate>\n' +
      leadFields('lp2-mid-', v2) +
      `        <button type="submit" class="btn btn-primary blueprint">${v2 ? 'Check Availability' : 'Book My Tour'}</button>\n` +
      (v2
        ? '        <p class="lp2-mid-phone">Prefer to talk? Call <a href="tel:+18444351633" data-phone-loc="form">435-1633 (844)</a></p>\n'
        : '') +
      '        </form>\n' +
      '      </div>\n' +
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
      `      <span class="lp2-modal-eyebrow">${v2 ? 'Check availability' : 'Schedule a tour'}</span>\n` +
      '      <h2 id="lp2-modal-title">Come see the kitchen you&rsquo;d be cooking in.</h2>\n' +
      (v2
        ? '      <p>Leave your details and our team will call you back.</p>\n'
        : '      <p>Leave your details and we&rsquo;ll call to set a time at our Central Los Angeles kitchen.</p>\n') +
      '      <form id="lp2-form" noValidate>\n' +
      leadFields('lp2-', v2) +
      `        <button type="submit" class="btn btn-primary blueprint">${v2 ? 'Check Availability' : 'Schedule My Tour'}</button>\n` +
      (v2
        ? '        <p class="lp2-modal-phone">Prefer to talk? Call <a href="tel:+18444351633" data-phone-loc="form">435-1633 (844)</a></p>\n'
        : '') +
      '      </form>\n' +
      '    </div>\n' +
      '  </div>\n\n  ';
    out = replaceExactly(out, '</main>', '</main>\n\n  ' + modal.trim() + '\n', 1, 'lead modal markup');
    out = replaceExactly(out, '</body>', (v2 ? LP2_MODAL_JS_V2 : LP2_MODAL_JS) + '</body>', 1, 'lead modal script');
  }

  // ---- 17. v2: the hero gets its own inline form ------------------------------
  // Visitors' first actions were hunting for what, where, what's included, the
  // rental model and size — and 12 of 14 recorded popup opens closed again within
  // 0-4 seconds without anyone typing. The fix in step 1 makes the popup behave;
  // this step means a visitor never has to open it in the first place. The
  // headline stays descriptive (this page's own hero.lines, in scripts/build.mjs)
  // rather than becoming part of this step, since that field was already per-page
  // before v2 existed. Two more things move in with the form: the supporting
  // sentence changes to name the concrete facts visitors were hunting for, and the
  // CTA button + its commented-out phone link are replaced outright — a button
  // that only opened the same popup step 1 already reaches from six other places
  // on this page was the least useful CTA on it, once a form sits right next to it.
  if (v2) {
    out = replaceExactly(
      out,
      '<div style="position: relative; z-index: 3; width: 100%; max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto; padding: clamp(88px, 11vh, 150px) var(--edge) clamp(44px, 6vw, 76px);">',
      '<div class="lp2-hero-wrap" style="position: relative; z-index: 3; width: 100%; max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto; padding: clamp(88px, 11vh, 150px) var(--edge) clamp(44px, 6vw, 76px);">\n      <div class="lp2-hero-copy">',
      1,
      'v2: open hero copy column'
    );
    // Mobile needs the headline+form to fit above the fold, and the full 3-line
    // headline is too tall to get there no matter how much padding is trimmed —
    // see the mobile reorder CSS below for the rest of the story. Rather than
    // rewrite the one headline both breakpoints share, this adds a second,
    // shorter one: full version keeps its exact text for desktop (just tagged so
    // the mobile CSS can hide it), short version is new and mobile-only. Only one
    // is ever in the accessibility tree at a time — display:none removes the
    // other from it completely, the same as any responsive image-swap pattern.
    // mobileLines defaults to the same three lines as desktop when a page has
    // no hand-abbreviated version (see the PAGES registry comment on this) --
    // taller on a phone than ghost-kitchen's own tuned 2-line version, never
    // wrong, never invented.
    const mobileLines = hero.mobileLines || hero.lines;
    const h1Spans = (lines) =>
      lines
        .map((line, i) =>
          i === lines.length - 1
            ? `<span style="display: block; color: var(--color-accent-400);">${line}</span>`
            : `<span style="display: block;">${line}</span>`
        )
        .join('\n        ');
    // The find pattern has to be reconstructed from THIS page's own hero.lines
    // too, not ghost-kitchen's: heroOverride() (scripts/build.mjs) has already
    // run by the time transform() sees this HTML, so the real hero's H1
    // already carries this page's own words, in exactly this shape (one span
    // per line, unclassed, the last one carrying the accent colour) — the
    // same shape h1Spans() below produces, which is what makes reusing it for
    // the find side safe rather than a second, drifting copy of the markup.
    out = replaceExactly(
      out,
      `<h1 style="font-family: var(--font-heading); font-weight: 600; font-size: clamp(44px, 6.4vw, 88px); line-height: 1.03; letter-spacing: 0.01em; text-transform: uppercase; margin: 0 0 0 -0.052em; text-shadow: 0 1px 24px rgba(20, 20, 20, 0.45);">
        ${h1Spans(hero.lines)}
      </h1>`,
      `<h1 class="lp2-hero-h1-full" style="font-family: var(--font-heading); font-weight: 600; font-size: clamp(44px, 6.4vw, 88px); line-height: 1.03; letter-spacing: 0.01em; text-transform: uppercase; margin: 0 0 0 -0.052em; text-shadow: 0 1px 24px rgba(20, 20, 20, 0.45);">
        ${h1Spans(hero.lines)}
      </h1>
      <h1 class="lp2-hero-h1-mobile" style="font-family: var(--font-heading); font-weight: 600; font-size: clamp(30px, 8vw, 38px); line-height: 1.08; letter-spacing: 0.01em; text-transform: uppercase; margin: 0 0 0 -0.052em; text-shadow: 0 1px 24px rgba(20, 20, 20, 0.45);">
        ${h1Spans(mobileLines)}
      </h1>`,
      1,
      'v2: mobile-only short headline alongside the full one'
    );
    // Pre-copy-sweep text: LOCATION_COPY/COPY_DASHES (scripts/build.mjs) run as a
    // later, separate pass over the files already written to dist/, after
    // buildLandingPage() — and therefore variant.transform() — has already run and
    // returned. So this file still sees "Van Nuys and Los Angeles" and the export's
    // own em dash here, not the swept text the finished page ends up with. Moot
    // either way for v2: the replacement below matches neither phrase, so the later
    // sweep finds nothing to do on this page and the em-dash guard has nothing left
    // to catch.
    // Same duplicate-and-tag approach as the headline just above: the full
    // sentence (with the specifics — 200-600 sq ft, permitting, Health
    // Department) stays for desktop and reappears below the form on mobile; a
    // short, one-sentence version is new and sits above the form on mobile only.
    if (!hero.sub || !hero.subShort) {
      throw new Error('v2: hero stand-in needs hero.sub and hero.subShort -- got ' + JSON.stringify(hero));
    }
    out = replaceExactly(
      out,
      '<p style="font-size: 18px; line-height: 28px; max-width: 54ch; margin: 26px 0 0; color: color-mix(in srgb, #FAF8F5 88%, transparent);">Private, fully certified commercial kitchen space in Van Nuys and Los Angeles — already built, already equipped. You bring the menu. We handle zoning, permitting and the city.</p>',
      `<p class="lp2-hero-sub-full" style="font-size: 18px; line-height: 28px; max-width: 54ch; margin: 26px 0 0; color: color-mix(in srgb, #FAF8F5 88%, transparent);">${hero.sub}</p>
      <p class="lp2-hero-sub-short" style="font-size: 16px; line-height: 24px; max-width: 54ch; margin: 14px 0 0; color: color-mix(in srgb, #FAF8F5 88%, transparent);">${hero.subShort}</p>`,
      1,
      'v2: hero supporting line (full, desktop) + short mobile-only line'
    );
    out = replaceExactly(
      out,
      `      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px;">
        <a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 26px; min-height: 52px;">
          Schedule a Tour
        </a>
        <!-- PHONE CTA (disabled — uncomment to restore) hero
<a href="tel:+18444351255" class="btn btn-secondary" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 22px; min-height: 52px; gap: 9px; color: #FAF8F5; border-color: color-mix(in srgb, #FAF8F5 42%, transparent);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.8.7 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.27a2 2 0 0 1 2.11-.45c.85.34 1.75.57 2.65.7A2 2 0 0 1 22 16.92z"></path></svg>
          (844) 435-1255
        </a>
-->
      </div>`,
      `      <p class="lp2-hero-phone-line">Call <a href="tel:+18444351633" data-phone-loc="hero">435-1633 (844)</a></p>
      <ul class="lp2-hero-facts">
        <li>USC / Central Los Angeles</li>
        <li aria-hidden="true">&middot;</li>
        <li>Free gated parking</li>
        <li aria-hidden="true">&middot;</li>
        <li>24/7 access</li>
      </ul>`,
      1,
      'v2: hero CTA becomes phone + facts line'
    );
    // Tagged so the mobile reorder CSS can move it below the form — it's the
    // same "24/7 Access · Private Kitchens · Monthly or Hourly" row the export
    // always had here, untouched and unmoved on desktop.
    out = replaceExactly(
      out,
      '<ul style="list-style: none; margin: 34px 0 0; padding: 16px 0 0; border-top: 1px solid color-mix(in srgb, #FAF8F5 30%, transparent); display: flex; flex-wrap: wrap; gap: 10px 26px; font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: color-mix(in srgb, #FAF8F5 82%, transparent);">',
      '<ul class="lp2-hero-badges-full" style="list-style: none; margin: 34px 0 0; padding: 16px 0 0; border-top: 1px solid color-mix(in srgb, #FAF8F5 30%, transparent); display: flex; flex-wrap: wrap; gap: 10px 26px; font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: color-mix(in srgb, #FAF8F5 82%, transparent);">',
      1,
      'v2: tag the badges row so mobile can hide it in favor of a one-line version'
    );
    out = replaceExactly(
      out,
      `        <li>Monthly or Hourly</li>
      </ul>
    </div>
  </section>`,
      `        <li>Monthly or Hourly</li>
      </ul>
      <ul class="lp2-hero-badges-mobile" style="list-style: none; margin: 34px 0 0; padding: 16px 0 0; border-top: 1px solid color-mix(in srgb, #FAF8F5 30%, transparent); display: flex; flex-wrap: wrap; gap: 8px 6px; font-family: var(--font-heading); font-weight: 600; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: color-mix(in srgb, #FAF8F5 82%, transparent);">
        <li>24/7 Access</li>
        <li aria-hidden="true" style="color: var(--color-accent-400);">&middot;</li>
        <li>Private</li>
        <li aria-hidden="true" style="color: var(--color-accent-400);">&middot;</li>
        <li>Monthly/Hourly</li>
      </ul>
      </div>
      <div class="lp2-hero-form-card" id="hero-form-card">
        <h2>Check availability for your kitchen</h2>
        <form id="hero-form" noValidate>
` + leadFields('hero-', v2) +
      `          <button type="submit" class="btn btn-primary blueprint">Check Availability</button>
          <p class="lp2-hero-form-phone">Prefer to talk? Call <a href="tel:+18444351633" data-phone-loc="hero">435-1633 (844)</a></p>
        </form>
      </div>
    </div>
  </section>`,
      1,
      'v2: close hero copy column, add form card'
    );
  }

  // ---- 18. v2: the new number, everywhere it belongs --------------------------
  // Every phone number on the page is already dead code — all of it sits inside
  // <!-- PHONE CTA (disabled — uncomment to restore) X --> comments and none of it
  // renders (confirmed: zero live tel: links anywhere in the built site). The four
  // required placements below are uncommented AND renumbered in one step, since
  // the number itself is changing, not just its visibility. Three more of these
  // comments exist (easy-upgrade row, the locations "Call" button, the
  // accessibility panel) — left as dead comments: not on the brief's required list,
  // and a comment nobody renders costs nothing to leave alone. A fourth, the
  // mid-form's own phone comment, doesn't exist by the time this file runs at all —
  // step 4 already deleted the whole #tour-mid section it lived in.
  if (v2) {
    out = replaceExactly(
      out,
      `<!-- PHONE CTA (disabled — uncomment to restore) header
<a href="tel:+18444351255" style="font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: 0.04em; text-decoration: none; color: var(--color-accent-700); display: flex; align-items: center; gap: 7px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.8.7 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.27a2 2 0 0 1 2.11-.45c.85.34 1.75.57 2.65.7A2 2 0 0 1 22 16.92z"></path></svg>
          (844) 435-1255
        </a>
-->`,
      `<a href="tel:+18444351633" data-phone-loc="header" style="font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: 0.04em; text-decoration: none; color: var(--color-accent-700); display: flex; align-items: center; gap: 7px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.8.7 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.27a2 2 0 0 1 2.11-.45c.85.34 1.75.57 2.65.7A2 2 0 0 1 22 16.92z"></path></svg>
          435-1633 (844)
        </a>`,
      1,
      'v2: header phone'
    );
    out = replaceExactly(
      out,
      `<!-- PHONE CTA (disabled — uncomment to restore) final CTA
<p style="margin: 18px 0 0; font-family: var(--font-heading); font-weight: 600; font-size: 17px; letter-spacing: 0.06em; text-transform: uppercase;">
            Or call <a href="tel:+18444351255" style="color: var(--color-accent-400);">(844) 435-1255</a>
          </p>
-->`,
      `<p style="margin: 18px 0 0; font-family: var(--font-heading); font-weight: 600; font-size: 17px; letter-spacing: 0.06em; text-transform: uppercase;">
            Or call <a href="tel:+18444351633" data-phone-loc="form" style="color: var(--color-accent-400);">435-1633 (844)</a>
          </p>`,
      1,
      'v2: bottom form phone'
    );
    out = replaceExactly(
      out,
      `<!-- PHONE CTA (disabled — uncomment to restore) footer
<p style="margin: 0 0 4px; font-size: 15px; line-height: 24px;"><a href="tel:+18444351255">(844) 435-1255</a></p>
-->`,
      `<p style="margin: 0 0 4px; font-size: 15px; line-height: 24px;"><a href="tel:+18444351633" data-phone-loc="footer">435-1633 (844)</a></p>`,
      1,
      'v2: footer phone'
    );
    out = replaceExactly(
      out,
      `<!-- PHONE CTA (disabled — uncomment to restore) sticky bar
<a href="tel:+18444351255" aria-label="Call ŌN Kitchens at (844) 435-1255" class="btn btn-secondary" style="width: 56px; min-height: 52px; padding: 0; color: #FAF8F5; border-color: color-mix(in srgb, #FAF8F5 34%, transparent);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.8.7 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.27a2 2 0 0 1 2.11-.45c.85.34 1.75.57 2.65.7A2 2 0 0 1 22 16.92z"></path></svg>
    </a>
-->`,
      `<a href="tel:+18444351633" data-phone-loc="sticky" aria-label="Call ŌN Kitchens at 435-1633 (844)" class="btn btn-secondary" style="width: 56px; min-height: 52px; padding: 0; color: #FAF8F5; border-color: color-mix(in srgb, #FAF8F5 34%, transparent);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.8.7 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.27a2 2 0 0 1 2.11-.45c.85.34 1.75.57 2.65.7A2 2 0 0 1 22 16.92z"></path></svg>
    </a>`,
      1,
      'v2: sticky bar phone'
    );

    // The new floating call button, directly above the chat launcher. The two are
    // independent position:fixed elements with no shared stacking wrapper (unlike
    // the accessibility launcher and its panel, which share one column-reverse
    // flex container) — so the chat panel's own open position is pushed down to
    // clear both buttons stacked on top of one another, patched at the exact rule
    // chat-widget.mjs's CSS ships (reached here the same way as everything else:
    // addChatWidget() already ran).
    out = replaceExactly(
      out,
      `html[data-on-chat] .on-chat-panel {
  display: flex; flex-direction: column;
  position: fixed; right: 16px; bottom: 160px; z-index: 95;`,
      `html[data-on-chat] .on-chat-panel {
  display: flex; flex-direction: column;
  position: fixed; right: 16px; bottom: 236px; z-index: 95;`,
      1,
      'v2: chat panel clears the new call button'
    );
    out = replaceExactly(
      out,
      '</body>',
      '\n<a href="tel:+18444351633" data-phone-loc="fab" class="lp2-call-fab" aria-label="Call ŌN Kitchens">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.8.7 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.27a2 2 0 0 1 2.11-.45c.85.34 1.75.57 2.65.7A2 2 0 0 1 22 16.92z"></path></svg>' +
        '</a>\n</body>',
      1,
      'v2: floating call button'
    );
  }

  // ---- 19. v2: "Check Availability", everywhere the flow said Schedule/Book -----
  // We don't offer calendar booking — the flow is leave details, then a team
  // member calls back — so every CTA that implied picking a date or time changes
  // to the same truthful label, sitewide, plus a data-cta-loc tag for cta_click.
  // Two exceptions, deliberately not touched: the "How it works" step-1 heading
  // ("Book a tour", body copy about a process step, not a promise) and the FAQ's
  // own inline link, which goes away with the whole question in the next step.
  if (v2) {
    out = replaceExactly(
      out,
      '<a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 18px; font-size: 14px; white-space: nowrap;">\n      Schedule a Tour\n    </a>',
      '<a href="#tour" class="btn btn-primary blueprint" data-cta-loc="header" style="text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 18px; font-size: 14px; white-space: nowrap;">\n      Check Availability\n    </a>',
      1,
      'v2: header CTA'
    );
    // Easy-upgrade row and "who it's for" share identical markup, indentation
    // included, so one call with expected count 2 covers both.
    out = replaceExactly(
      out,
      '<a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 24px; min-height: 50px;">\n          Schedule a Tour\n        </a>',
      '<a href="#tour" class="btn btn-primary blueprint" data-cta-loc="content" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 24px; min-height: 50px;">\n          Check Availability\n        </a>',
      2,
      'v2: easy-upgrade + who-its-for CTAs'
    );
    out = replaceExactly(
      out,
      '<a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 24px; min-height: 50px;">\n        Schedule a Tour\n      </a>',
      '<a href="#tour" class="btn btn-primary blueprint" data-cta-loc="content" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 14px 24px; min-height: 50px;">\n        Check Availability\n      </a>',
      1,
      'v2: kitchens-section CTA'
    );
    out = replaceExactly(
      out,
      '<a href="#tour" class="btn btn-primary blueprint" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 13px 22px; min-height: 48px;">\n            Book a tour\n          </a>',
      '<a href="#tour" class="btn btn-primary blueprint" data-cta-loc="locations" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 13px 22px; min-height: 48px;">\n            Check Availability\n          </a>',
      1,
      'v2: locations CTA'
    );
    out = replaceExactly(
      out,
      '09 · Schedule a tour',
      '09 · Check availability',
      1,
      'v2: bottom section eyebrow'
    );
    out = replaceExactly(
      out,
      '<a href="#tour" data-tap="footer">Schedule a tour</a>',
      '<a href="#tour" data-tap="footer" data-cta-loc="footer">Check availability</a>',
      1,
      'v2: footer CTA'
    );
    out = replaceExactly(
      out,
      '<a href="#tour" class="btn btn-primary blueprint" style="flex: 1; max-width: 420px; text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; min-height: 52px;">\n      Schedule a Tour\n    </a>',
      '<a href="#tour" class="btn btn-primary blueprint" data-cta-loc="sticky" style="flex: 1; max-width: 420px; text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; min-height: 52px;">\n      Check Availability\n    </a>',
      1,
      'v2: sticky bar CTA'
    );
    // submitLabel and submitLabelM (renderVals(), the DCLogic component) share
    // this exact ternary tail, so one call covers the bottom form's button and
    // the export's own mid ('m-') form's button, which only /lp still renders —
    // harmless there too, since /lp never sets v2 and this whole block is skipped.
    out = replaceExactly(
      out,
      `? 'Sending…' : 'Schedule My Tour'`,
      `? 'Sending…' : 'Check Availability'`,
      2,
      'v2: bottom + mid form submit button label'
    );
  }

  // ---- 20. v2: locations gets an address and a map, pricing drops out ---------
  // Pre-copy-sweep text again for both pricing sentences below — see step 17's
  // note on why (LOCATION_COPY/COPY_DASHES run after this file, not before it).
  if (v2) {
    // singleLocation() (scripts/build.mjs, shared/unconditional) already deleted
    // the second card, the map iframes and the <address> element that used to sit
    // here — there is no existing "Get directions" link or address to build on,
    // only TODO placeholders per the brief, called out as a blocker in the report
    // rather than an invented address. data-maps-url turns the whole card into a
    // click target (see the delegated handler in LP2_MODAL_JS_V2) without nesting
    // an anchor inside the "Check Availability" anchor already in it.
    out = replaceExactly(
      out,
      `<h3 style="font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 32px; letter-spacing: 0.02em; text-transform: uppercase; margin: 0 0 12px;">USC / Central Los Angeles</h3>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: color-mix(in srgb, var(--color-text) 72%, transparent);">Open 24/7/365 · Free gated parking</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <a href="#tour" class="btn btn-primary blueprint" data-cta-loc="locations" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 13px 22px; min-height: 48px;">
            Check Availability
          </a>`,
        `<h3 style="font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 32px; letter-spacing: 0.02em; text-transform: uppercase; margin: 0 0 12px;">USC / Central Los Angeles</h3>
        <address style="margin: 0 0 8px; font-style: normal; font-size: 15px; line-height: 24px; color: color-mix(in srgb, var(--color-text) 72%, transparent);">TODO_ADDRESS</address>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: color-mix(in srgb, var(--color-text) 72%, transparent);">Open 24/7/365 · Free gated parking</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <a href="#tour" class="btn btn-primary blueprint" data-cta-loc="locations" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 13px 22px; min-height: 48px;">
            Check Availability
          </a>
          <a href="TODO_MAPS_URL" target="_blank" rel="noopener" class="btn btn-secondary" style="text-transform: uppercase; letter-spacing: 0.06em; font-size: 15px; padding: 13px 22px; min-height: 48px;">
            Get directions
          </a>`,
      1,
      'v2: locations address + get-directions'
    );
    out = replaceExactly(
      out,
      '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: clamp(28px, 4vw, 56px);">\n      <div>',
      '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: clamp(28px, 4vw, 56px);">\n      <div class="lp2-loc-card" data-maps-url="TODO_MAPS_URL">',
      1,
      'v2: locations card click target'
    );
    // "Terms and pricing depend on the space and the location — both are covered
    // on the tour." — its own footnote paragraph under the benefits sheet, purely
    // about pricing, so it comes out whole rather than being reworded.
    out = replaceExactly(
      out,
      '      <p style="margin: 0; padding: 12px 24px; border-top: 1px solid var(--color-divider); font-size: 13px; line-height: 24px; color: color-mix(in srgb, var(--color-text) 70%, transparent);">Terms and pricing depend on the space and the location — both are covered on the tour.</p>\n',
      '',
      1,
      'v2: drop easy-upgrade pricing footnote'
    );
    // The final CTA paragraph is otherwise fine — only its trailing pricing
    // clause goes.
    out = replaceExactly(
      out,
      `We'll show you the space that fits and walk you through what setup looks like — sizes, terms and pricing included.`,
      `We'll show you the space that fits and walk you through what setup looks like.`,
      1,
      'v2: drop final-CTA pricing clause'
    );
  }

  // ---- 21. v2: hero video on phones — tried off, put back -----------------------
  // Phase 1 restored an !s.isPhone gate on top of the shared rewriteRuntime()
  // connection-speed check (s.cheapNet), as a mobile-performance tradeoff called
  // out explicitly in that report. Explicit follow-up feedback said the opposite:
  // the video should autoplay on mobile too, same as it did before that change.
  // Reverted to exactly the shared, already-tested behavior — connection-speed
  // gated, not phone-gated — same as every other shortened-variant page.

  // ---- 22. v2: hero image byte-optimization — attempted, reverted -------------
  // Three approaches were tried here (an AVIF/WebP <picture>, a plain <img
  // srcset>, and finally just swapping which single filename src/href point
  // at) and all three regressed LCP under throttled mobile conditions, verified
  // at the network level (CDP request/response events, not just the high-level
  // Resource Timing API, which can double-count a preloaded-then-consumed
  // resource even when only one real fetch happens). Root cause, confirmed by
  // direct instrumentation: <x-dc> stays display:none and inert until the DC
  // runtime's React-based renderer completes its first real render pass —
  // under 4x CPU throttling that lands around ~1.4-1.6s in, regardless of image
  // size, and it swaps in a wholesale fresh subtree (500+ freshly constructed
  // nodes at once), discarding whatever parser/preload-created <img> existed
  // before it. Reusing the browser's "list of available images" cache across
  // that swap turned out to depend on the resource still being fresh in
  // Chromium's preload-match window at that moment — which, empirically, only
  // held for the export's original filename/bytes (confirmed: the untouched
  // baseline never double-fetches); every replacement file tried, at every
  // size and with or without srcset, landed outside that window and paid for a
  // full second fetch instead of the bytes it saved. Since this page's <x-dc>
  // can't show ANY content — hero image included — before that render pass
  // completes, the image's byte size was never going to be the lever that
  // moves this page's LCP; the render pass itself is. That's a materially
  // bigger change (reducing what the runtime has to execute before its first
  // paint) than an image swap, and out of scope here — so this markup (the
  // <x-dc>-internal <img>) is reverted to the original, unconditional,
  // already-safe single filename rather than ship a regression.
  //
  // The LCP stand-in added later in this file ("a temporary static hero, so
  // the LCP element paints before React") changed what's actually safe to try
  // here, but not in the direction of a srcset: the stand-in's own <img> and
  // this <x-dc>-internal one are two separate elements that both point at
  // "assets/kitchen-hero.webp" today, and that shared filename is exactly what
  // lets the second one paint instantly once <x-dc> swaps in — it's already in
  // the browser's cache from the stand-in's own preload, so there's no second
  // real fetch to wait for. Giving the stand-in a srcset (tried, measured,
  // reverted — see git history) breaks that: the stand-in then requests a
  // *different* URL than this <x-dc>-internal <img> still does, the shared
  // cache entry stops existing, and the <x-dc>-internal one pays for a real,
  // un-preloaded fetch of the original file precisely when the runtime's
  // render pass is competing for the main thread — measured making LCP worse,
  // not better, exactly the failure mode this whole section already
  // documents.
  //
  // Recompressing kitchen-hero.webp itself in place, at its original filename
  // (tried: 106KB -> ~43KB, 1200w instead of 1600w, quality 70), was going to
  // be the way around that — same filename, same shared cache entry, so both
  // <img>s still only cost one real fetch between them, just smaller ones.
  // Reverted before shipping: this filename turned out not to be
  // ghost-kitchen's alone. index.html and lp.html use the exact same file as
  // their OWN hero (confirmed in the built output: identical position:
  // absolute; inset: 0 usage, same fetchPriority="high"), and
  // catering-health-permit.html/fda-food-facility-registration.html/
  // thank-you.html all reference it too, further down their own pages.
  // Recompressing it — even losslessly-in-spirit, same photo, smaller file —
  // changes what all of those pages actually serve, which is exactly what
  // this rollout has stayed away from since the very first commit. Left
  // alone; flagged as a follow-up in the report rather than done here, since
  // fixing it for real means either accepting that shared cost sitewide (a
  // call for whoever owns the whole site, not a ghost-kitchen-only build
  // flag) or giving ghost-kitchen its own differently-named photo end to end
  // — including the <x-dc>-internal copy two sections up, which is exactly
  // the change already proven to regress LCP on its own.

  // ---- v2: below-fold images — smaller files, srcset, explicit dimensions -------
  // kitchen-hero.webp is NOT touched here, for the reason directly above: it's
  // shared with other pages, not just with the stand-in and the <x-dc>-
  // internal hero on THIS page, so nothing on this page can safely change its
  // bytes or its filename at all. Nothing below is preloaded and nothing
  // below is above the fold — by the time a
  // visitor scrolls this far the runtime's initial render finished long ago,
  // so none of that risk applies to what follows.
  //
  // could-be-you.webp, prep-overhead.webp and prep-rail.webp are all used on every
  // other shortened-variant page too (confirmed: dist/index.html, lp.html, and the
  // two info pages all reference the same three filenames), so the originals are
  // left byte-for-byte alone and every new file below ships under a new name
  // instead — could-be-you-{480,650,800,1200}.{webp,avif}, prep-overhead-{480,650,
  // 1000}.{webp,avif}, prep-rail-opt.webp — generated once (sharp, quality 65-70
  // per the brief, AVIF a few points lower for comparable perceived quality) and
  // committed as static files, same as every other asset in this repo. Only this
  // page's markup, v2-gated below, ever points at them, so every other page's
  // output is provably unaffected regardless of what these new files contain.
  if (v2) {
    out = replaceExactly(
      out,
      '<img src="assets/could-be-you.webp" alt="A cook plating bowls in a stainless commercial kitchen, annotated: this could be you, and this could be your kitchen, your logo could be here" loading="lazy" width="1200" height="932" />',
      `<picture>
        <source type="image/avif" srcset="assets/could-be-you-480.avif 480w, assets/could-be-you-650.avif 650w, assets/could-be-you-800.avif 800w, assets/could-be-you-1200.avif 1200w" sizes="(max-width: 760px) 100vw, 50vw" />
        <source type="image/webp" srcset="assets/could-be-you-480.webp 480w, assets/could-be-you-650.webp 650w, assets/could-be-you-800.webp 800w, assets/could-be-you-1200.webp 1200w" sizes="(max-width: 760px) 100vw, 50vw" />
        <img src="assets/could-be-you-1200.webp" alt="A cook plating bowls in a stainless commercial kitchen, annotated: this could be you, and this could be your kitchen, your logo could be here" loading="lazy" decoding="async" width="1200" height="932" />
      </picture>`,
      1,
      'v2: could-be-you responsive picture'
    );
    out = replaceExactly(
      out,
      '<img src="assets/prep-overhead.webp" alt="Two cooks portioning bowls and packing delivery containers across a stainless prep table" loading="lazy" style="width: 100%; aspect-ratio: 4 / 3.4; object-fit: cover; display: block;" />',
      `<picture>
        <source type="image/avif" srcset="assets/prep-overhead-480.avif 480w, assets/prep-overhead-650.avif 650w, assets/prep-overhead-1000.avif 1000w" sizes="(max-width: 760px) 100vw, 50vw" />
        <source type="image/webp" srcset="assets/prep-overhead-480.webp 480w, assets/prep-overhead-650.webp 650w, assets/prep-overhead-1000.webp 1000w" sizes="(max-width: 760px) 100vw, 50vw" />
        <img src="assets/prep-overhead-1000.webp" alt="Two cooks portioning bowls and packing delivery containers across a stainless prep table" loading="lazy" decoding="async" style="width: 100%; aspect-ratio: 4 / 3.4; object-fit: cover; display: block;" />
      </picture>`,
      1,
      'v2: prep-overhead responsive picture'
    );
    out = replaceExactly(
      out,
      '<img src="assets/prep-rail.webp" alt="" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.8;" />',
      '<img src="assets/prep-rail-opt.webp" alt="" loading="lazy" decoding="async" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.8;" />',
      1,
      'v2: prep-rail recompressed'
    );
    // Six review photos, each appearing twice (the visible strip plus its marquee
    // duplicate) at one shared intrinsic size — real width/height so the browser
    // reserves the right box before any of them has loaded, instead of the
    // width:100%/height:auto pair alone, which has nothing to size against until
    // the byte arrive.
    out = replaceExactly(
      out,
      'loading="lazy" style="width: 100%; height: auto; display: block;" />',
      'loading="lazy" decoding="async" width="760" height="507" style="width: 100%; height: auto; display: block;" />',
      12,
      'v2: review photo dimensions'
    );
    // Everything left carrying loading="lazy" at this point is the eight partner
    // logos (each appearing twice) -- already small, not named in the brief, but
    // decoding="async" is free and applies the same "don't block the main thread
    // decoding an off-screen image" fix uniformly.
    out = replaceExactly(
      out,
      'loading="lazy" style="height: clamp(72px, 8vw, 96px); width: auto; display: block; mix-blend-mode: multiply;" />',
      'loading="lazy" decoding="async" style="height: clamp(72px, 8vw, 96px); width: auto; display: block; mix-blend-mode: multiply;" />',
      16,
      'v2: partner logo decoding=async'
    );
  }

  // ---- v2: Vimeo — don't fetch either player until the visitor asks for it -----
  // PageSpeed's #1 finding on this page: ~18MB of Vimeo player JS/video segments,
  // most of it the ambient hero background loop, which starts fetching the moment
  // this component mounts (componentDidMount -> sync() -> showHeroVideo derives
  // straight from cheapNet, no other gate). loading="lazy" (scripts/build.mjs,
  // shared) only defers markup that isn't near the viewport — the hero is the
  // first thing on the page, so it does nothing here. The "Watch the video" panel
  // lower down is already a real click-to-play facade (a poster button gates
  // videoOpen), so it only needed the same dnt=1 the fix below adds.
  //
  // The hero loop has no play button and no visible chrome (aria-hidden,
  // pointer-events: none) — it's ambient wallpaper behind the headline, not
  // something a visitor presses play on, and this page's own history (see the
  // revert two sections up) is explicit that it must keep autoplaying, on every
  // device, exactly like it always has. Inventing a play-button UI for it would
  // both change that behavior and add an element the design doesn't have. So the
  // facade here is a gate on genuine visitor engagement instead of a click target:
  // the video is held back until the first scroll, pointerdown, or keydown, then
  // released — same connection-speed gate as before, just no longer armed before
  // the visitor has done anything but load the page. A real visitor scrolls or
  // taps within the first second or two either way, so the loop still autoplays
  // for them almost exactly as before; a fully automated run — Lighthouse and
  // PageSpeed included, which only load and observe, never scroll or click —
  // never triggers it and never pays for it. Deliberately no timeout fallback:
  // unlike GTM/the FB pixel elsewhere, nothing here needs to fire unconditionally,
  // and a blind timer would just re-arm the same cost this exists to remove.
  if (v2) {
    out = replaceExactly(
      out,
      'isPhone: false, isDesktop: true, reduced: false, cheapNet: false,',
      'isPhone: false, isDesktop: true, reduced: false, cheapNet: false, heroVideoReady: false,',
      1,
      'v2: heroVideoReady initial state'
    );
    out = replaceExactly(
      out,
      'this._sync = sync;',
      `this._sync = sync;
    this._onFirstInteract = () => {
      ['scroll', 'pointerdown', 'keydown'].forEach(t => window.removeEventListener(t, this._onFirstInteract, true));
      this.setState({ heroVideoReady: true });
    };
    ['scroll', 'pointerdown', 'keydown'].forEach(t => window.addEventListener(t, this._onFirstInteract, { capture: true, passive: true }));`,
      1,
      'v2: arm hero video on first interaction'
    );
    out = replaceExactly(
      out,
      "if (this._mqMotion && this._sync) this._mqMotion.removeEventListener('change', this._sync);",
      `if (this._mqMotion && this._sync) this._mqMotion.removeEventListener('change', this._sync);
    if (this._onFirstInteract) ['scroll', 'pointerdown', 'keydown'].forEach(t => window.removeEventListener(t, this._onFirstInteract, true));`,
      1,
      'v2: unhook hero video interaction listeners on unmount'
    );
    out = replaceExactly(
      out,
      'showHeroVideo: !s.reduced && s.cheapNet,',
      'showHeroVideo: !s.reduced && s.cheapNet && s.heroVideoReady,',
      1,
      'v2: hero video also waits for heroVideoReady'
    );
    out = replaceExactly(
      out,
      'background=1&amp;autoplay=1&amp;loop=1&amp;muted=1&amp;volume=0&amp;controls=0&amp;autopause=0"',
      'background=1&amp;autoplay=1&amp;loop=1&amp;muted=1&amp;volume=0&amp;controls=0&amp;autopause=0&amp;dnt=1"',
      1,
      'v2: hero video dnt=1'
    );
    out = replaceExactly(
      out,
      'autoplay=1&amp;title=0&amp;byline=0&amp;portrait=0"',
      'autoplay=1&amp;title=0&amp;byline=0&amp;portrait=0&amp;dnt=1"',
      1,
      'v2: modal video dnt=1'
    );
  }

  // ---- v2: hero preload moves to the very top of <head> -----------------------
  // PageSpeed's "resource load delay" flags the gap between the preload scanner
  // reaching this tag and it actually starting — here that's the icon link, two
  // font preconnects, the font preload/noscript pair and the design-system
  // stylesheet link, all ahead of it today. None of those block the image
  // request once discovered; discovery itself is what's late. Moved to just
  // ahead of the icon link -- the first line buildLandingPage()'s page-specific
  // head array contributes that is the same text on every page (title and
  // meta-description differ per page since heroOverride() and the PAGES
  // registry both run per-page; anchoring on either would need a page-specific
  // anchor here too). Title/description are inert metadata either way, so
  // landing two lines later than "the very first line" makes no real
  // difference to when the preload scanner finds this.
  if (v2) {
    out = replaceExactly(
      out,
      '<link rel="preload" as="image" href="assets/kitchen-hero.webp" fetchpriority="high">\n',
      '',
      1,
      'v2: remove hero preload from its old position'
    );
    out = replaceExactly(
      out,
      '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
      // The font preload is the Latin woff2 for Barlow Condensed 600 -- the one
      // weight the stand-in's own H1 (this page's LCP element) sets on
      // --font-heading -- fetched straight from the same URL Google Fonts'
      // own CSS already resolves to (see the @font-face rules further down in
      // this file), so it's one request either way, just requested sooner.
      // Only this one weight/subset: preloading every weight this family ships
      // would compete with the hero image for the same early bandwidth this
      // is meant to protect, for weights nothing above the fold uses.
      `<link rel="preload" as="image" href="assets/kitchen-hero.webp" fetchpriority="high">
<link rel="preload" as="font" type="font/woff2" href="https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B4873z3bWuQ.woff2" crossorigin>
<link rel="icon" href="favicon.svg" type="image/svg+xml">`,
      1,
      'v2: hero preload to the top of head, plus preload the headline webfont'
    );
  }

  // ---- v2: a temporary static hero, so the LCP element paints before React ----
  // The real hero (heading + photo) is inside <x-dc>, which is display:none until
  // support.js's runtime finishes its first render pass -- confirmed by direct CDP
  // instrumentation elsewhere in this codebase to land ~1.4-1.6s in under 4x CPU
  // throttling, regardless of the image's own byte size (see the reverted
  // byte-optimization section above). Nothing can paint before that, including the
  // LCP element, which is exactly what PageSpeed flags: "rendered client-side by
  // React... make the hero static HTML in the initial document."
  //
  // A full static rewrite of the page was explicitly ruled out — the whole site
  // depends on this same runtime, and rebuilding it as plain HTML is a different
  // project, not a performance pass. What ships instead is a small, temporary
  // stand-in: the same headline text and the same hero photo (identical filename,
  // so it rides the same <link rel=preload> above rather than a second fetch),
  // painted as plain markup outside <x-dc> so the x-dc{display:none!important}
  // rule (scripts/build.mjs, unconditional) never touches it. <x-dc> is body's
  // only child in the raw export, so this is simply inserted as its sibling —
  // nothing else in the page competes with it for space or paint time.
  //
  // Anchored on the raw '<body>\n<x-dc>' text, not '<body>' alone: this file's
  // transform() runs before tagEveryPage() (buildLandingPage() calls the variant
  // transform directly; GTM's noscript tag is inserted afterwards, into every
  // dist/ file, in that separate later pass — scripts/build.mjs). Anchoring here
  // means the GTM noscript block lands between <body> and this stand-in once that
  // pass runs, which is harmless: noscript content never renders with JS enabled.
  //
  // It has to come down the moment the real hero exists, and only then: a blind
  // timer could fire before the real hero is ready (a visible gap) or long after
  // (two headlines briefly overlapping in the accessibility tree). #hero-form
  // getting a real height is the same unambiguous "the runtime is actually done"
  // signal the floating-button fade fix elsewhere in this file already relies on,
  // checked the same proven way — a fresh getElementById + getBoundingClientRect
  // on every debounced mutation, never a held reference, since the runtime
  // replaces the whole subtree wholesale rather than patching it. Fixed
  // positioning means the swap itself can't shift anything: the stand-in was
  // never in normal flow, so removing it doesn't move whatever renders under it.
  //
  // --edge and --color-accent-400 are hardcoded below to the literal values
  // they resolve to, rather than read as var(--edge)/var(--color-accent-400).
  // That is not a style preference; it is the fix for a real, measured CLS
  // regression this stand-in introduced, root-caused by instrumenting real
  // layout-shift entries (Playwright + PerformanceObserver under throttled
  // mobile conditions) rather than guessed at. Three earlier attempts at this
  // fix — a system font stack, an explicit height/overflow on the headline,
  // collapsing the three <span>s to one text run with <br> — each left the
  // measured shift completely unchanged, which was itself the tell that the
  // cause was never in this markup; all three were reverted once the real
  // cause below was found, since the height/overflow pair in particular was
  // actively clipping the headline (confirmed: scrollHeight far exceeded the
  // guessed-at fixed height at narrow viewports, hiding two of its three
  // lines) without fixing anything. var(--font-heading) stays exactly as
  // written — confirmed separately below to not be part of the problem.
  //
  // The real cause: this page's actual brand palette (--color-bg: #FAF8F5,
  // --color-accent-400: #D9AB56, --edge, and the rest) is not in the shared
  // design-system stylesheet (that file's own tokens are a generic blue) — it is
  // a second, page-specific `:root` block the export places inside
  // <x-dc><helmet>, upstream of every other v2 fix in this file. The shared
  // stylesheet link that used to live in that same <helmet> was already hoisted
  // into the real <head> for exactly this reason (see buildLandingPage()'s own
  // doc comment: React re-inserts a <helmet> link on boot, but the browser
  // populates its .sheet without ever adding it to document.styleSheets, so nothing
  // in it applies) — this second block was not, and turns out to be affected the
  // same way. Confirmed directly: polling getComputedStyle(document.documentElement)
  // for --edge and --color-bg shows both resolve correctly until the instant
  // support.js removes <x-dc> to boot the real render, sit unresolved/reverted to
  // the shared stylesheet's generic values for roughly half a second, then resolve
  // correctly again once React's own re-inserted copy of that block lands. Every
  // visitor has always paved over this exact gap — nothing has ever painted early
  // enough to make a color token flickering for half a second at the very top of
  // the page visible or measurable. This stand-in is the first thing in this
  // codebase's history to paint into that gap, which is what turned a page-wide,
  // permanently invisible condition into a specific, measurable layout shift on
  // exactly the one element on screen at the time. --font-heading is unaffected
  // and needs no such workaround: it lives only in the shared design-system
  // stylesheet (confirmed absent from the page-specific block above), which was
  // already the file hoisted into the real, static <head> for this exact class
  // of bug — so it is stable across the gap the way the page-specific block is
  // not.
  //
  // Hoisting that second block the same way the stylesheet link already was
  // would fix the gap at its source, for the real hero too, not just the
  // stand-in — flagged as a follow-up rather than done here, since it touches
  // scripts/build.mjs's shared head construction (every page gets the same
  // palette block) rather than anything v2-only. Sidestepping it here, in the
  // one place currently capable of noticing it, is the fix that stays inside
  // this rollout's actual scope.
  if (v2) {
    // The stand-in's headline has to match whatever this page's own hero (see
    // heroOverride() in scripts/build.mjs) actually says, or a visitor gets
    // ghost-kitchen's copy for the half-second before the real, correct
    // headline swaps in underneath it. hero is threaded in from PAGES via
    // buildLandingPage() -> transform() for exactly this reason. Same shape
    // heroOverride() itself requires -- three lines, the third one carrying
    // the brand accent colour -- so a page missing either fails loudly here
    // instead of silently shipping the wrong words.
    if (!hero || !Array.isArray(hero.lines) || hero.lines.length !== 3) {
      throw new Error(
        'v2: hero stand-in needs a hero with exactly three headline lines -- got ' +
          JSON.stringify(hero)
      );
    }
    out = replaceExactly(
      out,
      '<body>\n<x-dc>',
      `<body>
<div id="lp2-hero-standin" style="position: fixed; top: 0; left: 0; width: 100%; height: clamp(600px, 82vh, 880px); z-index: 999999; background: #141414; overflow: hidden; display: grid; align-items: end;">
  <img src="assets/kitchen-hero.webp" alt="An operator plating meal-prep containers on a stainless steel workstation under a commercial exhaust hood" fetchpriority="high" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;">
  <div aria-hidden="true" style="position: absolute; inset: 0; background: color-mix(in srgb, #141414 66%, transparent);"></div>
  <div style="position: relative; width: 100%; max-width: clamp(1240px, 90vw, 1760px); margin: 0 auto; padding: 0 clamp(20px, 5vw, 72px) 60px;">
    <h1 style="font-family: var(--font-heading); font-weight: 600; font-size: clamp(44px, 6.4vw, 88px); line-height: 1.03; letter-spacing: 0.01em; text-transform: uppercase; margin: 0 0 0 -0.052em; color: #FAF8F5; text-shadow: 0 1px 24px rgba(20, 20, 20, 0.45);">
      <span style="display: block;">${hero.lines[0]}</span>
      <span style="display: block;">${hero.lines[1]}</span>
      <span style="display: block; color: #D9AB56;">${hero.lines[2]}</span>
    </h1>
  </div>
</div>
<script>
(function () {
  var standin = document.getElementById('lp2-hero-standin');
  if (!standin) return;
  var mo, settleTimer = null;
  function check() {
    var real = document.getElementById('hero-form');
    if (real && real.getBoundingClientRect().height > 0) {
      standin.style.display = 'none';
      requestAnimationFrame(function () { standin.remove(); });
      mo.disconnect();
    }
  }
  mo = new MutationObserver(function () {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(check, 150);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  check();
})();
</script>
<x-dc>`,
      1,
      'v2: temporary static hero stand-in'
    );
  }

  // ---- v2: drop the design system's empty, dead bundle script -----------------
  // _ds_bundle.js is a render-blocking <script> (no defer/async) that costs a
  // full request round trip before the parser can continue, for 300 bytes that
  // do nothing: it only initializes window.Industry_indust to an empty object
  // with an empty components list — confirmed nothing in this codebase (or the
  // rest of the Claude-Design runtime) ever reads that namespace. Dropping the
  // tag outright beats deferring it: zero bytes and zero requests instead of a
  // smaller blocking cost moved later. Left in place, unconditionally, for every
  // other page — this is a real render-blocking cost, but a 300-byte no-op is a
  // very small one, and this file stays out of scope for anything not gated on
  // v2, the same rule as everywhere else in this pipeline.
  if (v2) {
    out = replaceExactly(
      out,
      '<script src="_ds/industry-07e58652-c0e7-4e65-8b31-789011f5d1e5/_ds_bundle.js"></script>\n',
      '',
      1,
      'v2: drop the empty _ds_bundle.js script tag'
    );
  }

  // ---- 23. v2: the font stylesheet stops blocking first paint -----------------
  // font-display: swap is already active (the shared FONT_CSS URL already carries
  // &display=swap, scripts/build.mjs) — the part still worth doing is the
  // <link rel="stylesheet"> itself, which blocks rendering until it arrives. The
  // standard preload-then-swap pattern: fetch it as a non-blocking preload, then
  // flip its own rel to stylesheet once loaded; the <noscript> fallback keeps a
  // JS-disabled visitor's fonts working, same as this page's CTAs staying plain
  // anchors with JS off. Reached the normal way: buildLandingPage()'s head
  // injection, including this link, already ran by the time this file sees the
  // page. The design-system stylesheet (a second, different href) is left alone —
  // the Hero's own inline styles read CSS custom properties that sheet defines,
  // so deferring it risks a visible flash of unstyled colour on first paint,
  // which is a worse trade than one render-blocking stylesheet fetch that starts
  // in parallel with it today.
  if (v2) {
    out = replaceExactly(
      out,
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap">',
      '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap" onload="this.onload=null;this.rel=\'stylesheet\'">\n<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap"></noscript>',
      1,
      'v2: font stylesheet preload+swap'
    );
  }

  // ---- 24. v2: the bottom form's own heading -----------------------------------
  // The bottom form's heading is its own static "Schedule my tour" text, distinct
  // from the dynamic submitLabel button text already fixed, and distinct from
  // "Schedule a Tour"/"Schedule My Tour" elsewhere — the earlier CTA-copy pass
  // didn't reach it. Email on this form stays required (required="{{ true }}" on
  // f-email, and validate() above, both untouched) — same as every other form on
  // this page except the chat.
  if (v2) {
    out = replaceExactly(
      out,
      '<h3 style="grid-column: 1 / -1; font-family: var(--font-heading); font-weight: 600; font-size: 28px; line-height: 30px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 4px;">Schedule my tour</h3>',
      '<h3 style="grid-column: 1 / -1; font-family: var(--font-heading); font-weight: 600; font-size: 28px; line-height: 30px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 4px;">Check availability</h3>',
      1,
      'v2: bottom form heading'
    );
  }

  // ---- 25. v2: phone format — area code first, the conventional US order ------
  // Every phone display so far read "435-1633 (844)" (local number first, area
  // code after) — the brief's own original wording. Explicit follow-up feedback
  // said this reads backwards and asked for the conventional "(844) 435-1633"
  // instead (which happens to be what the dead, pre-rollout comments already
  // used for the old number, before it changed to this one). Only the display
  // text changes here — the tel:+18444351633 links this sits inside of are
  // untouched, still built and gated exactly as they were.
  // One pass, not eight: every one of the 8 places this string appears (header,
  // hero phone line, hero form card, mid-page form, popup modal, bottom form,
  // footer, sticky bar aria-label) needs the identical swap, and all 8 already
  // exist in `out` by this point in the pipeline — this runs last specifically
  // so it does, regardless of which earlier step constructed which occurrence.
  if (v2) {
    out = replaceExactly(
      out,
      '435-1633 (844)',
      '(844) 435-1633',
      8,
      'v2: phone format — area code first'
    );
  }

  return out;
}
