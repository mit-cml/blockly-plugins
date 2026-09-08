/**
 * @fileoverview Turning a note into plain JSON and back.
 *
 * These three functions are the whole of the note format. Everything else in
 * `serialization/` is about *when* they run: the serializers call them for a
 * whole workspace, the XML layer calls them for one note at a time, and the
 * paster calls `appendNote` to rebuild a copied note.
 *
 * `saveNote` is sparse by design, matching core's comment serializer — width
 * and height always, everything else only when it differs from the default —
 * so saved files stay small and diffable.
 */

import * as Blockly from 'blockly/core';

import {DEFAULT_COLOUR} from '../constants/colours';
import {Note} from '../model/note';
import {NoteComment} from '../model/note_comment';
import type {SavedNote} from '../types/serialization';

/**
 * Constructs the right note class for a workspace. A headless workspace
 * cannot hold a rendered note, and that is the only kind a Node test can make.
 *
 * @param workspace The workspace to create the note on.
 * @param [id] An optional ID.
 * @returns The new note.
 */
export function createNote(
  workspace: Blockly.Workspace,
  id?: string,
): Note | NoteComment {
  // `rendered` is what distinguishes the two at runtime; the compiler cannot
  // narrow a base Workspace from a boolean flag.
  return workspace.rendered
    ? new Note(workspace as Blockly.WorkspaceSvg, id)
    : new NoteComment(workspace, id);
}

/**
 * Serializes a single note.
 *
 * Sparse by design, matching core's comment serializer: width and height are
 * always written, and everything else only when it differs from the default.
 * That keeps saved files small and diffable.
 *
 * @param note The note to save.
 * @param options What to include beyond the note's own fields.
 * @param options.addCoordinates Whether to write the note's position.
 * @param options.saveIds Whether to write the note's id.
 * @returns The note's JSON state.
 */
export function saveNote(
  note: Note | NoteComment,
  {addCoordinates = false, saveIds = true} = {},
): SavedNote {
  const workspace = note.workspace;
  // Null-prototype, as core's own serializer builds it: the state is handed
  // straight to JSON, and nothing inherited belongs in it.
  const state: SavedNote = Object.create(null);

  state.height = note.getSize().height;
  state.width = note.getSize().width;

  if (saveIds) state.id = note.id;

  if (addCoordinates) {
    const loc = note.getRelativeToSurfaceXY();
    state.x = workspace.RTL ? workspace.getWidth() - loc.x : loc.x;
    state.y = loc.y;
  }

  if (note.getText()) state.text = note.getText();
  if (note.isCollapsed()) state.collapsed = true;

  // `isOwn*` rather than `is*`: a read-only *workspace* must not poison the
  // per-note flags we persist.
  if (!note.isOwnEditable()) state.editable = false;
  if (!note.isOwnDeletable()) state.deletable = false;

  const pinned = typeof note.isPinned === 'function' && note.isPinned();
  // A pinned note is immovable by definition, so `movable` would be noise.
  if (!note.isOwnMovable() && !pinned) state.movable = false;

  // Note-specific fields. A plain comment created outside the plugin has
  // none of these accessors; it simply serializes without them.
  if (typeof note.getTitle !== 'function') return state;

  if (note.getTitle()) state.title = note.getTitle();
  // Case-insensitive: `setColour` normalizes through Blockly's parser, but a
  // caller could have written an uppercase hex straight into the state.
  if (note.getColour().toLowerCase() !== DEFAULT_COLOUR) {
    state.colour = note.getColour();
  }
  if (pinned) state.pinned = true;
  if (note.getZIndex()) state.zIndex = note.getZIndex();

  const meta = note.getMeta();
  if (Object.values(meta).some((value) => value)) state.meta = meta;

  return state;
}

/**
 * Creates a note on a workspace from its JSON state.
 *
 * @param state The note state to load.
 * @param workspace The workspace to add the note to.
 * @param [options] Whether the resulting events
 *     should be undoable.
 * @param options.recordUndo Whether the append should be undoable.
 * @returns The created note.
 */
export function appendNote(
  state: SavedNote,
  workspace: Blockly.Workspace,
  {recordUndo = false} = {},
): Note | NoteComment {
  const previousRecordUndo = Blockly.Events.getRecordUndo();
  Blockly.Events.setRecordUndo(recordUndo);
  const existingGroup = Blockly.Events.getGroup();
  if (!existingGroup) Blockly.Events.setGroup(true);

  let note;
  try {
    note = createNote(workspace, state.id);

    if (state.text !== undefined) note.setText(state.text);

    if (state.x !== undefined || state.y !== undefined) {
      // A missing coordinate keeps the one the note already has, rather than
      // snapping it to the origin. The RTL flip applies only to a value that
      // came out of the file — `getRelativeToSurfaceXY` is already in
      // workspace coordinates, so flipping it would move the note.
      const defaultLoc = note.getRelativeToSurfaceXY();
      const x =
        state.x === undefined
          ? defaultLoc.x
          : workspace.RTL
            ? workspace.getWidth() - state.x
            : state.x;
      note.moveTo(new Blockly.utils.Coordinate(x, state.y ?? defaultLoc.y));
    }

    if (state.width !== undefined || state.height !== undefined) {
      // Likewise: half a size is not a reason to collapse the other half to
      // zero, which would leave a note that is saved but invisible.
      const defaultSize = note.getSize();
      note.setSize(
        new Blockly.utils.Size(
          state.width ?? defaultSize.width,
          state.height ?? defaultSize.height,
        ),
      );
    }

    if (state.collapsed !== undefined) note.setCollapsed(state.collapsed);
    if (state.editable !== undefined) note.setEditable(state.editable);
    if (state.movable !== undefined) note.setMovable(state.movable);
    if (state.deletable !== undefined) note.setDeletable(state.deletable);

    if (typeof note.setTitle === 'function') {
      if (state.colour !== undefined) note.setColour(state.colour);
      if (state.title !== undefined) note.setTitle(state.title);
      if (state.zIndex !== undefined) note.setZIndex(state.zIndex);
      // Applied after `movable`, which it overrides.
      if (state.pinned) note.setPinned(true);
      // Last, and deliberately not through a setter: restoring metadata must
      // not stamp a fresh `updatedAt` over the one we just loaded.
      if (state.meta) note.restoreMeta(state.meta);
    }
  } finally {
    Blockly.Events.setGroup(existingGroup);
    Blockly.Events.setRecordUndo(previousRecordUndo);
  }

  return note;
}
