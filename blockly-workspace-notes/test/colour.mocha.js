/**
 * @fileoverview Tests for the colours derived from a note's own colour.
 *
 * A note stores one colour and the chrome reads three: the paper, the edge
 * that draws the border and the title bar, and the ink everything written on
 * the note is drawn in. Each is a pure function of a hex string, so they are
 * checked here rather than through a workspace.
 */

import {assert} from 'chai';

import {DEFAULT_PALETTE} from '../src/index';
import {colourForHue, edgeFor, hexToHsv, inkFor} from '../src/utils/colour';

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

  test('the palette stores the colours its own hues produce', function () {
    for (const {name, hue, fill} of DEFAULT_PALETTE) {
      // Grey is the exception: it is deliberately hueless, so no hue
      // reproduces it.
      if (name === 'Grey') continue;
      assert.equal(colourForHue(hue), fill, name);
    }
  });
});

/**
 * @param {string} hex A hex colour.
 * @returns {number} Its relative luminance, per WCAG.
 */
function luminance(hex) {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * @param {string} a A hex colour.
 * @param {string} b Another.
 * @returns {number} Their WCAG contrast ratio.
 */
function contrast(a, b) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

suite('Note ink', function () {
  test('it keeps the hue it came from', function () {
    for (const {fill} of DEFAULT_PALETTE) {
      // Grey has no hue to keep, so there is nothing to compare.
      if (hexToHsv(fill)[1] === 0) continue;
      assert.closeTo(
        hexToHsv(inkFor(fill))[0],
        hexToHsv(fill)[0],
        1,
        `ink for ${fill} drifted off its hue`,
      );
    }
  });

  test('it is far darker than the note it is written on', function () {
    for (const {fill} of DEFAULT_PALETTE) {
      assert.isBelow(
        hexToHsv(inkFor(fill))[2],
        hexToHsv(fill)[2] / 2,
        `ink for ${fill} is not dark enough to read as ink`,
      );
    }
  });

  // The guard that matters. The title sits on the bar and the body text on the
  // paper, so the ink has to clear 4.5:1 against both - on every palette
  // colour, and on any a host substitutes at the same saturation. Changing a
  // palette entry or an ink constant without checking this is how a note ends
  // up unreadable.
  test('it is readable on both the paper and the bar', function () {
    for (const {name, fill} of DEFAULT_PALETTE) {
      const ink = inkFor(fill);
      assert.isAtLeast(
        contrast(ink, fill),
        4.5,
        `${name}: ink on the note body is too faint`,
      );
      assert.isAtLeast(
        contrast(ink, edgeFor(fill)),
        4.5,
        `${name}: ink on the title bar is too faint`,
      );
    }
  });
});
