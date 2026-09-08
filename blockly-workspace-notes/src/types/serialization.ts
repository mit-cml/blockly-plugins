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
