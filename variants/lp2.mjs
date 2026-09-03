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
 * Use replaceExactly() for anything anchored to the export's own markup: it throws
 * on a count mismatch rather than silently doing nothing, which is what keeps this
 * repo safe against a re-export moving the ground underneath it.
 *
 *   export function transform(html, { replaceExactly }) {
 *     return replaceExactly(
 *       html,
 *       'A certified kitchen.',
 *       'A certified kitchen, today.',
 *       1,
 *       'lp2 headline'
 *     );
 *   }
 *
 * Today it is a pass-through: /lp2 is byte-identical to / apart from the robots meta
 * the build adds, which the build asserts on every run.
 */
export function transform(html /*, { replaceExactly } */) {
  return html;
}
