/**
 * @fileoverview The colour space a note lives in, and the palette it is
 * offered from.
 *
 * The derivations that read these live in `utils/colour.ts`; this file only
 * states the numbers.
 */

import type {PaletteEntry} from '../types/options';

/**
 * A note is paper: a light colour carrying dark text.
 *
 * That is the real difference from a block. Blockly's block language is a
 * saturated fill with a white label — S 0.45 at V 0.65 via `hueToHex` — and
 * anything built that way reads as a block whatever hue it uses. Notes invert
 * it: a pale wash at V 0.98, with the text in black.
 *
 * It is also what Blockly's own comments do. Their default is `#FFFCC7`, a
 * pale yellow, and nothing about a comment borrows the block palette.
 */
export const NOTE_SATURATION = 0.25;

/** The value every note colour is generated at, on a 0-1 scale. */
export const NOTE_VALUE = 0.98;

/** Hue of the default note: the yellow a sticky note is expected to be. */
export const DEFAULT_HUE = 48;

/** The default note colour. */
export const DEFAULT_COLOUR = '#f9edbb';

/**
 * The swatches offered in the "Colour" context menu, in display order.
 *
 * Stationery colours rather than block colours. Each is stored as the hex the
 * palette's saturation and value produce, since that is what a note
 * serializes.
 */
export const DEFAULT_PALETTE: PaletteEntry[] = [
  {name: 'Yellow', hue: DEFAULT_HUE, fill: DEFAULT_COLOUR},
  {name: 'Peach', hue: 28, fill: '#f9d8bb'},
  {name: 'Pink', hue: 350, fill: '#f9bbc5'},
  {name: 'Lilac', hue: 275, fill: '#dfbbf9'},
  {name: 'Sky', hue: 200, fill: '#bbe5f9'},
  {name: 'Mint', hue: 150, fill: '#bbf9da'},
  {name: 'Grey', hue: 0, fill: '#f2f2f2'},
];

/**
 * How far a note's edge sits below its own colour: the same hue, a step down
 * in value. Used for the card's hairline and the writing area's border.
 */
export const EDGE_VALUE_SCALE = 0.88;
