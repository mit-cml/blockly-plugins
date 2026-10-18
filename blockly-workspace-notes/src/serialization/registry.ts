/**
 * @fileoverview Swapping the plugin's serializers into Blockly's registry, and
 * putting core's back.
 *
 * The registry is a global singleton while the plugin is per-workspace, so
 * registration is reference-counted: two workspaces on one page register once
 * between them, and core's serializer only returns when the last one goes.
 */

import * as Blockly from 'blockly/core';

import {
  COMMENT_SERIALIZER_NAME,
  NOTE_SERIALIZER_NAME,
} from '../constants/serialization';
import type {WorkspaceNotesOptions} from '../types/options';
import {LegacyCommentAdapter} from './legacy_comment_adapter';
import {NoteSerializer} from './note_serializer';

/**
 * Whether this module has swapped the serializers in yet. The registry is a
 * global singleton but the plugin is per-workspace, so registration is
 * reference-counted.
 */
let registrationCount = 0;

/**
 * The comment serializer displaced on first registration, so it can be put
 * back exactly as it was.
 */
let displacedCommentSerializer: Blockly.serialization.ISerializer | null = null;

/**
 * Registers the note serializer and replaces Blockly's comment serializer.
 *
 * @param [options] Serializer options,
 *     honoured on the first registration.
 */
export function registerNoteSerializers(
  options: WorkspaceNotesOptions = {},
): void {
  if (registrationCount++) return;

  displacedCommentSerializer = Blockly.registry.getObject(
    Blockly.registry.Type.SERIALIZER,
    COMMENT_SERIALIZER_NAME,
    false,
  );

  // `register` throws on a duplicate name, so the built-in must go first.
  Blockly.serialization.registry.unregister(COMMENT_SERIALIZER_NAME);
  Blockly.serialization.registry.register(
    COMMENT_SERIALIZER_NAME,
    new LegacyCommentAdapter(options),
  );
  Blockly.serialization.registry.register(
    NOTE_SERIALIZER_NAME,
    new NoteSerializer(),
  );
}

/**
 * Restores Blockly's built-in comment serializer.
 */
export function unregisterNoteSerializers(): void {
  if (--registrationCount > 0) return;
  registrationCount = 0;

  Blockly.serialization.registry.unregister(NOTE_SERIALIZER_NAME);
  Blockly.serialization.registry.unregister(COMMENT_SERIALIZER_NAME);
  Blockly.serialization.registry.register(
    COMMENT_SERIALIZER_NAME,
    displacedCommentSerializer ??
      new Blockly.serialization.workspaceComments.WorkspaceCommentSerializer(),
  );
  displacedCommentSerializer = null;
}
