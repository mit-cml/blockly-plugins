/**
 * @fileoverview Recognising a note among a workspace's comments.
 *
 * A workspace hands back `WorkspaceComment`s, and a host can still create a
 * plain one alongside its notes, so every place that walks the comment list
 * narrows it through here first.
 *
 * The check is `instanceof` against both concrete classes rather than a duck
 * type: a plain comment carrying a `title` property should not be mistaken for
 * a note.
 */

import {Note} from '../model/note';
import {NoteComment} from '../model/note_comment';

/**
 * @param candidate Any value.
 * @returns Whether the value is a note.
 */
export function isNote(candidate: unknown): candidate is Note | NoteComment {
  return candidate instanceof Note || candidate instanceof NoteComment;
}
