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
variants/
  lp2.mjs                          page-specific changes for /lp2 — nothing else touches it
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
  index.html  lp2.html  thank-you.html  404.html  map.html  assets/  _ds/  vendor/  …
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

## Scroll motion and section differentiation

The page read flat for measurable reasons: **46 `.blueprint` boxes** all rendering as
plain 1px rectangles, essentially **one ground colour** across the light region, only
**4 of 15 sections dark** — with five consecutive light ones in the stretch where
visitors decide whether to keep going — and a scroll experience that was **8 identical
whole-section fades**. The how-it-works strip had no `data-rev` at all.

**`data-rev-item`** adds per-item reveal. It hides via a `[data-hide]` attribute
rather than an inline style, which is the opposite of `[data-rev]` and deliberate: the
final state is the *default*, so if the script never runs, or the visitor has reduced
motion, or Stop motion is on, the content is simply already in place. The stagger delay
is written by the script from the item's rank **among hidden siblings**, not
`:nth-child` — a group straddling the fold has its first items left visible, and a
positional delay would leave a hole in the cascade.

Applied to: the four how-it-works steps (amber datum rail drawn left to right, marker
planted after it), the four pain cards (plus a ghosted numeral via
`::before { content: attr(data-num) }`), and the five benefit rows.

**The benefits sheet is now a dark band.** Its colours come from redefining two tokens
on the section — every inline `color-mix(… var(--color-text) …)` inside then resolves
light-on-dark, recolouring 16 references without rewriting one. `--color-accent-700` is
remapped because `#7A5216` is **2.7:1 on `#141414` and fails AA**; `#D9AB56` is 8.7:1.
`--color-bg` is deliberately *not* redefined — the section never uses it but
`.btn-primary` reads it for its label, and the CTA must match every other CTA.

The section also gains the eyebrow it never had, repairing the numbered spine that read
`01 · Why operators call us` → `03 · The kitchens` with 02 missing.

### Two pre-existing bugs this fixed

**High contrast made every dark section invisible.** The accessibility panel's rescue
rule keys off `[style*="#141414"]`, but the DC runtime parses every style attribute
into a React style object and re-serialises it, so the served DOM says
`background: rgb(20, 20, 20)` and that selector matched **nothing** — verified, zero
elements. The blanket `color: #000000 !important` therefore landed unopposed: measured
**1.02:1 black-on-black** on the hero, the film section and the final CTA. Every dark
element now carries `data-band="dark"` and the rescue keys off that. Measured after:
21:1.

**Both Vimeo players were fetched on every visit, on every device.** The two
`<iframe src="player.vimeo.com/…">` tags live in the raw `<x-dc>` template, so the HTML
parser started loading them before `boot()` removed that subtree — `display:none` hides
an iframe, it does not stop it fetching. So the export's "phones get a poster" never
saved the bytes, and neither did the click-to-play modal nobody had opened.
`loading="lazy"` suppresses both template copies while the iframes React actually mounts
still load. Vimeo documents per visit: **2 → 1** where the video plays, **2 → 0** where
it does not. FCP improved 468ms → 336ms as a side effect.

### Hero video on phones

The export gated the video off below 760px. It now plays, gated on `navigator.connection`
instead — skipped under Save-Data or a 2g estimate, read once so a mid-session estimate
change cannot swap the iframe in and out, and initialised to "no video" so nothing is
fetched before the check runs. **`navigator.connection` does not exist on Safari/iOS**,
so iPhones always get the video; there is no platform API to do better.

## Readability and the mobile type scale

The page reads as crowded on a phone and its muted text was below WCAG AA. Both are
measured, both are fixed in `READABILITY_CSS` and `improveReadability()` in the build.

**Contrast.** Composited over `#FAF8F5`, the export's muted tiers measured 4.01:1
(`--color-text 55%`, x2), 4.42:1 (58%, x12), 4.72:1 (60%, x3) and 5.05:1 (62%, x2)
against a 4.5:1 requirement — 19 declarations, all of them `color:`. They now collapse
onto one 70% tier at 6.66:1. Nothing distinguishes 4.01 from 5.05 to a reader, and the
hierarchy that carries meaning is the one above it: 70 < 72 < 78 < 80 < 86 < 100. The
four `8%` uses are `border-bottom` hairlines and are deliberately untouched. The same
three failing values appear in `templates/thank-you.html` and got the same floor.

**Type on phones.** The export ships **one media query for the whole site**
(`prefers-reduced-motion`); everything else is `clamp()` and `auto-fit`, which scales
layout but not type. So a phone rendered the desktop scale verbatim — 13px x67
(uppercase labels tracked at 0.14em), 15px x56 — and every `clamp()` floor tuned as a
desktop minimum became a phone's fixed value. Below 760px, the export's own `isPhone`
breakpoint, 13px goes to 14px, 15px to 16px, body leading from 1.50 to 1.6, and the
eyebrow's `line-height: 12px` under a 13px font — a leading *smaller than the type*,
which collided with itself the moment the label wrapped, as the hero eyebrow does at
every phone width — to 1.35. Section padding pins to its 48px floor on a phone (6vw is
23px at 390) while the cards inside are padded 24px, so a section break read barely
stronger than a card edge; it goes to 68px. Desktop keeps its sizes and its 86px
rhythm; only the contrast floor crosses the breakpoint.

**How the rules target.** They key off the inline styles the design already writes,
because the export sets every dimension inline and there is no class to hang them on.
That is safe for **lengths** but not for **colours**: the DC runtime parses each style
attribute into a React style object and re-serialises it through CSSOM, which rewrites
`#141414` to `rgb(20, 20, 20)` — the reason the export's own `[style*="#141414"]`
rescue rule matched nothing — while leaving lengths and `clamp()` expressions
byte-identical. Verified in the built page: `[style*="font-size: 15px"]` matches 38
elements on a phone, `[style*="#141414"]` matches 0. If a re-export ever changes that,
the fallback is the pattern used everywhere else here — count-asserted `data-` hooks
added by the build.

### The hero's dead space

The hero is `min-height: clamp(600px, 82vh, 880px)` with `align-items: end`, holding a
block padded `clamp(88px, 11vh, 150px)` on top. It bottom-aligns ~510px of content
inside a box sized to the viewport, so the leftover stacked on top of the padding:

| viewport | header to eyebrow, before | after |
|---|---|---|
| 390 x 844 | 138px | 34px |
| 360 x 800 | 88px | 32px |
| 430 x 932 | 210px | 37px |
| 768 x 1024 | 330px | 41px |

Both levers were needed — dropping only the padding hands the space straight back to
the grid. Carried to 900px rather than 760px because a portrait tablet had the worst of
it.

### Reviews open with three, not six

The section rendered 6 of 12 and hid the rest behind a "See more reviews" button that
already existed, driven by state that already existed. Three of the visible six moved
into that hidden grid: no new state, no new markup, nothing deleted, and the control's
label already covered both directions. On a phone the grid is one column, so this took
three full cards of near-identical praise out of the scroll. The 4.9 aggregate and the
screenshot marquee, both above it, still carry the proof.

This was the only progressive-disclosure headroom left. The page renders **1,095
words** — a normal length; the 1,800-word figure that a template count suggests
includes every collapsed FAQ answer, all five kitchen tab panels and all twelve
reviews. FAQ is an accordion, the kitchens are tabbed and reviews are now trimmed; the
pain cards, the benefits band and "Who it's for" are the sections doing the
persuading, so they stay open.

### The primary button, one step down its own ramp

`#FAF8F5` on `--color-accent` `#B07A1C` measured **3.51:1** against AA's 4.5:1, on
all 13 amber buttons — every "Schedule a Tour", the sticky bar, the skip link. No new
colour was needed: `--color-accent-600` `#96661A` is 4.70:1 and was already the
button's own hover value, so the whole ramp shifts one step inside the palette the
design system ships.

| state | before | after | label contrast |
|---|---|---|---|
| rest | `--color-accent` `#B07A1C` | `--color-accent-600` `#96661A` | 3.51 -> **4.70** |
| hover | `-600` | `-700` `#7A5216` | **6.50** |
| active | `-700` | `-800` `#5C3D12` | **9.29** |
| border | `--color-accent` | `-600` | |

Nothing else amber changes — the survey markers, the stars, the rail and the `-400`
eyebrows on the dark bands all still read `--color-accent`. The rules live in
`rewriteDesignSystemCss()` rather than the helmet block because the design-system
stylesheet is a `<link>` in `<head>` and the helmet `<style>` lands elsewhere in the
cascade: same specificity, so source order would decide, which is not something to
leave to chance for the page's primary call to action.

**This surfaced a bug the dark band had introduced.** `[data-band="dark"]` remaps
`--color-accent-700` to `#D9AB56` so the benefits sheet's numerals clear AA on
black — and `.btn-primary` reads that same token for a state. Inside a dark band the
button therefore resolved to `#D9AB56`: a **2.00:1** label, worse than the resting
state this change was made to fix. It was on `:active` before and would have moved to
`:hover`. One rule restores the token inside the button —
`[data-band="dark"] .btn-primary { --color-accent-700: #7A5216; }` — for the same
reason `--color-bg` is left alone on that band: the CTA must be identical on every
ground. Verified across all 13 buttons, 5 of them on dark bands: `-700` now resolves
to `#7A5216` everywhere.

The accessibility panel's high-contrast mode redefines `--color-accent` and
`--color-accent-700` at `:root` but not `-600`, which is now what the button paints
with, so `--color-accent-600: #5c4008` (9.58:1 on white) was added to that rule —
otherwise the page's main call to action would have been the one thing the mode
could not reach.

### A placeholder trap, closed before anything fell into it

Worth being precise about, because it is easy to misread as a live bug: **no input on
the site has a `placeholder` attribute**. Every field carries a visible label above
it, which is the better pattern, and nothing renders through the export's
`::placeholder` rule today.

But that rule is a single one for the whole site, and the closing form sits on the
`#141414` band with `background: color-mix(in srgb, #FAF8F5 8%, transparent)` — a
field resolving to `rgb(38, 38, 38)`. A 42%-black placeholder over that resolves to
`rgb(31, 31, 31)`: **1.06:1**, invisible. Adding one placeholder to the page's
primary conversion form would have produced exactly that, silently. The global value
is now 64% (5.12:1 over the light form's `--color-surface` field) and the dark form
has its own light variant keyed on the `data-form="end"` its inputs already carry.

### A guard for the font-swap window

`font-display: swap` renders the fallback first, and the fallback's "No construction."
measures 413px where Barlow Condensed measures far less. The hero is a grid, and a grid
item's automatic minimum size is its min-content width, so for the length of the swap
the **whole document scrolled sideways** — 451px wide at every viewport from 320 to
414. `min-width: 0` on the hero block plus `overflow-wrap: break-word` on the headline
fixes it; both are inert once the real font lands.

## Mobile navigation

There was none. The header's `<nav>` is wrapped in `<sc-if value="{{ isDesktop }}">` and
`isDesktop` is `matchMedia('(min-width: 1000px)')` — so **every viewport under 1000px
rendered no navigation at all**, phones and portrait tablets alike. Not a collapsed menu, no
hamburger: the five section links simply did not exist below that width.

`addMobileNav()` adds a button and a panel, wired through the runtime's own state machine
exactly as `moreReviews` is — state, handler, render values, `<sc-if>`. The links are
generated from one `NAV_LINKS` list so the two menus cannot drift apart.

Three decisions worth keeping:

**The button is unconditional markup hidden by a media query**, not an `<sc-if>` on a state
value. `isDesktop` starts optimistically `true` and is corrected in `componentDidMount`, so a
state-gated button would blink into existence on every phone load. Verified: across 40 frames
sampled from navigation onward, zero show both the hamburger and the desktop nav.

**The panel is `position: absolute` inside the sticky header**, not another line in its flex
row. The header is `position: sticky`, and a stuck sticky element still occupies its flow box
up-page — so growing it would push the whole document down by the panel's height while the
scroll position stayed put, and the content under the reader's thumb would jump. Verified: a
content element's box and the document height are identical before and after opening.

**The outside-click listener runs in the capture phase.** This one cost a debugging round. In
the bubble phase it fires *after* React has re-rendered, and the button's own click swaps its
hamburger icon for a close icon — so `ev.target` is the `<path>` that render just detached,
`closest()` on an orphaned node returns `null`, the "was this inside the header?" test fails,
and the menu closed in the same click that opened it. Running first means the DOM is still
intact and `this.state` is still the pre-click value: the opening click sees `navOpen` false
and bails, and a click on the button while open is inside `<header>` and bails too, leaving
React's own toggle to close it.

### The header row, and two of them

The header reads wordmark, then Schedule a Tour, then the menu at the right-hand end. The
wordmark carries `margin-right: auto` and the button `margin-left: auto`, so the free space
splits evenly either side of the CTA — measured at 36px each at 390px, 50px each at 430px —
and it sits in the middle rather than flush against the menu.

Adding the button had pushed the row past a small phone's width. It is `var(--edge)` +
wordmark 105 + gap 20 + button 48 + gap 20 + CTA 139 + `var(--edge)` = 372px, so **at 320
and 360 the CTA wrapped to a second line and the sticky header doubled from 69px to 116px**.
Tightening the gap to 12px, the CTA's side padding to 13px and the button to Apple's 44pt
minimum brings the row to about 342px, which fits from 360 up. Below 350px it still does not
fit, and there the CTA is the one to drop: the hero's own full-size Schedule a Tour sits
about 40px underneath it, and the bottom bar carries one from 77px of scroll — a 116px
sticky header costs more. All of it is measured against the previous build; desktop boxes at
1000 and 1440 are byte-identical.

**The site header is not the only `<header>`.** The benefits sheet has one for its
"Sheet 02" strip, so `header`, `header > div` and `closest('header')` all match two
elements. The CSS above was harmless by luck — that strip has no `<div>` child and no
primary button — but the outside-click test was not: it reads as "did this tap land in the
site header?", and a tap on that strip satisfied it and left the menu open. Everything
meaning "the site header" keys off a `data-siteheader` hook the build adds.

The menu also closes on Escape, on a link, and on a breakpoint change — the last so the
button's `aria-expanded` can never disagree with a panel the media query has hidden.

## The sticky CTA comes and stays

It was meant to appear past the hero and step aside for the closing form. Two things were
wrong with that.

**`#hero-sentinel` is named for the hero but sits below the partners strip and the
how-it-works list**, two sections further down. Measured on a 390x844 phone: the bar did not
appear until 13% of the page had scrolled.

**The step-aside fought the spacer.** The fixed bar needs a 76px spacer to clear the footer,
and that spacer was `<sc-if value="{{ showSticky }}">` — *inside the document*. So dropping
the bar shortened the page, which moved the scroll position, which moved `#tour` back across
its observer's 0.15 threshold, which put the bar and the spacer back. A feedback loop, worst
on a short viewport where 76px is a large share of the screen.

Sampling the bar at 41 scroll positions from top to bottom, before and after:

```
before  ......#################################..   2 transitions, document 15441 <-> 15517px
after   .########################################   1 transition,  document 15517px, fixed
```

`showSticky` is now just `s.scrolled`; `scrolled` keys off `<main>` with an 8px/-16px
hysteresis so the bar arrives within about 77px of scroll and cannot chatter at the boundary;
the `#tour` observer and its state are gone; and **the spacer is unconditional**, so the
document height is constant. The read stays `getBoundingClientRect()`-based, which is what the
export was reaching for with a sentinel — it does not assume the viewport is the scroller —
and the scroll handler is `requestAnimationFrame`-guarded now that it alone decides the bar.

A bar that never stands aside does sit over the bottom 77px of the closing form. Verified that
this traps nothing: all four inputs and the submit button clear the bar when scrolled to, and
the submit button is the topmost element at its own centre. Restoring the step-aside is one
term in `showSticky`.

## The /lp2 duplicate

`/lp2` is the landing page again, so changes can be tried on it without touching the page
at `/`. Both are built by the same `buildLandingPage()` from the same design export through
the same transforms, so anything fixed for the base page — a bug, a performance change, an
accessibility change — reaches `/lp2` for free and is never written twice.

**Everything that should apply to /lp2 alone goes in `variants/lp2.mjs`**, and nothing in
that file can affect `/`. It exports one function:

```js
export function transform(html, { replaceExactly }) {
  return html;   // pass-through today
}
```

It receives the **finished** HTML — after every shared transform, after the corner strip, the
grid guarding and the desktop widening — and returns what gets written. Running last is
deliberate twice over: an override reads as "the live page, then my change", and edits there
cannot trip the count assertions the shared passes make against the pristine export (add a
wrapper and you would otherwise break `widenDesktopLayout`'s "exactly 18"). Use the
`replaceExactly` passed in for anything anchored to the export's markup — it throws on a
count mismatch instead of silently doing nothing.

**Two guards, and they behave differently on purpose.** The noindex meta is asserted on every
build: a duplicate competing with the original in search is the one way this can quietly cost
something. The *equality* check — that `lp2.html` matches `index.html` byte for byte apart
from that meta — only runs while the hook is still a pass-through. Until the first override
lands, drift is a bug and should fail the build rather than be found in a browser; the moment
a real override exists the pages are supposed to differ, and the check retires itself rather
than standing in the way of the thing `/lp2` was made for. Verified both ways: with a
throwaway override in place, only `lp2.html` changed and `index.html` was untouched.

**Search.** `/lp2` carries `<meta name="robots" content="noindex, nofollow">`. It is
deliberately *not* paired with a `Disallow` in `robots.txt` — blocking the crawl would stop
Google ever reading the noindex, which is the opposite of the intent — and not paired with a
canonical either, which Google treats as a contradictory signal alongside noindex. One line in
`buildLandingPage()`'s call site removes it when `/lp2` should be indexable.

**Routing.** `lp2.html` is a flat file, so Amplify serves it at `/lp2` the same way
`thank-you.html` is served at `/thank-you` — no console rule needed, and `customHttp.yml`'s
`**/*.html` cache rule already covers it. One thing worth knowing: `support.js` re-fetches
`location.href` at boot to re-read its own template, and that refetch is what recovers the
camelCase attributes — lose it and `noValidate` goes with it, and the browser's native
validation replaces the designed inline errors. Confirmed working at the extensionless
`/lp2`: both forms still report `noValidate === true` and still show "Please enter a 10-digit
phone number." rather than a browser bubble.

### What /lp2 currently overrides

Measured against `/` at 390px: **15,517px → 10,483px, −32.4%**, on 861 rendered words
instead of 1,084. The hero (617px) and the reviews section (1,371px) come out
byte-identical — asserted, not assumed.

The diagnosis behind it was that the page's problem was not length but repetition:
`certified` ×7, `permitting` ×7, `24/7` ×5, `construction` ×4, `hood` ×4, `walk-in` ×4.
The middle said five things five times, so the eye never felt it was making progress.
Almost everything cut was already stated somewhere else; the counts are now 5 / 4 / 3 /
3 / 3 / 3.

Structurally: the pain section moves above "How it works", so the problem is established
before the process (the export had them the other way round); "Our mission" comes out;
the facility list folds into the kitchens section as four labelled lines instead of four
bordered cards; the duplicate mid-page lead form becomes a CTA strip and moves up ahead
of the film section; the FAQ drops from eight questions to four, with "What does it
cost?" moving from last to first; and both location maps come out of the markup, which
also drops two Leaflet iframes and their OpenStreetMap tile traffic.

`assets/could-be-you.webp` — the photograph with **THIS COULD BE YOU**, **AND THIS COULD
BE YOUR KITCHEN** and **YOUR LOGO COULD BE HERE** burned into it — moves to the pivot.
On `/` it sits inside the mid-page lead form, under a headline that already says "Seen
enough?": by then the reader has decided, and the image is decoration beside a form rather
than the thing that got them there. (Replacing that section for `/lp2` had also dropped
the image off the page entirely, which is how the placement came up.) It now sits
full-bleed between the pain section and "How it works", so the page reads *here is your
problem* -> *here is the alternative, as a photograph rather than a claim* -> *here is how
you get there*. No heading above it: the annotations are the headline. Capped at the
file's own 1200px above that width, since stretched to the page's 1760px content width it
visibly softens, and carrying `width`/`height` so the browser reserves the space.

For interactivity, three stacked lists — the pain cards, the audience rows and the
process steps — become horizontal scroll-snap tracks with a "Swipe for more" hint, and
the five equipment tabs scroll in one row instead of wrapping to three. All CSS: no new
runtime state, so nothing to go wrong when the DC runtime re-renders.

Still missing, and only the client can supply them: a price (the page has no number
anywhere), the phone number (present in the code, commented out in 10 places) and a
risk-reversal line on the tour.

Both pages submit to the same `/thank-you`. If you later want to tell which page a lead came
from, the place to add it is the payload in `leadSenderScript()`.

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

Two links were under the 24x24 px of WCAG 2.2 SC 2.5.8 — the header logo (105x20)
and the footer "Schedule a tour" (101x18). This was recorded here as needing a
design decision, on the assumption that padding would shift the layout. Re-measured,
it doesn't: the header row's height is set by the 52px CTA inside a 68px
`min-height`, so `padding-block: 2px` takes the logo to 24px and moves nothing; and
the footer link is an inline `<a>` in a `<p>` whose line box is already 24px, so
`display: inline-block` makes the link fill the box it already sits in — where
padding would have grown it. Both carry a `data-tap` hook added by the build.
Confirmed by snapshotting every box in the header and footer with the two rules on
and off: exactly two boxes differ, and they are the two links.

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
5. `/lp2` needs no rule of its own — Amplify resolves `<path>.html` before
   `<path>/index.html`, which is the same mechanism that serves `/thank-you`.
6. Attach the custom domain, then add the `Sitemap:` line to `site/robots.txt` and
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
- Contrast, measured on computed styles over the composited background after a full
  scroll: **0 text nodes below AA** at 390 and 1440, on the landing page and the
  thank-you page — including every button state on both grounds.
- Every interactive element on the page is at least 24x24 at 390px, the 48x48 menu button
  included.
- Mobile menu: present below 1000px and absent at 1000px and above; opens and closes by
  button, link, Escape and outside click — including a tap on the benefits sheet's own
  `<header>`; `aria-expanded` tracks; five links at 52px each, every target resolving; no
  layout shift on open; no horizontal overflow open or closed at 320 / 390 / 768 / 999.
- Header row on one line at 320 / 360 / 390 / 430 (69px, down from 116px at the first two),
  and every box in the header byte-identical to the previous build at 1000 and 1440.
- Sticky CTA: one transition across the whole page, constant document height, and the closing
  form fully usable underneath it.
- `/lp2` renders identically to `/`: same rendered text, links, images, layout heights
  and document height, differing only by the robots meta (one extra `<head>` node). The
  runtime's `location.href` refetch works at the extensionless URL, so both forms keep
  `noValidate` and the designed inline validation; the menu, tabs, FAQ, reviews toggle and
  sticky CTA behave the same; the form submits to the shared `/thank-you`; 0 text nodes
  below AA and no horizontal overflow at 320-2560.
- Performance measured as a 5-run median against the previous build rather than a single
  sample: first paint 52 -> 56ms, FCP 368 -> 372ms, DCL 105 -> 107ms, and a steady 60fps
  through a scripted scroll burst.
- Mobile type: nothing under 14px below 760px, nothing tighter than 1.35 leading except
  `.btn` (1.2, deliberate), section padding 68px; at 761px and above the scale is
  byte-identical to before.
- No horizontal overflow at 320-2560 **with the webfonts blocked as well as loaded** —
  the swap-window case above.
- Performance unchanged to better: first paint 52ms, FCP 304ms, DCL 94ms at 390px.
