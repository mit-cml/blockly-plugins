/**
 * @fileoverview A note on a headless workspace.
 *
 * This is the class a Node test gets, and the one the serializers build when
 * no renderer exists. It carries the whole note state and none of the chrome;
 * `model/note.ts` is the same thing with a card drawn around it.
 */

import {NoteCommentBase} from './note_mixin';

/**
 * A note on a headless workspace: all of the state, none of the rendering.
 */
export class NoteComment extends NoteCommentBase {}
