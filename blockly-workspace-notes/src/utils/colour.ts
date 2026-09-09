/**
 * @fileoverview Deriving a note's writing surface and edge from its colour.
 *
 * A note is paper. Its colour is a hue at a fixed saturation and value, as a
 * block's is, but a pale one — where Blockly's `hueToHex` is S 0.45 at V 0.65
 * and carries a white label, a note is a light wash carrying black text.
 *
 * One stored colour paints the whole card; the text is written straight onto
 * it. The only value read off it is the edge - the same hue a step down in
 * value - which draws the card's outline and the hairline under the title.
 */

import * as Blockly from 'blockly/core';

import {
  EDGE_VALUE_SCALE,
  INK_SATURATION_MAX,
  INK_SATURATION_SCALE,
  INK_VALUE,
  NOTE_SATURATION,
  NOTE_VALUE,
} from '../constants/colours';

/**
 * Converts a hex colour to HSV.
 *
 * Blockly offers `hsvToHex` but no inverse, so this supplies it. Hue is in
 * degrees, saturation is 0-1 and value is 0-255, matching what `hsvToHex`
 * expects back.
 *
 * @param hex A hex colour such as '#5b80a5'.
 * @returns `[hue, saturation, value]`.
 */
export function hexToHsv(hex: string): [number, number, number] {
  const [red, green, blue] = Blockly.utils.colour
    .hexToRgb(hex)
    .map((channel) => channel / 255);

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;

  return [hue, max ? delta / max : 0, max * 255];
}

/**
 * Derives the shade a note's edges are drawn in.
 *
 * The same hue a step down in value. It draws the card's hairline and the
 * border around the writing area — which is exactly what Blockly's own
 * comment does, since core's `.blocklyTextarea` rule already reads this from
 * `--commentBorderColour`.
 *
 * @param colour The note's colour, as a hex string.
 * @returns The edge colour as hex.
 */
export function edgeFor(colour: string): string {
  const [hue, saturation, value] = hexToHsv(colour);
  return Blockly.utils.colour.hsvToHex(
    hue,
    saturation,
    value * EDGE_VALUE_SCALE,
  );
}

/**
 * Derives the colour everything written on a note is drawn in.
 *
 * The same hue, pushed dark and saturated enough to read on both the note's
 * body and its title bar. Used for the title, the body text and the glyphs in
 * the bar, so a note is one colour throughout rather than a coloured card with
 * black furniture on it.
 *
 * @param colour The note's colour, as a hex string.
 * @returns The ink colour as hex.
 */
export function inkFor(colour: string): string {
  const [hue, saturation] = hexToHsv(colour);
  return Blockly.utils.colour.hsvToHex(
    hue,
    Math.min(saturation * INK_SATURATION_SCALE, INK_SATURATION_MAX),
    INK_VALUE * 255,
  );
}

/**
 * Returns the note colour for a hue.
 *
 * The note equivalent of Blockly's `hueToHex`, at the palette's own
 * saturation and value rather than Blockly's, so notes stay distinct from the
 * blocks they annotate.
 *
 * @param hue A hue in degrees.
 * @returns The colour as hex.
 */
export function colourForHue(hue: number): string {
  return Blockly.utils.colour.hsvToHex(hue, NOTE_SATURATION, NOTE_VALUE * 255);
}
