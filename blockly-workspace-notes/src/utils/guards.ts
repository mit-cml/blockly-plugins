/**
 * @fileoverview Recognising a note among a workspace's comments.
 *
 * A workspace hands back `WorkspaceComment`s, and a host can still create a
 * plain one alongside its notes, so every place that walks the comment list
 * narrows it through here first.
 *
 * The check reads the mark `model/note_mixin.ts` puts on every note, rather
 * than testing `instanceof` against the two classes. Two reasons. It keeps
 * this module at the bottom of the import graph - importing the classes here
 * is what used to close the loop through `model/stacking.ts` - and a symbol
 * read is not defeated by the plugin being bundled twice, which `instanceof`
 * is. It is still not duck typing: a plain comment carrying a `title` property
 * has no way to be carrying `NOTE_BRAND` as well.
 *
 * The classes are imported for their types alone, and that import must stay
 * written as `import type`: relying on TypeScript to elide it would put the
 * cycle back the day someone turns on `verbatimModuleSyntax`.
 *
 * Note that `ui/context_menu.ts` and `clipboard/note_paster.ts` still use
 * `instanceof Note` directly, and so are narrower than this - they want the
 * rendered class specifically. The two have never agreed anyway: a headless
 * `NoteComment` passes `isNote` and fails `instanceof Note`.
 */

import {NOTE_BRAND} from '../constants/brand';
import type {Note} from '../model/note';
import type {NoteComment} from '../model/note_comment';

/**
 * @param candidate Any value.
 * @returns Whether the value is a note.
 */
export function isNote(candidate: unknown): candidate is Note | NoteComment {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    (candidate as Record<symbol, unknown>)[NOTE_BRAND] === true
  );
}
