/**
 * @fileoverview What a copied note puts on the clipboard.
 */

import type {NoteState} from './note';

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
