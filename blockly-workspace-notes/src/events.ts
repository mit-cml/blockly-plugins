/**
 * @fileoverview A custom Blockly event making note-specific properties
 * undoable.
 *
 * Core fires nothing for `setMovable`/`setEditable`/`setDeletable`, and
 * `CommentCreate` snapshots a note through core's comment serializer — which
 * knows nothing about titles or colours. Without this event, undo would
 * silently drop everything the plugin adds.
 */

import * as Blockly from 'blockly/core';

import type {NoteChangeJson, NoteProperty, NotePropertyValue} from './types';
import {NOTE_CHANGE_EVENT_TYPE} from './constants';

/**
 * The part of a note this event needs in order to replay itself.
 *
 * Structural rather than importing `Note`: the event module sits below the
 * note module in the dependency graph, and only ever calls this one method.
 */
interface NoteLike {
  applyNoteProperty(property: NoteProperty, value?: NotePropertyValue): void;
}

/**
 * Notifies listeners that a note-specific property changed.
 *
 * The `property` is a key understood by `Note.applyNoteProperty()`; `oldValue`
 * and `newValue` are the JSON-serializable values on either side of the
 * change. The special property `'*'` carries a whole note-state object, which
 * is how a note's extra fields survive being deleted and undone.
 */
export class NoteChange extends Blockly.Events.CommentBase {
  /** The property that changed, or undefined on a blank event. */
  property?: NoteProperty;

  /** The value before the change. */
  oldValue?: NotePropertyValue;

  /** The value after the change. */
  newValue?: NotePropertyValue;

  /**
   * @param comment The note that changed. Undefined for a blank event.
   * @param property The property that changed.
   * @param oldValue The value before the change.
   * @param newValue The value after the change.
   */
  constructor(
    comment?: Blockly.comments.WorkspaceComment,
    property?: NoteProperty,
    oldValue?: NotePropertyValue,
    newValue?: NotePropertyValue,
  ) {
    super(comment);
    this.type = NOTE_CHANGE_EVENT_TYPE;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  /**
   * Encodes the event as JSON.
   * @returns JSON representation.
   */
  toJson(): NoteChangeJson {
    const json = super.toJson() as NoteChangeJson;
    json['property'] = this.property;
    json['oldValue'] = this.oldValue;
    json['newValue'] = this.newValue;
    return json;
  }

  /**
   * Deserializes the JSON event.
   * @param json The JSON to decode.
   * @param workspace The workspace the event belongs to.
   * @param [event] An event to populate, for subclasses.
   * @returns The decoded event.
   */
  static fromJson(
    json: NoteChangeJson,
    workspace: Blockly.Workspace,
    event?: NoteChange,
  ): NoteChange {
    const newEvent = super.fromJson(
      json,
      workspace,
      event ?? new NoteChange(),
    ) as NoteChange;
    newEvent.property = json['property'];
    newEvent.oldValue = json['oldValue'];
    newEvent.newValue = json['newValue'];
    return newEvent;
  }

  /**
   * Does this event record any change of state?
   *
   * Values may be objects (for the `'*'` property), so compare structurally.
   * Filtering no-ops here keeps them off the undo stack — core's
   * `CommentCollapse` omits this and pollutes the stack as a result.
   * @returns False if something changed.
   */
  isNull(): boolean {
    return JSON.stringify(this.oldValue) === JSON.stringify(this.newValue);
  }

  /**
   * Runs the change event.
   * @param forward True to run forward, false to undo.
   */
  run(forward: boolean): void {
    const workspace = this.getEventWorkspace_();
    const note = this.commentId
      ? (workspace.getCommentById(this.commentId) as NoteLike | null)
      : null;
    if (!note || typeof note.applyNoteProperty !== 'function') {
      // Matches core's tolerance for replaying against a vanished object.
      console.warn(`Can't change non-existent note: ${this.commentId}`);
      return;
    }
    if (!this.property) return;
    note.applyNoteProperty(
      this.property,
      forward ? this.newValue : this.oldValue,
    );
  }
}

/**
 * Registers NoteChange so `Blockly.Events.fromJson` can rebuild it. Safe to
 * call repeatedly; re-registering the identical class is a no-op in Blockly's
 * registry, and a duplicate-name throw would only mean it is already present.
 */
export function registerNoteChangeEvent(): void {
  try {
    Blockly.registry.register(
      Blockly.registry.Type.EVENT,
      NOTE_CHANGE_EVENT_TYPE,
      NoteChange,
    );
  } catch {
    // Already registered by another copy of the plugin.
  }
}
