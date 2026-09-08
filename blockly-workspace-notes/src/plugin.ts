/**
 * @fileoverview `WorkspaceNotes`: the object a host application constructs.
 *
 * Everything else in the plugin is a piece this class switches on. `init`
 * claims the registries — the serializers, the paster, the event, the context
 * menu, the `Blockly.Xml` entry points — and `dispose` hands every one of them
 * back, so a host can attach notes to a workspace and detach them again
 * without leaving Blockly changed.
 *
 * Importing `ui/css` here is what registers the stylesheet, and it has to
 * happen before `Blockly.inject`: `Blockly.Css.register` only affects
 * injections that come after it.
 */

import * as Blockly from 'blockly/core';

import './ui/css';
import {DEFAULT_PALETTE} from './constants/colours';
import {DEFAULT_SIZE} from './constants/layout';
import {
  applyDefaultNoteSize,
  restoreDefaultNoteSize,
} from './model/default_size';
import {Note} from './model/note';
import {NoteComment} from './model/note_comment';
import {nextZIndex} from './model/stacking';
import {
  registerNotePaster,
  unregisterNotePaster,
} from './clipboard/note_paster';
import {registerNoteChangeEvent} from './events/registry';
import {
  registerNoteSerializers,
  unregisterNoteSerializers,
} from './serialization/registry';
import {createNote as makeNote} from './serialization/state';
import {
  registerXmlSupport,
  unregisterXmlSupport,
} from './serialization/xml/patch';
import type {SavedNote} from './types/serialization';
import type {WorkspaceNotesOptions} from './types/options';
import {
  registerNoteContextMenu,
  unregisterNoteContextMenu,
} from './ui/context_menu';
import {isNote} from './utils/guards';
import {asOneUndoStep} from './utils/undo';

/**
 * Adds note support to a workspace.
 */
export class WorkspaceNotes {
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
   * @param options Plugin options. `skipSerializerRegistration` leaves
   *     persistence entirely to the host app; `emitLegacyComments` keeps
   *     writing the old `workspaceComments` key as well, which duplicates
   *     every note and is off by default; `xmlSupport` wraps the `Blockly.Xml`
   *     entry points so notes survive the older XML format too, and can be
   *     turned off by a host that only uses JSON.
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

    applyDefaultNoteSize(this.options.defaultSize);

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

    restoreDefaultNoteSize();

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
    return asOneUndoStep(() => {
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
    });
  }

  /**
   * @returns Every note on the workspace.
   */
  getNotes(): Array<Note | NoteComment> {
    return this.workspace.getTopComments(false).filter(isNote);
  }
}
