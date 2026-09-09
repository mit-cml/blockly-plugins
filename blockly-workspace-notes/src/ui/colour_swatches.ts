/**
 * @fileoverview The row of colour swatches the "Colour" menu item shows, and
 * the styles for it.
 *
 * Blockly's context menu has no notion of submenus, but `displayText` accepts
 * an HTMLElement — so the whole palette fits in one row rather than spilling
 * seven entries into the menu.
 *
 * The stylesheet is registered here rather than in `ui/css.ts` because these
 * rules style HTML inside the menu's widget div, not the SVG chrome of a note;
 * keeping them beside the element they style is what stops one drifting from
 * the other.
 */

import * as Blockly from 'blockly/core';

import type {Note} from '../model/note';
import type {PaletteEntry} from '../types/options';
import {asOneUndoStep} from '../utils/undo';

/**
 * Builds the row of colour swatches used as a menu item's display text.
 *
 * Blockly's context menu has no notion of submenus, but `displayText` accepts
 * an HTMLElement — so the whole palette fits in one row rather than spilling
 * seven entries into the menu.
 *
 * @param note The note to recolour.
 * @param palette The
 *     swatches.
 * @returns The swatch row.
 */
export function createSwatchRow(
  note: Note,
  palette: PaletteEntry[],
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'blocklyNoteSwatchRow';

  for (const {name, fill} of palette) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'blocklyNoteSwatch';
    // The swatch shows the note's colour itself, the way a block's colour
    // reads in the toolbox.
    swatch.style.backgroundColor = fill;
    swatch.title = name;
    swatch.setAttribute('aria-label', name);
    if (note.getColour().toLowerCase() === fill.toLowerCase()) {
      swatch.classList.add('blocklyNoteSwatchSelected');
    }

    swatch.addEventListener('pointerdown', (e) => {
      // Stop the menu's own handler from also firing for this row.
      e.stopPropagation();
      e.preventDefault();
      asOneUndoStep(() => note.setColour(fill));
      Blockly.ContextMenu.hide();
    });

    row.appendChild(swatch);
  }

  return row;
}

Blockly.Css.register(`
.blocklyNoteSwatchRow {
  display: flex;
  gap: 6px;
  padding: 2px 0;
}

.blocklyNoteSwatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  cursor: pointer;
}

/* #fc3 is the selection colour core uses for comments and blocks. */
.blocklyNoteSwatchSelected {
  outline: 2px solid #fc3;
  outline-offset: 1px;
}
`);
