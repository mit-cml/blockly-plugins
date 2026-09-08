/**
 * @fileoverview Clipboard support for notes.
 *
 * Core's paster rebuilds a comment through its own serializer, which knows
 * nothing about titles or colours — so a copy/paste or duplicate would return
 * a plain yellow note. This replaces it under the same paster type, since that
 * is the type name `RenderedWorkspaceComment.toCopyData()` stamps onto the
 * clipboard data.
 */

import * as Blockly from 'blockly/core';

import type {NoteCopyData, SavedNote} from './types';
import {Note} from './note';
import {appendNote} from './serializer';

/**
 * The paster type core registers for workspace comments. Matching it means
 * both notes and any plain comments still route here.
 */
export const PASTER_TYPE = 'workspace-comment';

/** How far to nudge a pasted note that would land exactly on another. */
const OFFSET_DISTANCE = 30;

/**
 * Pastes notes, preserving their note-specific state.
 */
export class NotePaster implements Blockly.IPaster<NoteCopyData, Note> {
  /**
   * @param copyData Data produced by `Note.toCopyData()`.
   * @param workspace The workspace to paste into.
   * @param [coordinate] Where to paste.
   * @returns The pasted note, or null.
   */
  paste(
    copyData: NoteCopyData,
    workspace: Blockly.WorkspaceSvg,
    coordinate?: Blockly.utils.Coordinate,
  ): Note | null {
    const state = {
      ...copyData.commentState,
      ...(copyData.noteState ?? {}),
    } as SavedNote;

    if (coordinate) {
      state.x = coordinate.x;
      state.y = coordinate.y;
    }

    // Core builds the note silently and fires a single create event
    // afterwards, so a paste is one undo step rather than a dozen.
    Blockly.Events.disable();
    let note: Note | null;
    try {
      const created = appendNote(state, workspace);
      // `workspace` is rendered, so `appendNote` took the rendered branch —
      // and only a rendered note can be focused or nudged.
      note = created instanceof Note ? created : null;
      if (note) moveOutOfTheWay(note);
    } finally {
      Blockly.Events.enable();
    }

    if (!note) return null;

    if (Blockly.Events.isEnabled()) {
      Blockly.Events.fire(new Blockly.Events.CommentCreate(note));
    }
    Blockly.getFocusManager().focusNode(note);
    return note;
  }
}

/**
 * Nudges a note diagonally until it no longer sits exactly on top of another.
 *
 * @param note The freshly pasted note.
 */
function moveOutOfTheWay(note: Note): void {
  const workspace = note.workspace;
  const coordinate = note.getRelativeToSurfaceXY();
  const offset = new Blockly.utils.Coordinate(0, 0);
  const others = workspace
    .getTopComments(false)
    .filter((other) => other.id !== note.id)
    .map((other) => other.getRelativeToSurfaceXY());

  const overlaps = (candidate: Blockly.utils.Coordinate): boolean =>
    others.some(
      (other) =>
        Math.abs(other.x - candidate.x) <= 1 &&
        Math.abs(other.y - candidate.y) <= 1,
    );

  while (overlaps(Blockly.utils.Coordinate.sum(coordinate, offset))) {
    offset.translate(
      workspace.RTL ? -OFFSET_DISTANCE : OFFSET_DISTANCE,
      OFFSET_DISTANCE,
    );
  }

  note.moveTo(Blockly.utils.Coordinate.sum(coordinate, offset));
}

/** Reference count, since the clipboard registry is a global singleton. */
let registrationCount = 0;

/**
 * The paster displaced on first registration, kept so it can be put back
 * verbatim. `WorkspaceCommentPaster` is not exported on the Blockly
 * namespace, so it cannot simply be reconstructed.
 */
let displacedPaster: Blockly.IPaster<
  Blockly.ICopyData,
  Blockly.ICopyable<Blockly.ICopyData>
> | null = null;

/** Replaces core's workspace comment paster with the note-aware one. */
export function registerNotePaster(): void {
  if (registrationCount++) return;
  displacedPaster = Blockly.registry.getObject(
    Blockly.registry.Type.PASTER,
    PASTER_TYPE,
    false,
  );
  Blockly.clipboard.registry.unregister(PASTER_TYPE);
  Blockly.clipboard.registry.register(PASTER_TYPE, new NotePaster());
}

/** Restores core's workspace comment paster. */
export function unregisterNotePaster(): void {
  if (--registrationCount > 0) return;
  registrationCount = 0;
  Blockly.clipboard.registry.unregister(PASTER_TYPE);
  if (displacedPaster) {
    Blockly.clipboard.registry.register(PASTER_TYPE, displacedPaster);
    displacedPaster = null;
  }
}
