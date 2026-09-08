/**
 * @fileoverview Shared constants for the workspace notes plugin.
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
 * Current version of the `workspaceNotes` payload. Bump this whenever the
 * shape changes, and add a matching entry to MIGRATIONS in serializer.js.
 */
export const SCHEMA_VERSION = 1;

/**
 * The type string of the custom event used to make note-specific properties
 * undoable. Namespaced to avoid colliding with other plugins in the global
 * event registry.
 */
export const NOTE_CHANGE_EVENT_TYPE = 'workspace_note_change';

/**
 * A note is paper: a light colour carrying dark text.
 *
 * That is the real difference from a block. Blockly's block language is a
 * saturated fill with a white label — S 0.45 at V 0.65 via `hueToHex` — and
 * anything built that way reads as a block whatever hue it uses. Notes invert
 * it: a pale wash at V 0.98, with the text in black.
 *
 * It is also what Blockly's own comments do. Their default is `#FFFCC7`, a
 * pale yellow, and nothing about a comment borrows the block palette.
 */
export const NOTE_SATURATION = 0.25;

/** @type {number} */
export const NOTE_VALUE = 0.98;

/** Hue of the default note: the yellow a sticky note is expected to be. */
export const DEFAULT_HUE = 48;

/** The default note colour. */
export const DEFAULT_COLOUR = '#f9edbb';

/**
 * The swatches offered in the "Colour" context menu, in display order.
 *
 * Stationery colours rather than block colours. Each is stored as the hex the
 * palette's saturation and value produce, since that is what a note
 * serializes.
 */
export const DEFAULT_PALETTE = [
  {name: 'Yellow', hue: DEFAULT_HUE, fill: DEFAULT_COLOUR},
  {name: 'Peach', hue: 28, fill: '#f9d8bb'},
  {name: 'Pink', hue: 350, fill: '#f9bbc5'},
  {name: 'Lilac', hue: 275, fill: '#dfbbf9'},
  {name: 'Sky', hue: 200, fill: '#bbe5f9'},
  {name: 'Mint', hue: 150, fill: '#bbf9da'},
  {name: 'Grey', hue: 0, fill: '#f2f2f2'},
];

/** CSS class added to the root SVG group of every note. */
export const NOTE_CLASS = 'blocklyNote';

/** CSS class added to a note that has a non-empty title. */
export const TITLED_CLASS = 'blocklyNoteTitled';

/** CSS class added to a pinned note. */
export const PINNED_CLASS = 'blocklyNotePinned';

/** CSS class of the SVG text element that renders a note's title. */
export const TITLE_CLASS = 'blocklyNoteTitle';

/** CSS class of the hairline drawn under a note's title. */
export const RULE_CLASS = 'blocklyNoteRule';

/**
 * Shown in the title row of a note that has not been named yet.
 *
 * A note always has a title row, so an unnamed one is labelled rather than
 * left blank: the placeholder is what says the row can be clicked.
 */
export const UNTITLED_TITLE_TEXT = 'Title';

/**
 * Blockly's renderer padding scale, from `renderers/common/constants.ts`.
 * Note chrome is measured in these rather than in ad-hoc numbers.
 */
export const SMALL_PADDING = 3;

/** @type {number} */
export const MEDIUM_PADDING = 5;

/** @type {number} */
export const LARGE_PADDING = 10;

/**
 * Height reserved for one line of title text. Blockly's own icon size, which
 * is the box a single line of field text is laid out in.
 */
export const TITLE_LINE_HEIGHT = 16;

/**
 * Type size of the title, in px.
 *
 * A heading has to be bigger than the text it heads or it is just bold body
 * text. Core's field text is 11pt (14.67px) and the body inherits it, so the
 * title takes the next size up and lands exactly on `TITLE_LINE_HEIGHT` - the
 * line box the layout already reserves for it, which is why the row needs no
 * remeasuring to fit it.
 */
export const TITLE_FONT_SIZE = TITLE_LINE_HEIGHT;

/**
 * The margin on every side of a note, and the single number the rest of the
 * layout is built from.
 *
 * This one deliberately steps outside Blockly's chrome scale, which tops out
 * at `LARGE_PADDING` 10. Block chrome is packed tight because a block is an
 * operator with as much crammed onto it as will fit; paper is the opposite,
 * and margins are most of what makes a page read as one. It is set to
 * `TITLE_LINE_HEIGHT` so the margin is exactly one line of text on every
 * side - the oldest rule in page layout, and the reason the note reads as
 * even rather than as merely roomy.
 */
export const NOTE_MARGIN = TITLE_LINE_HEIGHT;

/**
 * Height of a note's title row: one line of text with a margin above and
 * below. Core measures this rect and derives the writing area's offset from
 * it, so it is what puts the body where it is.
 */
export const TOPBAR_HEIGHT = TITLE_LINE_HEIGHT + NOTE_MARGIN * 2;

/** Corner radius of a note's card; Blockly's own CORNER_RADIUS. */
export const FRAME_RADIUS = 8;

/**
 * Width of the body's scrollbar, for engines styled through
 * ::-webkit-scrollbar. Half of `SMALL_PADDING` either side of a 2px thumb -
 * narrow enough to read as a mark on the paper rather than as a control.
 */
export const SCROLLBAR_WIDTH = 8;

/** Space between a note's edge and its writing area. */
export const BODY_INSET = NOTE_MARGIN;

/**
 * Where the hairline under the title sits, measured from the note's top.
 *
 * Exactly midway between the bottom of the title's line box and the top of
 * the body, so it has equal air above and below and does not read as
 * belonging to either one.
 *
 * It separates the heading from the body the way the rule on an index card
 * does. A box around the body would not: a lighter bordered panel inset in a
 * coloured body is exactly how Blockly draws a field on a block, so anything
 * built that way reads as a block however the note itself is shaped.
 */
const TITLE_BOTTOM = (TOPBAR_HEIGHT + TITLE_LINE_HEIGHT) / 2;
export const TITLE_RULE_Y = (TITLE_BOTTOM + TOPBAR_HEIGHT) / 2;

/**
 * The size a note is created at when the host sets no `defaultSize`.
 *
 * Blockly's own comment default is 120x100, which was chosen for a comment
 * whose whole chrome is a 24px bar. A note's margins leave that barely two
 * lines of text, so notes carry their own default.
 */
export const DEFAULT_SIZE = {width: 260, height: 180};

/**
 * The smallest a note can be resized to.
 *
 * Core has a floor of its own, but it is not one a note can use. The width it
 * enforces is the width of the truncated preview text - which a note hides,
 * since the title stands in for it - so on a note with no body text the floor
 * is zero, and the resize handle drags the paper away to nothing. What is left
 * has no surface to grab and no title to read: the note is still there, still
 * saved, and only undo brings it back. The height it enforces is the top bar
 * plus 20px, which was measured for core's 24px bar and leaves a note less
 * than one line of writing under its own title row.
 *
 * So a note sets its own, and states it in the terms the rest of the layout
 * is built from: a note is never smaller than its title row plus one line of
 * body and the margin under it, and never narrower than a title of a few
 * characters between its two margins. Anything smaller is not a small note,
 * it is a lost one.
 */
export const MIN_SIZE = {
  width: NOTE_MARGIN * 2 + TITLE_LINE_HEIGHT * 4,
  height: TOPBAR_HEIGHT + TITLE_LINE_HEIGHT + NOTE_MARGIN,
};

/**
 * How far a note's edge sits below its own colour: the same hue, a step down
 * in value. Used for the card's hairline and the writing area's border.
 */
export const EDGE_VALUE_SCALE = 0.88;
