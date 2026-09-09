/**
 * @fileoverview The JSON shape of the plugin's own undo event.
 */

import type * as Blockly from 'blockly/core';

import type {NoteProperty, NotePropertyValue} from './note';

/**
 * The JSON shape of a `NoteChange` event.
 *
 * Core's `CommentBaseJson` declares only `commentId`, so the three fields this
 * event adds need declaring for `toJson` to be assignable to the base.
 */
export interface NoteChangeJson extends Blockly.Events.CommentBaseJson {
  property?: NoteProperty;
  oldValue?: NotePropertyValue;
  newValue?: NotePropertyValue;
}
