/**
 * @fileoverview Teaching Blockly's event registry about `NoteChange`.
 *
 * Separate from the event itself so that importing the class — to construct
 * one, or to name it in a type — never has the side effect of registering it.
 */

import * as Blockly from 'blockly/core';

import {NOTE_CHANGE_EVENT_TYPE} from '../constants/serialization';
import {NoteChange} from './note_change';

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
