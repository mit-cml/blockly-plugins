/**
 * @fileoverview Upgrading a `workspaceNotes` payload written by an older
 * version of this plugin.
 *
 * Every save file ever written has to keep loading, so this is the one place
 * that knows what earlier versions looked like. Adding a field to `SavedNote`
 * needs a `SCHEMA_VERSION` bump in `constants/serialization.ts` and an entry
 * in `MIGRATIONS` below, keyed by the version it upgrades *from*.
 */

import {SCHEMA_VERSION} from '../constants/serialization';
import type {NotesPayload, SavedNote} from '../types/serialization';

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
