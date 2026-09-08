/**
 * @fileoverview JSON serialization for workspace notes.
 *
 * Notes ride along in the same payload as blocks and variables, under their
 * own top-level `workspaceNotes` key:
 *
 *     {
 *       "blocks": {...},
 *       "workspaceNotes": {"version": 1, "notes": [...]}
 *     }
 *
 * A note is a `RenderedWorkspaceComment`, so it also lands in
 * `workspace.getTopComments()` and Blockly's built-in comment serializer would
 * save it a second time — reloading would then produce two notes for every
 * one. The plugin therefore replaces that serializer with an adapter that
 * writes nothing and only exists to keep older `workspaceComments` files
 * loadable.
 */

import * as Blockly from 'blockly/core';

import {
  COMMENT_SERIALIZER_NAME,
  DEFAULT_COLOUR,
  NOTE_SERIALIZER_NAME,
  SCHEMA_VERSION,
} from './constants';
import type {NotesPayload, SavedNote, WorkspaceNotesOptions} from './types';
import {Note, NoteComment, isNote, restackNotes} from './note';

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
  {addCoordinates = false, saveIds = false} = {},
): SavedNote {
  const workspace = note.workspace;
  const state: SavedNote = {} as SavedNote;

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
      const rawX = state.x ?? 0;
      const x = workspace.RTL ? workspace.getWidth() - rawX : rawX;
      note.moveTo(new Blockly.utils.Coordinate(x, state.y ?? 0));
    }

    if (state.width !== undefined || state.height !== undefined) {
      note.setSize(new Blockly.utils.Size(state.width ?? 0, state.height ?? 0));
    }

    if (state.collapsed !== undefined) {
      note.setCollapsed(state.collapsed as boolean);
    }
    if (state.editable !== undefined)
      note.setEditable(state.editable as boolean);
    if (state.movable !== undefined) note.setMovable(state.movable as boolean);
    if (state.deletable !== undefined) {
      note.setDeletable(state.deletable as boolean);
    }

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

/**
 * Upgrades an older payload to the current schema.
 *
 * Keyed by the version being upgraded *from*; each entry returns a payload at
 * the next version.
 */
const MIGRATIONS: Record<number, (state: NotesPayload) => NotesPayload> = {
  // v0 is the unversioned shape: a bare array of note states, which is also
  // what a legacy `workspaceComments` list looks like.
  0: (state) => ({version: 1, notes: state.notes ?? []}),
};

/**
 * Normalizes and upgrades a `workspaceNotes` payload.
 *
 * @param state The raw payload.
 * @returns A payload at the current schema version.
 */
export function migrate(
  state: NotesPayload | SavedNote[] | undefined,
): NotesPayload {
  let current: NotesPayload = Array.isArray(state)
    ? {version: 0, notes: state}
    : {version: Number(state?.version) || 0, notes: state?.notes ?? []};

  if (current.version > SCHEMA_VERSION) {
    console.warn(
      `Loading workspaceNotes v${current.version} with a plugin that ` +
        `understands v${SCHEMA_VERSION}; unknown fields will be dropped.`,
    );
    return {version: SCHEMA_VERSION, notes: current.notes};
  }

  while (current.version < SCHEMA_VERSION) {
    const step = MIGRATIONS[current.version];
    if (!step) break;
    const next = step(current);
    // Guard against a migration that fails to advance the version, which
    // would otherwise spin forever.
    if ((Number(next.version) || 0) <= current.version) break;
    current = next;
  }

  return current;
}

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
   * @param [options] Set
   *     `emitLegacyComments` to keep writing the old key for a host that still
   *     reads it. Off by default, since it duplicates every note.
   */
  /** Whether to keep writing the old workspaceComments key. */
  private emitLegacyComments_: boolean;

  /** Runs alongside core's own comment serializer. */
  priority: number;

  /**
   * @param options Whether to keep emitting legacy comments.
   * @param options.emitLegacyComments Whether to write the old key too.
   */
  constructor({emitLegacyComments = false}: WorkspaceNotesOptions = {}) {
    /** @type {number} */
    this.priority = Blockly.serialization.priorities.WORKSPACE_COMMENTS;

    /**
     * @private
     */
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

/**
 * Whether this module has swapped the serializers in yet. The registry is a
 * global singleton but the plugin is per-workspace, so registration is
 * reference-counted.
 */
let registrationCount = 0;

/**
 * The comment serializer displaced on first registration, so it can be put
 * back exactly as it was.
 */
let displacedCommentSerializer: Blockly.serialization.ISerializer | null = null;

/**
 * Registers the note serializer and replaces Blockly's comment serializer.
 *
 * @param [options] Serializer options,
 *     honoured on the first registration.
 */
export function registerNoteSerializers(
  options: WorkspaceNotesOptions = {},
): void {
  if (registrationCount++) return;

  displacedCommentSerializer = Blockly.registry.getObject(
    Blockly.registry.Type.SERIALIZER,
    COMMENT_SERIALIZER_NAME,
    false,
  );

  // `register` throws on a duplicate name, so the built-in must go first.
  Blockly.serialization.registry.unregister(COMMENT_SERIALIZER_NAME);
  Blockly.serialization.registry.register(
    COMMENT_SERIALIZER_NAME,
    new LegacyCommentAdapter(options),
  );
  Blockly.serialization.registry.register(
    NOTE_SERIALIZER_NAME,
    new NoteSerializer(),
  );
}

/**
 * Restores Blockly's built-in comment serializer.
 */
export function unregisterNoteSerializers(): void {
  if (--registrationCount > 0) return;
  registrationCount = 0;

  Blockly.serialization.registry.unregister(NOTE_SERIALIZER_NAME);
  Blockly.serialization.registry.unregister(COMMENT_SERIALIZER_NAME);
  Blockly.serialization.registry.register(
    COMMENT_SERIALIZER_NAME,
    displacedCommentSerializer ??
      new Blockly.serialization.workspaceComments.WorkspaceCommentSerializer(),
  );
  displacedCommentSerializer = null;
}
