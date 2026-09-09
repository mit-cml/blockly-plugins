/**
 * @fileoverview The class names a note's chrome is marked with, and the one
 * piece of text the chrome renders on its own.
 *
 * The classes are the contract between `model/note.ts`, which adds them, and
 * `ui/css.ts`, which styles them. Neither should spell one out inline.
 */

/** CSS class added to the root SVG group of every note. */
export const NOTE_CLASS = 'blocklyNote';

/** CSS class added to a note that has a non-empty title. */
export const TITLED_CLASS = 'blocklyNoteTitled';

/** CSS class added to a pinned note. */
export const PINNED_CLASS = 'blocklyNotePinned';

/** CSS class of the group holding the marker drawn on a pinned note. */
export const PIN_CLASS = 'blocklyNotePin';

/** CSS class of the SVG text element that renders a note's title. */
export const TITLE_CLASS = 'blocklyNoteTitle';

/**
 * Shown in the title row of a note that has not been named yet.
 *
 * A note always has a title row, so an unnamed one is labelled rather than
 * left blank: the placeholder is what says the row can be clicked.
 */
export const UNTITLED_TITLE_TEXT = 'Title';
