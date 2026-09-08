/**
 * @fileoverview The on-disk shapes: one note, and the plugin's slice of a save
 * file.
 *
 * These are a persisted format. A change here is a change to files already
 * written by earlier versions, so it needs a `SCHEMA_VERSION` bump and a
 * matching entry in `serialization/migrations.ts`.
 */

import type {NoteMeta} from './note';

/**
 * A note's serialized form, as it appears in a save file.
 *
 * Deliberately sparse: `saveNote` writes width and height always and everything
 * else only when it differs from the default, so most notes serialize to a
 * handful of keys.
 */
export interface SavedNote {
  // Geometry and the fields core's own comment format carries. Every one is
  // optional, matching `Blockly.serialization.workspaceComments.State`: a
  // sparse file may omit any of them, and `appendNote` falls back to the
  // note's own defaults rather than assuming a value is present.
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  collapsed?: boolean;
  editable?: boolean;
  movable?: boolean;
  deletable?: boolean;

  // What a note adds.
  title?: string;
  colour?: string;
  pinned?: boolean;
  zIndex?: number;
  meta?: Partial<NoteMeta>;

  // Unknown keys are preserved rather than rejected, so a file written by a
  // newer version of the plugin survives a load and re-save by an older one.
  [key: string]: unknown;
}

/**
 * The plugin's own slice of a save file, under the `workspaceNotes` key.
 */
export interface NotesPayload {
  version: number;
  notes: SavedNote[];
}
