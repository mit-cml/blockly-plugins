/**
 * @fileoverview A Blockly plugin adding sticky-note style workspace comments
 * with first-class JSON serialization.
 *
 * Notes extend Blockly's own workspace comments — so dragging, resizing,
 * collapsing, selection, keyboard navigation and undo all come for free — and
 * add a title, a colour, authorship metadata and a stacking order. They are
 * saved under their own versioned `workspaceNotes` key alongside `blocks`, and
 * older `workspaceComments` files still load.
 *
 * This file is the package's whole public surface and holds no logic of its
 * own: anything not re-exported here is internal, and free to move. It is also
 * the build entry point, which `@blockly/dev-scripts` resolves by path, so it
 * stays at `src/index.ts`.
 *
 * @example
 * import * as Blockly from 'blockly';
 * import {WorkspaceNotes} from '@mit-app-inventor/blockly-workspace-notes';
 *
 * const workspace = Blockly.inject('blocklyDiv', {toolbox});
 * const notes = new WorkspaceNotes(workspace);
 * notes.init();
 */

// The plugin itself: what a host application constructs.
export {WorkspaceNotes} from './plugin';

// The note classes, and how to recognise and order them.
export {Note} from './model/note';
export {NoteComment} from './model/note_comment';
export {restackNotes} from './model/stacking';
export {isNote} from './utils/guards';

// Persistence, for a host that drives saving and loading itself.
export {LegacyCommentAdapter} from './serialization/legacy_comment_adapter';
export {migrate} from './serialization/migrations';
export {NoteSerializer} from './serialization/note_serializer';
export {appendNote, saveNote} from './serialization/state';
export {domToNote, domToNoteState, noteToDom} from './serialization/xml/dom';

// The undo event and the paster, for a host extending either.
export {NoteChange} from './events/note_change';
export {NotePaster} from './clipboard/note_paster';

// The handful of constants a host is expected to read.
export {DEFAULT_COLOUR, DEFAULT_PALETTE} from './constants/colours';
export {NOTE_SERIALIZER_NAME, SCHEMA_VERSION} from './constants/serialization';

export type {NoteCopyData} from './types/clipboard';
export type {NoteChangeJson} from './types/events';
export type {
  NoteMeta,
  NoteProperty,
  NotePropertyValue,
  NoteState,
  NoteSurface,
} from './types/note';
export type {NotesPayload, SavedNote} from './types/serialization';
export type {LockPredicate} from './ui/lock_permission';
export type {PaletteEntry, WorkspaceNotesOptions} from './types/options';
