/**
 * @fileoverview Editing a note's title in place.
 *
 * Blockly never asks for text in a dialog. A field on a block is edited where
 * it sits: `FieldInput` puts an `<input class="blocklyHtmlInput">` inside
 * `WidgetDiv`, positions it over the field, and commits on Enter or blur.
 * This does the same over a note's title.
 *
 * The difference from a field is that none of it should be visible. A field
 * editor is a white box that opens over the block, which on a note reads as a
 * mode rather than as typing; the stylesheet strips the box, this places the
 * editor exactly over the title, and the caret goes to the end rather than
 * selecting the line. The effect is that the heading simply becomes typeable,
 * the way the body below it always is.
 *
 * The alternative, `Blockly.dialog.prompt`, falls back to the browser's own
 * `window.prompt` unless the host has replaced it — a serif system dialog
 * that matches nothing else on the page.
 */

import * as Blockly from 'blockly/core';

import type {Note} from './note';
import {
  NOTE_MARGIN,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
  UNTITLED_TITLE_TEXT,
} from './constants';

/**
 * Where the editor should sit, in viewport pixels.
 */
interface EditorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Returns where the editor should sit, in screen pixels.
 *
 * Taken from the title's own client rect, so the editor lands exactly over
 * the text it replaces whatever the workspace scale and scroll are. Every
 * note has a title row — an unnamed one shows a placeholder — so there is
 * always something to measure.
 *
 * @param note The note being renamed.
 * @returns A DOMRect-like box, or null if nothing is rendered.
 */
function editorBox(note: Note): EditorBox | null {
  const title = note.getSvgRoot().querySelector('.blocklyNoteTitle');
  const box = title?.getBoundingClientRect();
  if (!box?.width) return null;

  // Left and top come straight from the title, so the text does not shift by
  // a pixel when the editor opens over it.
  const scale = note.workspace.getAbsoluteScale();
  // Room to type past the end of the current title, but never past the paper:
  // the editor is transparent, so anything overflowing would be text floating
  // on the canvas.
  const room =
    note.getSvgRoot().getBoundingClientRect().right -
    box.left -
    NOTE_MARGIN * scale;
  return {
    left: box.left,
    top: box.top,
    width: Math.max(
      Math.min(Math.max(box.width * 2, TITLE_LINE_HEIGHT * 6 * scale), room),
      box.width,
    ),
    height: box.height,
  };
}

/**
 * Opens an inline editor over a note's title.
 *
 * Enter or a click elsewhere commits; Escape restores the original title. The
 * whole edit is one undo step.
 *
 * @param note The note to rename.
 */
export function editTitle(note: Note): void {
  if (!note.workspace?.rendered || note.isDeadOrDying()) return;

  const box = editorBox(note);
  if (!box) return;

  let cancelled = false;
  let input: HTMLInputElement | null = null;

  const commit = () => {
    if (cancelled || !input) return;
    const existingGroup = Blockly.Events.getGroup();
    if (!existingGroup) Blockly.Events.setGroup(true);
    try {
      note.setTitle(input.value);
    } finally {
      Blockly.Events.setGroup(existingGroup);
    }
  };

  Blockly.WidgetDiv.show(
    note,
    note.workspace.RTL,
    () => {
      commit();
      Blockly.utils.dom.removeClass(note.getSvgRoot(), 'blocklyEditing');
    },
    note.workspace,
  );

  const div = Blockly.WidgetDiv.getDiv();
  if (!div) return;

  // The heading's own size, not the field size core uses for its editors: the
  // editor is meant to be invisible, and text that changes size the moment a
  // caret lands in it is the most visible thing a field editor can do. Scaled
  // like every other on-canvas measurement, since the widget div is in page
  // pixels while the title is in workspace units.
  const fontSize = `${TITLE_FONT_SIZE * note.workspace.getAbsoluteScale()}px`;
  div.style.fontSize = fontSize;
  div.style.width = `${box.width}px`;
  div.style.height = `${box.height}px`;

  // WidgetDiv is positioned relative to its parent, not to the page.
  const parent = div.parentElement?.getBoundingClientRect();
  div.style.left = `${box.left - (parent?.left ?? 0) - window.scrollX}px`;
  div.style.top = `${box.top - (parent?.top ?? 0) - window.scrollY}px`;

  input = document.createElement('input');
  // Blockly's own class, so the editor inherits the field styling core
  // already ships rather than inventing a second look.
  input.className = 'blocklyHtmlInput blocklyNoteTitleInput';
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('aria-label', 'Note title');
  // The same greyed placeholder the note itself shows, so opening the editor
  // on an unnamed note changes nothing on screen but the caret.
  input.setAttribute('placeholder', UNTITLED_TITLE_TEXT);
  input.style.fontSize = fontSize;
  // Inline, like the size above, and for a sharper reason: the renderer ships
  // .thrasos-renderer.classic-theme .blocklyHtmlInput { font-weight: normal },
  // three classes that outrank any single-class rule the stylesheet can give
  // .blocklyNoteTitleInput. Left to CSS the heading would drop to book weight
  // the instant the caret landed in it.
  input.style.fontWeight = 'bold';
  input.value = note.getTitle();
  div.appendChild(input);

  Blockly.utils.dom.addClass(note.getSvgRoot(), 'blocklyEditing');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      Blockly.WidgetDiv.hide();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      cancelled = true;
      Blockly.WidgetDiv.hide();
    }
  });

  input.focus({preventScroll: true});
  // The caret goes to the end rather than selecting the line: a selected title
  // is the visual cue of a field editor opening, which is the thing this is
  // trying not to look like. Select-all is still one keystroke away.
  input.setSelectionRange(input.value.length, input.value.length);
}
