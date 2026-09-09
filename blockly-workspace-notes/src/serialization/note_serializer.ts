/**
 * @fileoverview The serializer that owns the `workspaceNotes` key.
 *
 * Notes ride along in the same payload as blocks and variables:
 *
 *     {
 *       "blocks": {...},
 *       "workspaceNotes": {"version": 1, "notes": [...]}
 *     }
 *
 * It also owns clearing the workspace for both keys — see `clear` — which is
 * why `LegacyCommentAdapter.clear` is deliberately empty.
 */

import * as Blockly from 'blockly/core';

import {SCHEMA_VERSION} from '../constants/serialization';
import {restackNotes} from '../model/stacking';
import type {NotesPayload} from '../types/serialization';
import {isNote} from '../utils/guards';
import {migrate} from './migrations';
import {appendNote, saveNote} from './state';

/**
 * Saves and loads notes under the `workspaceNotes` key.
 *
 * @implements {Blockly.serialization.ISerializer}
 */
export class NoteSerializer implements Blockly.serialization.ISerializer {
  /**
   * Ordered just above core's comment priority so that notes load before the
   * legacy adapter runs and it can skip anything already present. Equal
   * priorities are ordered arbitrarily relative to each other, so the two must
   * differ.
   */
  priority = Blockly.serialization.priorities.WORKSPACE_COMMENTS + 1;

  /**
   * @param workspace The workspace to serialize.
   * @returns The notes payload, or null when there are none.
   */
  save(workspace: Blockly.Workspace): NotesPayload | null {
    const notes = workspace
      .getTopComments(false)
      .filter(isNote)
      .map((note) => saveNote(note, {addCoordinates: true, saveIds: true}));
    // Returning null omits the key entirely; an empty object would be falsy
    // to `workspaces.load` anyway and is never worth writing.
    return notes.length ? {version: SCHEMA_VERSION, notes} : null;
  }

  /**
   * @param state The notes payload.
   * @param workspace The workspace to load into.
   */
  load(state: object, workspace: Blockly.Workspace): void {
    const recordUndo = Blockly.Events.getRecordUndo();
    for (const noteState of migrate(state as NotesPayload).notes) {
      appendNote(noteState, workspace, {recordUndo});
    }
    restackNotes(workspace);
  }

  /**
   * Disposes of every comment on the workspace.
   *
   * This owns clearing for both keys: the legacy adapter deliberately does
   * nothing so that nothing is disposed twice. Non-note comments are included,
   * matching what core's serializer did before we replaced it — otherwise they
   * would survive a load and accumulate.
   *
   * @param workspace The workspace to clear.
   */
  clear(workspace: Blockly.Workspace): void {
    for (const comment of workspace.getTopComments(false)) {
      comment.dispose();
    }
  }
}
