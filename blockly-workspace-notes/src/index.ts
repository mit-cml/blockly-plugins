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
 * @example
 * import * as Blockly from 'blockly';
 * import {WorkspaceNotes} from '@mit-app-inventor/blockly-workspace-notes';
 *
 * const workspace = Blockly.inject('blocklyDiv', {toolbox});
 * const notes = new WorkspaceNotes(workspace);
 * notes.init();
 */

import * as Blockly from 'blockly/core';

import './css';
import {
  registerNoteContextMenu,
  unregisterNoteContextMenu,
} from './context_menu';
import type {SavedNote, WorkspaceNotesOptions} from './types';
import {DEFAULT_PALETTE, DEFAULT_SIZE} from './constants';
import {Note, NoteComment, isNote, nextZIndex} from './note';
import {registerNoteChangeEvent} from './events';
import {registerNotePaster, unregisterNotePaster} from './paster';
import {
  createNote as makeNote,
  registerNoteSerializers,
  unregisterNoteSerializers,
} from './serializer';
import {registerXmlSupport, unregisterXmlSupport} from './xml';

/**
 * Adds note support to a workspace.
 */
export class WorkspaceNotes {
  /**
   * @param workspace The workspace to add notes to. A
   *     headless workspace works too; it simply gets unrendered notes.
   * @param {{
   *   palette?: !Array<{name: string, hue: number, fill: string}>,
   *   defaultSize?: {width: number, height: number},
   *   getAuthor?: function(): string,
   *   contextMenu?: boolean,
   *   skipSerializerRegistration?: boolean,
   *   emitLegacyComments?: boolean,
   *   xmlSupport?: boolean,
   * }} [options] Plugin options. `skipSerializerRegistration` leaves
   *     persistence entirely to the host app; `emitLegacyComments` keeps
   *     writing the old `workspaceComments` key as well, which duplicates
   *     every note and is off by default; `xmlSupport` wraps the
   *     `Blockly.Xml` entry points so notes survive the older XML format
   *     too, and can be turned off by a host that only uses JSON.
   */
  /** The workspace this instance is attached to. */
  protected workspace: Blockly.Workspace;

  /** The options this instance was constructed with, over the defaults. */
  protected options: Required<WorkspaceNotesOptions>;

  /** The workspace's own `newComment`, while ours is in its place. */
  private originalNewComment_:
    ((id?: string) => Blockly.comments.WorkspaceComment) | null = null;

  /** Whether `init` has run, so it stays idempotent. */
  private initialized_ = false;

  /**
   * @param workspace The workspace to add notes to. A headless workspace works
   *     too; it simply gets unrendered notes.
   * @param options Plugin options.
   */
  constructor(
    workspace: Blockly.Workspace,
    options: WorkspaceNotesOptions = {},
  ) {
    this.workspace = workspace;
    this.options = {
      palette: DEFAULT_PALETTE,
      defaultSize: DEFAULT_SIZE,
      contextMenu: true,
      skipSerializerRegistration: false,
      emitLegacyComments: false,
      xmlSupport: true,
      getAuthor: () => '',
      ...options,
    };
  }

  /**
   * Starts the plugin.
   */
  init(): void {
    if (this.initialized_) return;
    this.initialized_ = true;

    // Blockly's own default is sized for a comment whose whole chrome is a
    // 24px bar; a note's margins would leave that barely two lines.
    const {width, height} = this.options.defaultSize;
    Blockly.comments.CommentView.defaultCommentSize = new Blockly.utils.Size(
      width,
      height,
    );

    // Patched on the instance rather than the prototype: scoped to this
    // workspace and trivially reversible. This is what makes undoing a delete
    // rebuild a Note — core's CommentCreate replays through
    // `workspace.newComment()`.
    this.originalNewComment_ = this.workspace.newComment;
    this.workspace.newComment = (id) => makeNote(this.workspace, id);

    registerNoteChangeEvent();

    if (!this.options.skipSerializerRegistration) {
      registerNoteSerializers({
        emitLegacyComments: this.options.emitLegacyComments,
      });
    }

    registerNotePaster();

    if (this.options.xmlSupport) {
      registerXmlSupport();
    }

    if (this.options.contextMenu) {
      registerNoteContextMenu({palette: this.options.palette});
    }
  }

  /**
   * Stops the plugin and restores everything it replaced.
   *
   * The serializer, paster and context menu registries are global singletons
   * shared by every workspace, so they are reference-counted and only really
   * restored once the last plugin instance is disposed.
   */
  dispose(): void {
    if (!this.initialized_) return;
    this.initialized_ = false;

    if (this.originalNewComment_) {
      this.workspace.newComment = this.originalNewComment_;
      this.originalNewComment_ = null;
    }

    if (!this.options.skipSerializerRegistration) {
      unregisterNoteSerializers();
    }

    unregisterNotePaster();

    if (this.options.xmlSupport) {
      unregisterXmlSupport();
    }

    if (this.options.contextMenu) {
      unregisterNoteContextMenu();
    }
  }

  /**
   * Creates a note on the workspace.
   *
   * @param state Initial values for the note.
   * @returns The new note.
   */
  createNote(state: Partial<SavedNote> = {}): Note | NoteComment {
    const existingGroup = Blockly.Events.getGroup();
    if (!existingGroup) Blockly.Events.setGroup(true);
    try {
      const note = makeNote(this.workspace);
      if (state.text) note.setText(state.text);
      if (state.title) note.setTitle(state.title);
      if (state.colour) note.setColour(state.colour);
      if (state.x !== undefined || state.y !== undefined) {
        note.moveTo(new Blockly.utils.Coordinate(state.x ?? 0, state.y ?? 0));
      }
      note.setZIndex(nextZIndex(this.workspace));
      note.restoreMeta({author: this.options.getAuthor()});
      return note;
    } finally {
      Blockly.Events.setGroup(existingGroup);
    }
  }

  /**
   * @returns Every note on the workspace.
   */
  getNotes(): Array<Note | NoteComment> {
    return this.workspace.getTopComments(false).filter(isNote);
  }
}

export type {
  NoteChangeJson,
  NoteCopyData,
  NoteMeta,
  NoteProperty,
  NotePropertyValue,
  NoteState,
  NotesPayload,
  PaletteEntry,
  SavedNote,
  WorkspaceNotesOptions,
} from './types';
export type {NoteSurface} from './note';
export {Note, NoteComment, isNote, restackNotes} from './note';
export {NoteChange} from './events';
export {NotePaster} from './paster';
export {
  LegacyCommentAdapter,
  NoteSerializer,
  appendNote,
  migrate,
  saveNote,
} from './serializer';
export {domToNote, domToNoteState, noteToDom} from './xml';
export {
  DEFAULT_COLOUR,
  DEFAULT_PALETTE,
  NOTE_SERIALIZER_NAME,
  SCHEMA_VERSION,
} from './constants';
