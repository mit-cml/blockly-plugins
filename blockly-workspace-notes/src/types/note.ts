/**
 * @fileoverview What a note carries beyond a workspace comment, and the
 * surface the mixin adds to expose it.
 *
 * `NoteState` is the centre of this file and of the plugin: it is the record
 * that is written to save files, restored by `migrate`, snapshotted onto undo
 * events and copied to the clipboard. It outlives any single release, so it is
 * named once here rather than re-derived wherever it is touched.
 */

/**
 * Who made a note and when.
 *
 * The timestamps are ISO 8601 strings rather than `Date` objects because they
 * are written to JSON and read back verbatim.
 */
export interface NoteMeta {
  author: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything a note carries beyond what a workspace comment already has.
 */
export interface NoteState {
  title: string;
  colour: string;
  pinned: boolean;
  zIndex: number;
  meta: NoteMeta;
}

/**
 * Which properties `applyNoteProperty` understands.
 *
 * `'*'` means "replace the whole state", which is how a paste and an undo
 * restore a note in one step.
 */
export type NoteProperty =
  'title' | 'colour' | 'pinned' | 'zIndex' | 'meta' | '*';

/**
 * The value that goes with each `NoteProperty`.
 *
 * This is what the `{*}` annotation stood in for: the switch in
 * `applyNoteProperty` writes into a string slot, a boolean slot, a number slot,
 * an object slot and a whole-state slot, and only the property name says which.
 */
export type NotePropertyValue =
  string | boolean | number | Partial<NoteMeta> | NoteState | null;

/**
 * Everything the note mixin adds to a workspace comment.
 *
 * Declared separately from the mixin because TypeScript cannot name an
 * anonymous class expression in a `.d.ts`. Without this interface, `declaration:
 * true` fails on `NoteComment` and `Note` with "has or is using private name".
 */
export interface NoteSurface {
  getNoteState(): NoteState;
  getTitle(): string;
  setTitle(title: string): void;
  getColour(): string;
  setColour(colour: string): void;
  isPinned(): boolean;
  setPinned(pinned: boolean): void;
  getZIndex(): number;
  setZIndex(zIndex: number): void;
  getMeta(): NoteMeta;
  restoreMeta(meta: Partial<NoteMeta>): void;
  touchMeta(): void;
  saveNoteState(): NoteState;
  applyNoteProperty(property: NoteProperty, value?: NotePropertyValue): void;
  renderTitle(): void;
  renderColour(): void;
  applyPinned(): void;
  applyZIndex(): void;
}
