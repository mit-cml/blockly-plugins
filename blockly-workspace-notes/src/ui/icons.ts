/**
 * @fileoverview The glyphs a note draws, and how they are coloured.
 *
 * Two of the three are Blockly's own bar buttons, and core builds those as
 * `<image href="...svg">` pointing at files in the host's media folder. An
 * `<image>` cannot be tinted — `fill` and `stroke` do not reach inside a
 * referenced document — so a note could either keep core's buttons and accept
 * their fixed navy, or draw its own and lose the keyboard navigation, focus
 * handling and ARIA that come with `CommentBarButton`.
 *
 * It does neither. Core reads nothing off those elements but their bounding
 * box, id and visibility, so the artwork can be replaced by rewriting `href` to
 * a `data:` URI with the note's own ink colour already in it. The button stays
 * core's; only the picture changes, and it changes again whenever the note is
 * recoloured.
 *
 * The glyphs are Tabler's, all authored on a 24-unit grid at stroke-width 2 so
 * the three read as one set. Scaled into a 16px box that lands at about 1.3px
 * on screen - heavy enough to hold its own beside a bold heading.
 */

/** Tabler's `chevron-down`, for the collapse button. */
export const CHEVRON_GLYPH = ['M6 9l6 6l6 -6'];

/** Tabler's `trash`, for the delete button. */
export const TRASH_GLYPH = [
  'M4 7l16 0',
  'M10 11l0 6',
  'M14 11l0 6',
  'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
  'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
];

/**
 * Tabler's `pinned`, for the marker on a pinned note.
 *
 * Drawn inline rather than through a `data:` URI, because it is the plugin's
 * own element rather than one of core's — see `model/note.ts`.
 */
export const PIN_GLYPH = [
  'M9 4v6l-2 4v2h10v-2l-2 -4v-6',
  'M12 16l0 5',
  'M8 4l8 0',
];

/**
 * Renders a glyph as a `data:` URI, stroked in the given colour.
 *
 * Percent-encoded rather than base64: it stays readable in the DOM inspector,
 * which matters when the only way to check the colour followed the note is to
 * look. `#` has to be encoded whatever else is left alone, since it would
 * otherwise start the URI's fragment and truncate the colour.
 *
 * @param paths The glyph's path data, on a 24-unit grid.
 * @param colour The stroke colour.
 * @returns A `data:image/svg+xml` URI.
 */
export function glyphToDataUri(paths: string[], colour: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${colour}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">` +
    paths.map((d) => `<path d="${d}"/>`).join('') +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
