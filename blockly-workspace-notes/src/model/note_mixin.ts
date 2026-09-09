/**
 * @fileoverview The note behaviour, as a mixin over a workspace comment class.
 *
 * Blockly keeps its comment model and its rendered comment in a single
 * inheritance chain (`WorkspaceComment` -> `RenderedWorkspaceComment`), and a
 * headless workspace only ever produces the former. The extra state is
 * therefore expressed as a mixin and applied to both, so notes work
 * identically in a browser and in a headless workspace (which is all a Node
 * test can build — `Blockly.inject` is unavailable there).
 *
 * Everything here works without a DOM. The four `render*`/`apply*` methods are
 * the seam: they are no-ops at this level, and `model/note.ts` overrides them
 * to paint the same state onto SVG.
 */

import * as Blockly from 'blockly/core';

import {DEFAULT_COLOUR} from '../constants/colours';
import {NoteChange} from '../events/note_change';
import {asOneUndoStep} from '../utils/undo';
import type {
  NoteMeta,
  NoteProperty,
  NotePropertyValue,
  NoteState,
  NoteSurface,
} from '../types/note';

/**
 * Any constructor producing a workspace comment.
 *
 * `any[]` rather than the real parameters because a mixin cannot know what its
 * base takes; the two exported classes below restore the real signature.
 */
type CommentConstructor = new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Blockly.comments.WorkspaceComment;

/**
 * Adds note state and behaviour to a workspace comment class.
 *
 * @param Base `WorkspaceComment` or `RenderedWorkspaceComment`.
 * @returns The extended class.
 */
const NoteMixin = <TBase extends CommentConstructor>(Base: TBase) =>
  class extends Base {
    /**
     * This note's extra state, created on first access.
     *
     * Declared without an initializer on purpose. `target: es6` keeps
     * `useDefineForClassFields` off, so this declaration emits nothing — which
     * matters, because a field definition would run after `super()` and wipe a
     * value that the base constructor's create event had already caused to be
     * built.
     */
    protected noteState_?: NoteState;

    /**
     * Returns this note's extra state, creating it on first access.
     *
     * The state is built lazily rather than in a class field because subclass
     * fields are initialized only after `super()` returns, and the
     * `WorkspaceComment` constructor already fires a create event and drives
     * view setup before that point.
     *
     * @returns The live state object. Treat as read-only.
     */
    getNoteState(): NoteState {
      if (!this.noteState_) {
        const now = new Date().toISOString();
        this.noteState_ = {
          title: '',
          colour: DEFAULT_COLOUR,
          pinned: false,
          zIndex: 0,
          meta: {author: '', createdAt: now, updatedAt: now},
        };
      }
      return this.noteState_;
    }

    /** @returns The note's title, or '' if it has none. */
    getTitle(): string {
      return this.getNoteState().title;
    }

    /**
     * Sets the note's title.
     * @param title The new title.
     */
    setTitle(title: string): void {
      this.changeNoteProperty_('title', String(title ?? ''));
    }

    /** @returns The note's background colour as a hex string. */
    getColour(): string {
      return this.getNoteState().colour;
    }

    /**
     * Sets the note's background colour.
     * @param colour A CSS colour; parsed to hex via Blockly.
     */
    setColour(colour: string): void {
      const parsed = Blockly.utils.colour.parse(colour) ?? DEFAULT_COLOUR;
      this.changeNoteProperty_('colour', parsed);
    }

    /** @returns Whether the note is pinned. */
    isPinned(): boolean {
      return this.getNoteState().pinned;
    }

    /**
     * Pins or unpins the note. A pinned note is locked in place and kept in
     * front of its neighbours.
     * @param pinned Whether the note should be pinned.
     */
    setPinned(pinned: boolean): void {
      this.changeNoteProperty_('pinned', !!pinned);
    }

    /** @returns The note's stacking order; higher is nearer front. */
    getZIndex(): number {
      return this.getNoteState().zIndex;
    }

    /**
     * Sets the note's stacking order.
     * @param zIndex The new stacking order.
     */
    setZIndex(zIndex: number): void {
      this.changeNoteProperty_('zIndex', Number(zIndex) || 0);
    }

    /** @returns A copy of the note's metadata. */
    getMeta(): NoteMeta {
      return {...this.getNoteState().meta};
    }

    /**
     * Replaces the note's metadata wholesale, without firing an event or
     * bumping `updatedAt`. Used when loading, so a round-trip preserves
     * timestamps verbatim.
     * @param meta The metadata to restore.
     */
    restoreMeta(meta: Partial<NoteMeta>): void {
      this.getNoteState().meta = {...this.getNoteState().meta, ...meta};
    }

    /**
     * Records a body edit, then hands off to core.
     *
     * The note's own setters all touch the metadata through
     * `changeNoteProperty_`, but the body is core's and goes nowhere near it -
     * so without this, `updatedAt` would track the title, colour, pin and
     * stacking order while ignoring the thing people actually spend their time
     * changing, and a note edited all afternoon would still claim it was last
     * touched when it was named.
     *
     * No event of our own: core already fires its own change event for the
     * text, and the timestamp rides along in the note's state.
     *
     * @param text The new body text.
     */
    setText(text: string): void {
      if (text !== this.getText()) this.touchMeta();
      super.setText(text);
    }

    /** Records that the note changed just now. */
    touchMeta(): void {
      this.getNoteState().meta.updatedAt = new Date().toISOString();
    }

    /**
     * Returns a plain, JSON-serializable copy of every note-specific field.
     * @returns The note's extra state.
     */
    saveNoteState(): NoteState {
      const state = this.getNoteState();
      return {
        title: state.title,
        colour: state.colour,
        pinned: state.pinned,
        zIndex: state.zIndex,
        meta: {...state.meta},
      };
    }

    /**
     * Applies a property change without firing an event.
     *
     * This is the single write path: `changeNoteProperty_` uses it for user
     * edits, and {@link NoteChange} uses it to replay undo and redo.
     *
     * @param property The property name, or '*' for a whole state
     *     object.
     * @param value The value to apply.
     */
    applyNoteProperty(property: NoteProperty, value?: NotePropertyValue): void {
      const state = this.getNoteState();
      // The property name is what says which shape `value` has — a
      // correspondence the type system cannot see across two independent
      // parameters, so each case asserts the one it knows it has.
      switch (property) {
        case 'title':
          state.title = value as string;
          this.renderTitle();
          break;
        case 'colour':
          state.colour = value as string;
          this.renderColour();
          break;
        case 'pinned':
          state.pinned = value as boolean;
          this.applyPinned();
          break;
        case 'zIndex':
          state.zIndex = value as number;
          this.applyZIndex();
          break;
        case 'meta':
          state.meta = {...(value as NoteMeta)};
          break;
        case '*': {
          // Null is the "forward" half of a delete snapshot: there is nothing
          // to restore when replaying towards the deletion.
          if (!value) break;
          const whole = value as NoteState;
          state.title = whole.title;
          state.colour = whole.colour;
          state.pinned = whole.pinned;
          state.zIndex = whole.zIndex;
          state.meta = {...whole.meta};
          this.renderTitle();
          this.renderColour();
          this.applyPinned();
          this.applyZIndex();
          break;
        }
        default:
          console.warn(`Unknown note property: ${property}`);
      }
    }

    /**
     * Reads a single note property.
     * @param property The property name, or '*'.
     * @returns The current value.
     */
    protected readNoteProperty_(property: NoteProperty): NotePropertyValue {
      return property === '*'
        ? this.saveNoteState()
        : this.getNoteState()[property];
    }

    /**
     * Applies a change and fires an undoable event describing it.
     * @param property The property name.
     * @param value The new value.
     */
    protected changeNoteProperty_(
      property: NoteProperty,
      value: NotePropertyValue,
    ): void {
      const oldValue = this.readNoteProperty_(property);
      if (JSON.stringify(oldValue) === JSON.stringify(value)) return;

      this.applyNoteProperty(property, value);
      this.touchMeta();

      if (Blockly.Events.isEnabled()) {
        Blockly.Events.fire(new NoteChange(this, property, oldValue, value));
      }
    }

    /** Reflects the title in the DOM. Overridden by the rendered subclass. */
    renderTitle(): void {}

    /** Reflects the colour in the DOM. Overridden by the rendered subclass. */
    renderColour(): void {}

    /** Applies the pinned flag. Locking works headlessly too. */
    applyPinned(): void {
      this.setMovable(!this.getNoteState().pinned);
    }

    /** Applies the stacking order. Overridden by the rendered subclass. */
    applyZIndex(): void {}

    /**
     * Disposes of the note.
     *
     * A snapshot event is fired *before* the delete so that undoing a deletion
     * restores the extra fields: a group is undone in reverse, so core's
     * `CommentCreate` rebuilds the bare note first and this event then
     * repaints it. Core's delete event only carries the fields its own
     * serializer knows about.
     *
     * Both events must share a group, or undo would stop after the first and
     * the user would need a second undo to get the colour back.
     */
    dispose(): void {
      asOneUndoStep(() => {
        if (!this.isDeadOrDying() && Blockly.Events.isEnabled()) {
          // newValue is null rather than the state: an event whose two sides
          // are equal is dropped by isNull() and never reaches the undo stack.
          Blockly.Events.fire(
            new NoteChange(this, '*', this.saveNoteState(), null),
          );
        }
        super.dispose();
      });
    }
  };

/**
 * The mixin applied to the headless comment, with its real constructor.
 *
 * Naming the result is what makes both of the following work: the constructor
 * parameters survive (a mixin's base is `...args: any[]`, which would otherwise
 * erase them), and `declaration: true` has a type it can write down instead of
 * an anonymous class expression.
 */
export const NoteCommentBase = NoteMixin(
  Blockly.comments.WorkspaceComment,
) as new (
  workspace: Blockly.Workspace,
  id?: string,
) => Blockly.comments.WorkspaceComment & NoteSurface;

/**
 * The mixin applied to the rendered comment. See `NoteCommentBase`.
 */
export const RenderedNoteBase = NoteMixin(
  Blockly.comments.RenderedWorkspaceComment,
) as new (
  workspace: Blockly.WorkspaceSvg,
  id?: string,
) => Blockly.comments.RenderedWorkspaceComment & NoteSurface;
