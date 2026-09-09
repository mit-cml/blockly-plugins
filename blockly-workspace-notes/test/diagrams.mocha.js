/**
 * @fileoverview Asserts the documentation diagrams still draw what the code
 * draws.
 *
 * They are hand-maintained SVG, and they had drifted: one file gave the title
 * bar a height of 35 and the other 36, the collapsed card was a pixel short,
 * the two disagreed about where the date sits, and the resize handle was drawn
 * eight pixels above the box it actually occupies. None of that is visible by
 * eye, and none of it would ever fail a build.
 *
 * So this reads both files and checks every number a constant can account for.
 *
 * What it deliberately does **not** check: colours, text content, the callout
 * lines and labels, where body lines sit, the canvas size, element order and
 * the glyph path data. Those are the parts a person should be free to redraw,
 * and a test that pinned them would make the diagrams worse by making them
 * expensive to improve.
 *
 * Elements are addressed by `data-part`, not by position, for the same reason.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import {
  BAR_DELETE_NUDGE,
  BAR_ICON_MARGIN,
  BAR_ICON_SIZE,
  BAR_INSET,
  BODY_INSET,
  CARD_BORDER_WIDTH,
  DEFAULT_SIZE,
  FOOTER_HEIGHT,
  FOOTER_ICON_SIZE,
  FOOTER_LABEL_GAP,
  FOOTER_FONT_SIZE,
  GLYPH_GRID,
  GLYPH_STROKE_WIDTH,
  LOCK_GLYPH_INK,
  MARKER_ICON_GAP,
  MARKER_ICON_SIZE,
  PINNED_CARD_BORDER_WIDTH,
  PIN_GLYPH_INK,
  RESIZE_HANDLE_SIZE,
  SELECTION_STROKE_WIDTH,
  TITLE_FONT_SIZE,
  TOPBAR_HEIGHT,
} from '../src/constants/layout';

const IMAGES = path.join(process.cwd(), 'docs', 'images');

/** Everything rounds to four decimals in the files. */
const EPSILON = 0.01;

const BAR_SCALE = MARKER_ICON_SIZE / GLYPH_GRID;
const FOOTER_SCALE = FOOTER_ICON_SIZE / GLYPH_GRID;

/**
 * @param file A file name inside docs/images.
 * @returns Its parsed root element.
 */
function readSvg(file) {
  const full = path.join(IMAGES, file);
  assert.isTrue(fs.existsSync(full), `expected a diagram at ${full}`);
  return Blockly.utils.xml.textToDom(fs.readFileSync(full, 'utf8'));
}

/**
 * Reads the translate and uniform scale off a transform attribute.
 *
 * @param element An element carrying a transform.
 * @returns Its translation and scale.
 */
function transformOf(element) {
  const transform = element.getAttribute('transform') ?? '';
  const translate = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/.exec(
    transform,
  );
  const scale = /scale\(\s*(-?[\d.]+)/.exec(transform);
  assert.isNotNull(translate, `no translate in "${transform}"`);
  return {
    tx: Number(translate[1]),
    ty: Number(translate[2]),
    scale: scale ? Number(scale[1]) : 1,
  };
}

/**
 * @param note A note group.
 * @param name The `data-part` to find.
 * @returns That element, or null when the note omits it.
 */
function part(note, name) {
  return note.querySelector(`[data-part="${name}"]`);
}

/**
 * @param element An element.
 * @param name An attribute on it.
 * @returns That attribute as a number.
 */
function num(element, name) {
  return Number(element.getAttribute(name));
}

/**
 * @param root A parsed diagram.
 * @returns Every note group in it, keyed by `data-note`.
 */
function notesIn(root) {
  const groups = [...root.querySelectorAll('[data-note]')];
  assert.isAbove(groups.length, 0, 'no note groups found — check data-note');
  return new Map(groups.map((g) => [g.getAttribute('data-note'), g]));
}

suite('Documentation diagrams', function () {
  suiteSetup(function () {
    this.diagrams = new Map([
      ['note-anatomy.svg', notesIn(readSvg('note-anatomy.svg'))],
      ['note-states.svg', notesIn(readSvg('note-states.svg'))],
    ]);
    this.every = [...this.diagrams].flatMap(([file, notes]) =>
      [...notes].map(([kind, note]) => ({file, kind, note})),
    );
    // A walk that found nothing would pass every assertion below.
    assert.isAtLeast(this.every.length, 8, 'too few notes to be the real set');
  });

  test('every card is the default size, or the bar when collapsed', function () {
    for (const {file, kind, note} of this.every) {
      const card = part(note, 'card');
      const where = `${file} ${kind}`;
      assert.equal(num(card, 'width'), DEFAULT_SIZE.width, where);
      assert.equal(
        num(card, 'height'),
        kind === 'collapsed' ? TOPBAR_HEIGHT : DEFAULT_SIZE.height,
        where,
      );
      // Drawn at the origin so the stroke straddles the edge, which is what
      // core's highlight rect does.
      assert.equal(num(card, 'x') || 0, 0, where);
      assert.equal(num(card, 'y') || 0, 0, where);
      assert.equal(
        num(card, 'stroke-width'),
        kind === 'pinned' ? PINNED_CARD_BORDER_WIDTH : CARD_BORDER_WIDTH,
        where,
      );
      assert.equal(num(part(note, 'bar'), 'height'), TOPBAR_HEIGHT, where);
    }
  });

  test('the bar buttons sit where core puts them', function () {
    for (const {file, kind, note} of this.every) {
      const where = `${file} ${kind}`;
      const foldout = transformOf(part(note, 'foldout'));
      assert.closeTo(foldout.tx, BAR_ICON_MARGIN, EPSILON, where);
      assert.closeTo(foldout.ty, BAR_ICON_MARGIN, EPSILON, where);
      assert.closeTo(foldout.scale, BAR_SCALE, EPSILON, where);

      const del = part(note, 'delete');
      if (!del) continue;
      const expected =
        DEFAULT_SIZE.width -
        BAR_ICON_SIZE -
        BAR_ICON_MARGIN * 2 +
        BAR_DELETE_NUDGE;
      assert.closeTo(transformOf(del).tx, expected, EPSILON, where);
    }
  });

  test('a marker is placed by its ink, and the title follows it', function () {
    for (const {file, kind, note} of this.every) {
      const where = `${file} ${kind}`;
      const marker = part(note, 'marker');
      const ink = marker
        ? kind.includes('locked')
          ? LOCK_GLYPH_INK
          : PIN_GLYPH_INK
        : null;

      if (marker) {
        const {tx, ty, scale} = transformOf(marker);
        assert.closeTo(tx, BAR_INSET - ink.x * BAR_SCALE, EPSILON, where);
        assert.closeTo(
          ty,
          TOPBAR_HEIGHT / 2 - (ink.y + ink.height / 2) * BAR_SCALE,
          EPSILON,
          where,
        );
        assert.closeTo(scale, BAR_SCALE, EPSILON, where);
      }

      const title = part(note, 'title');
      const advance = ink ? ink.width * BAR_SCALE + MARKER_ICON_GAP : 0;
      assert.closeTo(num(title, 'x'), BAR_INSET + advance, EPSILON, where);
      assert.closeTo(num(title, 'y'), TOPBAR_HEIGHT / 2, EPSILON, where);
      assert.equal(num(title, 'font-size'), TITLE_FONT_SIZE, where);
    }
  });

  test('the footer sits on its own row', function () {
    const textY = DEFAULT_SIZE.height - BODY_INSET - FOOTER_HEIGHT / 2;
    const iconY = textY - FOOTER_ICON_SIZE / 2;
    for (const {file, kind, note} of this.every) {
      const where = `${file} ${kind}`;
      const dateIcon = part(note, 'footer-date-icon');
      if (!dateIcon) continue;

      for (const name of ['footer-author-icon', 'footer-date-icon']) {
        const icon = part(note, name);
        if (!icon) continue;
        const {ty, scale} = transformOf(icon);
        assert.closeTo(ty, iconY, EPSILON, `${where} ${name}`);
        assert.closeTo(scale, FOOTER_SCALE, EPSILON, `${where} ${name}`);
      }

      const authorIcon = part(note, 'footer-author-icon');
      if (authorIcon) {
        assert.closeTo(transformOf(authorIcon).tx, BODY_INSET, EPSILON, where);
        assert.closeTo(
          num(part(note, 'footer-author-text'), 'x'),
          BODY_INSET + FOOTER_ICON_SIZE + FOOTER_LABEL_GAP,
          EPSILON,
          where,
        );
      }

      // The date's own offset stands in for a measured text width and has no
      // constant, so only the gap after its glyph is checked here.
      const dateText = part(note, 'footer-date-text');
      assert.closeTo(
        num(dateText, 'x') - transformOf(dateIcon).tx,
        FOOTER_ICON_SIZE + FOOTER_LABEL_GAP,
        EPSILON,
        where,
      );
      for (const name of ['footer-author-text', 'footer-date-text']) {
        const text = part(note, name);
        if (!text) continue;
        assert.closeTo(num(text, 'y'), textY, EPSILON, `${where} ${name}`);
        assert.equal(
          num(text, 'font-size'),
          FOOTER_FONT_SIZE,
          `${where} ${name}`,
        );
      }
    }
  });

  test('the two files agree on where the date sits', function () {
    const offsets = new Set(
      this.every
        .map(
          ({note}) =>
            part(note, 'footer-author-icon') && part(note, 'footer-date-icon'),
        )
        .filter(Boolean)
        .map((icon) => transformOf(icon).tx),
    );
    assert.equal(
      offsets.size,
      1,
      `the date glyph stands in for one measured width, but the diagrams ` +
        `place it at ${[...offsets].join(' and ')}`,
    );
  });

  test('the resize handle stays inside the box core gives it', function () {
    const low = DEFAULT_SIZE.width - BODY_INSET - RESIZE_HANDLE_SIZE;
    const lowY = DEFAULT_SIZE.height - BODY_INSET - RESIZE_HANDLE_SIZE;
    let seen = 0;
    for (const {file, kind, note} of this.every) {
      const handle = part(note, 'resize-handle');
      if (!handle) continue;
      seen++;
      const {tx, ty, scale} = transformOf(handle);
      const where = `${file} ${kind}`;
      // The artwork is free to change; the box it is drawn in is not.
      assert.closeTo(tx, low, EPSILON, where);
      assert.closeTo(ty, lowY, EPSILON, where);
      assert.closeTo(scale, RESIZE_HANDLE_SIZE / GLYPH_GRID, EPSILON, where);
    }
    assert.isAtLeast(seen, 1, 'no diagram draws the resize handle');
  });

  test('a locked note has neither a delete button nor a handle', function () {
    const locked = this.every.filter(({kind}) => kind.includes('locked'));
    assert.isAtLeast(locked.length, 2, 'both diagrams should show one');
    for (const {file, kind, note} of locked) {
      assert.isNull(part(note, 'delete'), `${file} ${kind} draws a bin`);
      assert.isNull(
        part(note, 'resize-handle'),
        `${file} ${kind} draws a resize handle`,
      );
    }
  });

  test('the selection ring straddles the card edge', function () {
    for (const {file, kind, note} of this.every) {
      const ring = part(note, 'selection');
      if (!ring) continue;
      const where = `${file} ${kind}`;
      assert.equal(num(ring, 'x') || 0, 0, where);
      assert.equal(num(ring, 'y') || 0, 0, where);
      assert.equal(num(ring, 'width'), DEFAULT_SIZE.width, where);
      assert.equal(num(ring, 'height'), DEFAULT_SIZE.height, where);
      assert.equal(num(ring, 'stroke-width'), SELECTION_STROKE_WIDTH, where);
    }
  });

  test('every glyph is stroked at the authored weight', function () {
    for (const {file, kind, note} of this.every) {
      const glyphs = [...note.querySelectorAll('g[data-part]')];
      assert.isAbove(glyphs.length, 0, `${file} ${kind} has no glyphs`);
      for (const glyph of glyphs) {
        assert.equal(
          num(glyph, 'stroke-width'),
          GLYPH_STROKE_WIDTH,
          `${file} ${kind} ${glyph.getAttribute('data-part')}`,
        );
      }
    }
  });
});
