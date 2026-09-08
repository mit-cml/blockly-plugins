/**
 * @fileoverview Tests for the colours derived from a note's own colour.
 *
 * A note stores one colour and the stylesheet reads two: the paper, and the
 * edge that draws the card's outline and the rule under the title. The
 * derivation is a pure function of a hex string, so it is checked here rather
 * than through a workspace.
 */

import {assert} from 'chai';

import {DEFAULT_PALETTE} from '../src/constants';
import {colourForHue, edgeFor, hexToHsv} from '../src/colour';

/**
 * @param {string} hex A hex colour.
 * @returns {number} Its perceived lightness, as the HSV value scaled by how
 *     little colour is in it. Enough to order two shades of one hue.
 */
function lightness(hex) {
  const [, saturation, value] = hexToHsv(hex);
  return value * (1 - saturation / 2);
}

/**
 * Hues wrap, so two angles are compared the short way round.
 *
 * @param {number} a One hue in degrees.
 * @param {number} b The other.
 * @returns {number} The smaller angle between them.
 */
function hueGap(a, b) {
  const gap = Math.abs(a - b) % 360;
  return gap > 180 ? 360 - gap : gap;
}

/**
 * How far a derived hue may drift, in degrees. Not zero: a derivation lands on
 * 8-bit channels, and the closer together they are the further that rounding
 * moves the hue read back off them.
 * @type {number}
 */
const HUE_TOLERANCE = 4;

suite('Note colours', function () {
  const colours = DEFAULT_PALETTE.map(({fill}) => fill);

  suite('edgeFor', function () {
    test('the edge is darker than the paper', function () {
      for (const colour of colours) {
        assert.isBelow(
          lightness(edgeFor(colour)),
          lightness(colour),
          `${colour} edged with ${edgeFor(colour)}`,
        );
      }
    });

    test('it keeps the hue', function () {
      for (const colour of colours) {
        const [hue, saturation] = hexToHsv(colour);
        if (saturation < 0.02) continue;
        assert.isBelow(
          hueGap(hue, hexToHsv(edgeFor(colour))[0]),
          HUE_TOLERANCE,
          colour,
        );
      }
    });
  });

  test('the edge is a different shade from the paper', function () {
    for (const colour of colours) {
      assert.notEqual(edgeFor(colour), colour);
    }
  });

  test('the derivation returns a hex colour, never NaN', function () {
    // Sampled right around the hue circle, since hexToHsv branches on which
    // channel is the maximum and the seven swatches do not cover every case.
    for (let hue = 0; hue < 360; hue += 15) {
      assert.match(edgeFor(colourForHue(hue)), /^#[0-9a-f]{6}$/, `${hue}deg`);
    }
  });

  test('the palette is stored as the colours its own hues produce', function () {
    for (const {name, hue, fill} of DEFAULT_PALETTE) {
      // Grey is the exception: it is deliberately hueless, so no hue
      // reproduces it.
      if (name === 'Grey') continue;
      assert.equal(colourForHue(hue), fill, name);
    }
  });
});
