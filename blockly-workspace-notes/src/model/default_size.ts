/**
 * @fileoverview The size a new note is created at.
 *
 * Blockly reads this from `CommentView.defaultCommentSize`, a static on core,
 * when it builds a comment with no size of its own. Core's value is 120x100 —
 * sized for a comment whose whole chrome is a 24px bar, which a note's margins
 * would leave barely two lines of writing.
 *
 * Because it is a static rather than anything owned by a workspace, it is
 * swapped the way this plugin swaps every other global: reference-counted, so
 * core's own value comes back only once the last plugin instance is gone. Two
 * workspaces on one page therefore share one default — the first one to start
 * wins, the same rule `registerNoteSerializers` applies to its options — and,
 * more importantly, disposing one plugin cannot resize the notes of another
 * that is still running.
 */

import * as Blockly from 'blockly/core';

/** How many plugin instances are currently holding the swap. */
let registrationCount = 0;

/** Core's own default, kept so it can be put back exactly as it was. */
let displacedSize: Blockly.utils.Size | null = null;

/**
 * Makes new notes default to the given size.
 *
 * @param size The size a note with no saved size should be created at.
 * @param size.width Width in workspace units.
 * @param size.height Height in workspace units.
 */
export function applyDefaultNoteSize(size: {
  width: number;
  height: number;
}): void {
  if (registrationCount++) return;
  displacedSize = Blockly.comments.CommentView.defaultCommentSize;
  Blockly.comments.CommentView.defaultCommentSize = new Blockly.utils.Size(
    size.width,
    size.height,
  );
}

/** Restores the default size core shipped with. */
export function restoreDefaultNoteSize(): void {
  if (--registrationCount > 0) return;
  registrationCount = 0;
  if (!displacedSize) return;
  Blockly.comments.CommentView.defaultCommentSize = displacedSize;
  displacedSize = null;
}
