/**
 * @fileoverview Grouping several changes into one undoable step.
 */

import * as Blockly from 'blockly/core';

/**
 * Runs a mutation as a single undoable step.
 *
 * A menu action that touches two properties — pinning a note and raising it,
 * say — would otherwise take two presses of undo to reverse. Joining an
 * existing group rather than starting a new one matters when the caller is
 * already inside one, such as during a paste.
 *
 * @param mutate The mutation to perform.
 * @returns Whatever the mutation returned.
 */
export function asOneUndoStep<T>(mutate: () => T): T {
  const existingGroup = Blockly.Events.getGroup();
  if (!existingGroup) Blockly.Events.setGroup(true);
  try {
    return mutate();
  } finally {
    Blockly.Events.setGroup(existingGroup);
  }
}
