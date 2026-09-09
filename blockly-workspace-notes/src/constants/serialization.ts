/**
 * @fileoverview The names this plugin claims in Blockly's registries, and the
 * version of the format it persists.
 *
 * These are grouped because they are the plugin's public identifiers: change
 * one and existing save files, or another plugin's registrations, are affected.
 * Everything else in `constants/` only affects how a note looks.
 */

/**
 * The name the note serializer registers under. This doubles as the top-level
 * key in the JSON produced by `Blockly.serialization.workspaces.save()`.
 */
export const NOTE_SERIALIZER_NAME = 'workspaceNotes';

/**
 * The name of Blockly's built-in workspace comment serializer, which we
 * replace so that notes are not saved twice.
 */
export const COMMENT_SERIALIZER_NAME = 'workspaceComments';

/**
 * Current version of the `workspaceNotes` payload.
 *
 * Bump this when an older file cannot simply be read by the current code — a
 * field renamed, retyped, moved or newly required — and add a matching entry
 * to MIGRATIONS in `serialization/migrations.ts`. A new optional field is not
 * such a change; see the note there.
 */
export const SCHEMA_VERSION = 1;

/**
 * The type string of the custom event used to make note-specific properties
 * undoable. Namespaced to avoid colliding with other plugins in the global
 * event registry.
 */
export const NOTE_CHANGE_EVENT_TYPE = 'workspace_note_change';
