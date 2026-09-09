/**
 * @fileoverview The geometry a note's chrome is built from.
 *
 * Every number here is derived from one of two sources: Blockly's own renderer
 * scale, so a note sits comfortably beside the blocks it annotates, or
 * `TITLE_LINE_HEIGHT`, which is the single unit the note's own layout is
 * measured in. Nothing in the chrome should introduce an ad-hoc number.
 */

/**
 * Blockly's renderer padding scale, from `renderers/common/constants.ts`.
 * Note chrome is measured in these rather than in ad-hoc numbers.
 */
export const SMALL_PADDING = 3;

/** The middle step of Blockly's padding scale. */
export const MEDIUM_PADDING = 5;

/** The largest step of Blockly's padding scale. */
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
 * The box the pin marker is drawn in.
 *
 * One line box, so a pinned title row is exactly as tall as an unpinned one and
 * the row never needs remeasuring. The glyph itself is authored on a 24-unit
 * grid and scaled to fit, which also thins its 2-unit stroke to about 1.3px -
 * about right for a mark that should read as punctuation beside the heading
 * rather than as a control.
 */
export const PIN_ICON_SIZE = TITLE_LINE_HEIGHT;

/** The gap between the pin marker and the title it leads. */
export const PIN_ICON_GAP = MEDIUM_PADDING;

/**
 * The grid the pin glyph is authored on, and where its ink actually sits
 * within it.
 *
 * Tabler draws on 24 units but the pin only occupies x 7-17 and y 4-21, so
 * roughly a third of the box is padding. Laying the marker out by that box
 * would set it in from the note's margin by the padding and leave a gap to the
 * title a third wider than asked for - which is exactly the sort of uneven
 * spacing the rest of this layout is built to avoid. So the ink box is what
 * gets positioned, and these are its numbers.
 */
export const PIN_GLYPH_GRID = 24;

/** The pin glyph's ink, in grid units. */
export const PIN_GLYPH_INK = {x: 7, y: 4, width: 10, height: 17};

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

/**
 * The box each of core's bar buttons is drawn in. Core's own default, kept.
 */
export const BAR_ICON_SIZE = 20;

/** The gap between a bar button and whatever it sits next to. */
export const BAR_ICON_GAP = MEDIUM_PADDING;

/**
 * The inset core leaves around a bar button.
 *
 * Not ours to choose: `CommentBarButton.getMargin()` computes exactly this,
 * half the difference between the bar's height and the icon's, and both
 * buttons are positioned with it. Repeating the arithmetic here is what lets
 * the title know where they are without measuring them every time it redraws.
 */
export const BAR_ICON_MARGIN = (TOPBAR_HEIGHT - BAR_ICON_SIZE) / 2;

/**
 * Where the title row's contents begin, past the collapse button.
 *
 * Core puts that button at `BAR_ICON_MARGIN` from the leading edge, so this is
 * its far side plus a gap. The pin marker starts here when there is one, and
 * the title follows it.
 */
export const BAR_LEADING_INSET = BAR_ICON_MARGIN + BAR_ICON_SIZE + BAR_ICON_GAP;

/**
 * How much room the delete button needs at the trailing edge.
 *
 * Core sets its x to the bar's width minus the button's size *including both
 * margins*, so the icon's near edge is one full margin further in than the
 * collapse button's - hence the doubled margin here rather than a single one.
 * This is what the title's truncation has to stop short of.
 */
export const BAR_TRAILING_INSET =
  BAR_ICON_MARGIN * 2 + BAR_ICON_SIZE + BAR_ICON_GAP;

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
