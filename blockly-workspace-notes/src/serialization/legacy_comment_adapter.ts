/**
 * @fileoverview A stand-in for Blockly's built-in comment serializer.
 *
 * A note is a `RenderedWorkspaceComment`, so it also lands in
 * `workspace.getTopComments()` and core's own comment serializer would save it
 * a second time — reloading would then produce two notes for every one. This
 * adapter replaces that serializer: it writes nothing, and exists only so that
 * files carrying the old `workspaceComments` key still load, as notes.
 */

import * as Blockly from 'blockly/core';

import type {WorkspaceNotesOptions} from '../types/options';
import type {SavedNote} from '../types/serialization';
import {isNote} from '../utils/guards';
import {appendNote, saveNote} from './state';

/**
 * Stands in for Blockly's built-in comment serializer.
 *
 * Writes nothing — notes are the single source of truth — but still reads
 * `workspaceComments`, so files saved before this plugin (or by plain Blockly)
 * load as notes.
 *
 * @implements {Blockly.serialization.ISerializer}
 */
export class LegacyCommentAdapter implements Blockly.serialization.ISerializer {
  /**
   * Whether to keep writing the old workspaceComments key. Off by default,
   * since it duplicates every note.
   */
  private emitLegacyComments_: boolean;

  /** Runs alongside core's own comment serializer. */
  priority: number;

  /**
   * @param options Whether to keep emitting legacy comments.
   * @param options.emitLegacyComments Whether to write the old key too.
   */
  constructor({emitLegacyComments = false}: WorkspaceNotesOptions = {}) {
    this.priority = Blockly.serialization.priorities.WORKSPACE_COMMENTS;
    this.emitLegacyComments_ = emitLegacyComments;
  }

  /**
   * @param workspace The workspace to serialize.
   * @returns Legacy comment states, or null.
   */
  save(workspace: Blockly.Workspace): SavedNote[] | null {
    if (!this.emitLegacyComments_) return null;
    const comments = workspace
      .getTopComments(false)
      .filter(isNote)
      .map((note) => saveNote(note, {addCoordinates: true, saveIds: true}));
    return comments.length ? comments : null;
  }

  /**
   * @param state Legacy comment states.
   * @param workspace The workspace to load into.
   */
  load(state: object, workspace: Blockly.Workspace): void {
    const recordUndo = Blockly.Events.getRecordUndo();
    // The interface types this as `object`; core passes the array core wrote.
    for (const commentState of state as SavedNote[]) {
      // Notes load first (higher priority). If a file somehow carries both
      // keys, the note wins rather than being duplicated under a fresh ID.
      if (commentState.id && workspace.getCommentById(commentState.id)) {
        continue;
      }
      appendNote(commentState, workspace, {recordUndo});
    }
  }

  /**
   * Intentionally empty; NoteSerializer.clear disposes every comment.
   */
  clear(): void {}
}
