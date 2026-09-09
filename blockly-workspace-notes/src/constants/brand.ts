/**
 * @fileoverview The mark that says an object is one of ours.
 *
 * `utils/guards.ts` used to recognise a note with `instanceof`, which meant it
 * had to import both note classes — and that import is what closed the loop
 * between `model/note.ts`, `model/stacking.ts` and `utils/guards.ts`. Reading
 * a mark off the object instead lets the guard sit at the bottom of the graph
 * with nothing beneath it, which is what keeps the whole graph acyclic.
 *
 * A symbol rather than a string, so it cannot collide with a property a host
 * has put on its own comments, and so it stays out of `Object.keys` and
 * `JSON.stringify` — which matters here, because `changeNoteProperty_`
 * compares note state by stringifying it.
 *
 * `Symbol.for` rather than `Symbol()`, so two bundled copies of this plugin
 * recognise each other's notes. `instanceof` never could: a host that ends up
 * with the plugin twice would have had one copy's notes silently vanish from a
 * save written by the other. The version segment is the other half of that
 * bargain — it stops two copies at *different* versions accepting each other,
 * which would be worse. Bump it only when `NoteSurface` changes in a way an
 * older copy could not handle.
 */

/** Marks an object as a note. See the note on `Symbol.for` above. */
export const NOTE_BRAND = Symbol.for(
  '@mit-app-inventor/blockly-workspace-notes/note@1',
);
