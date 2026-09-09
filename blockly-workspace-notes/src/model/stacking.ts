/**
 * @fileoverview Reading and writing the order notes stack in.
 *
 * A note's z-index is a number it stores; the browser honours DOM order
 * instead. `restackNotes` is what reconciles the two, and the two lookups
 * below are what a caller uses to put a note in front of, or behind,
 * everything already on the workspace.
 *
 * Nothing here imports from `model/`, deliberately. `Note.applyZIndex` calls
 * `restackNotes`, so an import in the other direction would be a cycle; the
 * three things this module needs from a note - recognising one, reading its
 * z-index, and raising it - are all reached without naming the class, through
 * `isNote` and the `bringToFront` seam.
 */

import * as Blockly from 'blockly/core';

import {isNote} from '../utils/guards';

/**
 * Reorders the notes on a workspace so their DOM order matches their
 * z-indices.
 *
 * @param workspace The workspace to restack.
 */
export function restackNotes(workspace: Blockly.Workspace): void {
  if (!workspace.rendered) return;
  // Two passes rather than one predicate: combining them would need the
  // narrowed type spelled out, which means naming the class again.
  workspace
    .getTopComments(false)
    .filter(isNote)
    .filter((note) => !note.isDeadOrDying())
    .sort((a, b) => a.getZIndex() - b.getZIndex())
    .forEach((note) => note.bringToFront());
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
