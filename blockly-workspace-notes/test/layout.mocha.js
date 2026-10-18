/**
 * @fileoverview Pins the resolved values in `constants/layout.ts`.
 *
 * Most of that file is arithmetic rather than literals, which is what keeps
 * the note's proportions honest — but it also means a change to one number
 * moves several others, and a well-meant tidy-up of a derivation can move a
 * value without looking like it moved anything. These assertions are the
 * arithmetic's answer sheet.
 *
 * Two of them exist for a specific trap. `FOOTER_ICON_SIZE` is derived from
 * `TITLE_LINE_HEIGHT` and `FOOTER_FONT_SIZE` deliberately is not, because the
 * same three-quarter step that gives an exact 12 gives 11.00025 against the
 * body's 14.667px — and that would reach the stylesheet verbatim. The integer
 * checks below are what catch a future attempt to make the two symmetrical.
 */

import {assert} from 'chai';

import {
  BAR_ICON_MARGIN,
  BAR_ICON_SIZE,
  BAR_INSET,
  BODY_INSET,
  DEFAULT_SIZE,
  FOOTER_FONT_SIZE,
  FOOTER_HANDLE_CLEARANCE,
  FOOTER_HEIGHT,
  FOOTER_ICON_SIZE,
  GLYPH_GRID,
  MARKER_ICON_SIZE,
  MIN_SIZE,
  RESIZE_HANDLE_SIZE,
  SCROLLBAR_WIDTH,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
  TOPBAR_HEIGHT,
} from '../src/constants/layout';

suite('Layout constants', function () {
  test('the note is built on a 16px line box', function () {
    assert.equal(TITLE_LINE_HEIGHT, 16);
    assert.equal(TITLE_FONT_SIZE, 16);
    assert.equal(BAR_ICON_SIZE, 16);
    assert.equal(MARKER_ICON_SIZE, 16);
    assert.equal(FOOTER_HEIGHT, 16);
  });

  test('the footer is three quarters of the bar', function () {
    assert.equal(FOOTER_ICON_SIZE, 12);
    assert.equal(FOOTER_FONT_SIZE, 11);
    // Both must stay whole: a fraction here reaches the stylesheet as one.
    assert.isTrue(Number.isInteger(FOOTER_ICON_SIZE));
    assert.isTrue(Number.isInteger(FOOTER_FONT_SIZE));
  });

  test('the title bar geometry resolves as drawn', function () {
    assert.equal(TOPBAR_HEIGHT, 36);
    assert.equal(BAR_ICON_MARGIN, 10);
    assert.equal(BAR_INSET, 31);
    assert.equal(GLYPH_GRID, 24);
  });

  test('the body and footer resolve as drawn', function () {
    assert.equal(BODY_INSET, 10);
    assert.equal(RESIZE_HANDLE_SIZE, 12);
    assert.equal(FOOTER_HANDLE_CLEARANCE, 22);
    assert.equal(SCROLLBAR_WIDTH, 8);
  });

  test('the sizes a note is created and clamped at', function () {
    assert.deepEqual(DEFAULT_SIZE, {width: 260, height: 180});
    assert.deepEqual(MIN_SIZE, {width: 84, height: 62});
  });
});
