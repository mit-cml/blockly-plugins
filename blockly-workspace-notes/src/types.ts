/**
 * @fileoverview The shapes that travel between modules.
 *
 * In the JavaScript version most of these were `{!Object}` — one annotation
 * standing in for a note, a note's saved state, a JSON payload, clipboard data
 * and an options bag. The state record is the one worth naming most: it is a
 * persisted format, written to save files and read back by `migrate`, so it
 * outlives any single release and belongs in one place rather than being
 * re-derived wherever it is touched.
 */

import type * as Blockly from 'blockly/core';

/**
 * Who made a note and when.
 *
 * The timestamps are ISO 8601 strings rather than `Date` objects because they
 * are written to JSON and read back verbatim.
 */
export interface NoteMeta {
  author: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything a note carries beyond what a workspace comment already has.
 */
export interface NoteState {
  title: string;
  colour: string;
  pinned: boolean;
  zIndex: number;
  meta: NoteMeta;
}

/**
 * One entry in a note palette.
 *
 * `hue` is what the picker sorts and derives from; `fill` is the resolved hex
 * so the swatch does not have to recompute it.
 */
export interface PaletteEntry {
  name: string;
  hue: number;
  fill: string;
}

/**
 * A note's serialized form, as it appears in a save file.
 *
 * Deliberately sparse: `saveNote` writes width and height always and everything
 * else only when it differs from the default, so most notes serialize to a
 * handful of keys.
 */
export interface SavedNote {
  width: number;
  height: number;
  x?: number;
  y?: number;
  id?: string;
  text?: string;
  title?: string;
  colour?: string;
  pinned?: boolean;
  zIndex?: number;
  meta?: Partial<NoteMeta>;
  [key: string]: unknown;
}

/**
 * The plugin's own slice of a save file, under the `workspaceNotes` key.
 */
export interface NotesPayload {
  version: number;
  notes: SavedNote[];
}

/**
 * Which properties `applyNoteProperty` understands.
 *
 * `'*'` means "replace the whole state", which is how a paste and an undo
 * restore a note in one step.
 */
export type NoteProperty =
  'title' | 'colour' | 'pinned' | 'zIndex' | 'meta' | '*';

/**
 * The value that goes with each `NoteProperty`.
 *
 * This is what the `{*}` annotation stood in for: the switch in
 * `applyNoteProperty` writes into a string slot, a boolean slot, a number slot,
 * an object slot and a whole-state slot, and only the property name says which.
 */
export type NotePropertyValue =
  string | boolean | number | Partial<NoteMeta> | NoteState | null;

/**
 * Everything `WorkspaceNotes` accepts.
 */
export interface WorkspaceNotesOptions {
  palette?: PaletteEntry[];
  defaultSize?: {width: number; height: number};
  getAuthor?: () => string;
  contextMenu?: boolean;
  skipSerializerRegistration?: boolean;
  emitLegacyComments?: boolean;
  xmlSupport?: boolean;
}

/**
 * Clipboard data for a note.
 *
 * Core's `WorkspaceCommentCopyData` carries only `commentState`; a note adds
 * its own half so a pasted note keeps its title and colour.
 */
export interface NoteCopyData {
  paster: string;
  commentState: {[key: string]: unknown};
  noteState?: NoteState;
}

/**
 * The JSON shape of a `NoteChange` event.
 *
 * Core's `CommentBaseJson` declares only `commentId`, so the three fields this
 * event adds need declaring for `toJson` to be assignable to the base.
 */
export interface NoteChangeJson extends Blockly.Events.CommentBaseJson {
  property?: NoteProperty;
  oldValue?: NotePropertyValue;
  newValue?: NotePropertyValue;
}
