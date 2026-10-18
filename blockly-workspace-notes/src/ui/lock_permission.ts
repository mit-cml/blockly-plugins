/**
 * @fileoverview Who is allowed to lock and unlock a note.
 *
 * Locking is the one thing a note does that is a matter of permission rather
 * than preference, and the plugin has no idea what a host's permissions are.
 * So the host supplies a predicate and this module holds it.
 *
 * It is held per workspace, deliberately. Every other registration the plugin
 * makes is reference-counted and first-registration-wins, because the Blockly
 * registries it writes into are global singletons and sharing a palette
 * between two workspaces is harmless. Sharing a *permission* is not: a host
 * running an authoring workspace beside a read-only one would hand whichever
 * plugin instance happened to initialize first the final say over both. The
 * WeakMap here is what keeps the two apart, and it lets a disposed workspace
 * be collected even if `dispose` is never called.
 *
 * This gates the context menu, and nothing else. `setLocked` still works from
 * code — it has to, or undo, paste and loading a file would all break — so
 * this is an affordance, not a security boundary. A host that needs the
 * guarantee enforces it where it saves.
 */

import type * as Blockly from 'blockly/core';

import type {Note} from '../model/note';
import type {NoteComment} from '../model/note_comment';

/** Decides whether a note's lock may be changed by hand. */
export type LockPredicate = (note: Note | NoteComment) => boolean;

/** The predicate each workspace was given, if it was given one. */
const predicates = new WeakMap<Blockly.Workspace, LockPredicate>();

/**
 * Records who may lock and unlock notes on a workspace.
 *
 * @param workspace The workspace the rule applies to.
 * @param predicate The host's rule.
 */
export function setLockPermission(
  workspace: Blockly.Workspace,
  predicate: LockPredicate,
): void {
  predicates.set(workspace, predicate);
}

/**
 * Forgets a workspace's rule, restoring the permissive default.
 *
 * @param workspace The workspace to forget.
 */
export function clearLockPermission(workspace: Blockly.Workspace): void {
  predicates.delete(workspace);
}

/**
 * Asks whether this note's lock may be changed by hand.
 *
 * Permissive when no rule was set, so a host that never mentions locking gets
 * a lock that simply works.
 *
 * @param note The note in question.
 * @returns Whether the menu should offer to lock or unlock it.
 */
export function canToggleLock(note: Note | NoteComment): boolean {
  const predicate = predicates.get(note.workspace);
  return predicate ? !!predicate(note) : true;
}
