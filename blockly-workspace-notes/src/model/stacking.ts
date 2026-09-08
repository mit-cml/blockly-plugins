/**
 * @fileoverview Reading and writing the order notes stack in.
 *
 * A note's z-index is a number it stores; the browser honours DOM order
 * instead. `restackNotes` is what reconciles the two, and the two lookups
 * below are what a caller uses to put a note in front of, or behind,
 * everything already on the workspace.
 *
 * This module and `model/note.ts` import each other: `Note.applyZIndex` calls
 * `restackNotes`, and `restackNotes` needs the class to recognise a note. Both
 * uses are inside function bodies, so neither runs during module evaluation
 * and the cycle resolves. Keep it that way — a top-level use of `Note` here
 * would hit the temporal dead zone.
 */

import * as Blockly from 'blockly/core';

import {Note} from './note';
import {isNote} from '../utils/guards';

/**
 * Reorders the notes on a workspace so their DOM order matches their
 * z-indices.
 *
 * @param workspace The workspace to restack.
 */
export function restackNotes(workspace: Blockly.Workspace): void {
  if (!workspace.rendered) return;
  const notes = workspace
    .getTopComments(false)
    .filter(
      (comment): comment is Note =>
        comment instanceof Note && !comment.isDeadOrDying(),
    );
  notes
    .sort((a, b) => a.getZIndex() - b.getZIndex())
    .forEach((note) => note.view.bringToFront());
}

/**
 * @param workspace The workspace to inspect.
 * @returns One more than the highest z-index in use.
 */
export function nextZIndex(workspace: Blockly.Workspace): number {
  const zIndices = workspace
    .getTopComments(false)
    .filter(isNote)
    .map((note) => note.getZIndex());
  return zIndices.length ? Math.max(...zIndices) + 1 : 1;
}

/**
 * @param workspace The workspace to inspect.
 * @returns One less than the lowest z-index in use.
 */
export function previousZIndex(workspace: Blockly.Workspace): number {
  const zIndices = workspace
    .getTopComments(false)
    .filter(isNote)
    .map((note) => note.getZIndex());
  return zIndices.length ? Math.min(...zIndices) - 1 : -1;
}
