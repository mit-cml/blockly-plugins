/**
 * @fileoverview The geometry a note's chrome is built from.
 *
 * Every number the note draws is named here, and every one says where it came
 * from: Blockly's renderer scale, so a note sits comfortably beside the blocks
 * it annotates; `TITLE_LINE_HEIGHT`, the single unit the note's own layout is
 * measured in; or core's own stylesheet, where the point is to match it. A
 * handful - the fades and the stroke weights - are simply chosen, and say so.
 * The rule is that the number is named and sourced, not that it is derived;
 * inventing a derivation for a value that has none only hides it better.
 *
 * The scope is the note's SVG chrome. `ui/colour_swatches.ts` draws HTML
 * inside Blockly's context menu and follows core's menu scale instead, which
 * is a different set of numbers - 4, 6, 15, 28 - and is deliberately not
 * gathered here.
 */

/**
 * Blockly's renderer padding scale, from `renderers/common/constants.ts`.
 * Note chrome is measured in these rather than in ad-hoc numbers.
 */
export const SMALL_PADDING = 3;

/** The middle step of Blockly's padding scale. */
export const MEDIUM_PADDING = 5;

/** The step between medium and large. */
export const MEDIUM_LARGE_PADDING = 8;

/** The largest step of Blockly's padding scale. */
export const LARGE_PADDING = 10;

/**
 * Height reserved for one line of title text.
 *
 * Core's `FIELD_BORDER_RECT_HEIGHT`: the box a single line of field text is
 * laid out in, and the closest thing Blockly has to a line box. Not its icon
 * size, which is 17.
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
 * The box a title bar marker is drawn in.
 *
 * One line box, so a marked title row is exactly as tall as an unmarked one
 * and the row never needs remeasuring. The glyphs are authored on a 24-unit
 * grid and scaled to fit, which also thins their 2-unit stroke to about 1.3px
 * - about right for a mark that should read as punctuation beside the heading
 * rather than as a control.
 */
export const MARKER_ICON_SIZE = TITLE_LINE_HEIGHT;

/** The gap between a marker and the title it leads. */
export const MARKER_ICON_GAP = MEDIUM_PADDING;

/** Where a glyph's ink sits inside the grid it is authored on. */
export interface GlyphInk {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The grid every glyph in this plugin is authored on.
 *
 * Tabler draws on 24 units, but none of the glyphs fills that box - the pin
 * takes x 7-17, the lock x 5-19 - so a fifth to a third of each one is
 * padding. Laying a marker out by that box would set it in from the note's
 * margin by the padding and leave a gap to the title wider than was asked for,
 * which is exactly the sort of uneven spacing the rest of this layout is built
 * to avoid. So the ink box is what gets positioned, and the two below are its
 * numbers.
 */
export const GLYPH_GRID = 24;

/** The pin glyph's ink, in grid units. */
export const PIN_GLYPH_INK: GlyphInk = {x: 7, y: 4, width: 10, height: 17};

/** The lock glyph's ink, in grid units. */
export const LOCK_GLYPH_INK: GlyphInk = {x: 5, y: 3, width: 14, height: 18};

/**
 * The margin on every side of a note, and the single number the rest of the
 * layout is built from.
 *
 * A full line of text on every side reads as generous on a sheet of paper, but
 * a note is not one any more - it is a titled card with a bar of controls, and
 * at that scale the same margin leaves the bar looking inflated and the body
 * indented. So it comes back to the top of Blockly's own chrome scale, which
 * is what the bar's contents are sized against anyway.
 */
export const NOTE_MARGIN = LARGE_PADDING;

/**
 * Height of a note's title row: one line of text with a margin above and
 * below. Core measures this rect and derives the writing area's offset from
 * it, so it is what puts the body where it is.
 */
export const TOPBAR_HEIGHT = TITLE_LINE_HEIGHT + NOTE_MARGIN * 2;

/**
 * The box each of core's bar buttons is drawn in.
 *
 * One line box, the same as the title beside it, so the glyphs and the heading
 * share a cap height and the row reads as one line rather than as icons with
 * text between them. Smaller than core's 20px, which was sized for a bar
 * carrying nothing but icons.
 */
export const BAR_ICON_SIZE = TITLE_LINE_HEIGHT;

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
 * How much of each end of the title row a button takes, gap included.
 *
 * One number for both ends, because the buttons are inset equally once the
 * correction below is applied. The pin marker starts here when there is one,
 * and the title follows it.
 */
export const BAR_INSET = BAR_ICON_MARGIN + BAR_ICON_SIZE + BAR_ICON_GAP;

/**
 * The inset at an end of the title row that carries no button.
 *
 * A locked note has no delete button, so the far end of its bar holds nothing
 * but the note's own margin. Reserving a whole `BAR_INSET` there would leave
 * the title stopping short of a gap with nothing in it.
 */
export const BAR_EMPTY_INSET = NOTE_MARGIN;

/**
 * How far the delete button moves to line up with the collapse button.
 *
 * Core positions it at the bar's width minus the button's size *including both
 * its margins*, while the collapse button gets a single margin from the
 * leading edge. So the two sit at different insets - one margin further in on
 * the right than on the left - which is plain to see once you look for it.
 * Shifting it out by that extra margin makes the row symmetric.
 */
export const BAR_DELETE_NUDGE = BAR_ICON_MARGIN;

/**
 * Width of the body's scrollbar, for engines styled through
 * ::-webkit-scrollbar.
 *
 * A step on Blockly's own scale, and the narrowest one that still leaves the
 * thumb something to sit in - narrow enough to read as a mark on the paper
 * rather than as a control.
 */
export const SCROLLBAR_WIDTH = MEDIUM_LARGE_PADDING;

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
 * The strip along the foot of a note carrying its author and date.
 *
 * One line box again, so the note has the same rhythm top and bottom. The body
 * gives up this much height for it - see the padding in `ui/css.ts` - which is
 * why it is reserved as a constant rather than drawn wherever it lands.
 */
export const FOOTER_HEIGHT = TITLE_LINE_HEIGHT;

/**
 * The glyphs in the footer, smaller than the bar's since the text is too.
 *
 * Three quarters of the bar's, which is the ratio the footer type takes
 * against the body type - so the two rows shrink by the same step.
 */
export const FOOTER_ICON_SIZE = TITLE_LINE_HEIGHT * 0.75;

/**
 * Footer type size, in px: small enough to read as a caption, not as content.
 *
 * The same three-quarter step as the glyphs, against a body that inherits
 * core's field text - but written out rather than derived, because that step
 * is not exact here. Core's size is 11 *pt*, which is 14.667px, and three
 * quarters of it is 11.00025. Writing the multiplication would put
 * `font-size: 11.00025px` in the stylesheet.
 *
 * Worth knowing that core's `FIELD_TEXT_FONTSIZE` is also written `11`. The
 * two look like the same number and are not: this one is px, that one is pt,
 * and the footer is three quarters of the body rather than the same size.
 */
export const FOOTER_FONT_SIZE = 11;

/** Between a footer glyph and the text it labels. */
export const FOOTER_LABEL_GAP = SMALL_PADDING;

/**
 * The shortest an author's name is worth showing.
 *
 * Truncation is what gives the date room on a narrow note, but a name cut to
 * one or two letters conveys nothing while still spending a glyph and a gap on
 * saying so. Below this the author steps aside entirely.
 */
export const MIN_FOOTER_AUTHOR_CHARS = 3;

/** Between the author and the date. */
export const FOOTER_ITEM_GAP = LARGE_PADDING;

/**
 * The box core draws the resize handle in.
 *
 * Core's own number, from its comment stylesheet, repeated here so the footer
 * knows how much room to leave it. It equals `FOOTER_ICON_SIZE` today, which
 * is a coincidence and not a reason to share one constant - the footer's
 * glyphs could change size without moving core's handle.
 */
export const RESIZE_HANDLE_SIZE = 12;

/**
 * How much of the footer's trailing end the resize handle claims.
 *
 * The stylesheet pulls the handle a body inset in from the corner, which puts
 * it squarely in the footer's row. The footer stops short of it rather than
 * running underneath.
 */
export const FOOTER_HANDLE_CLEARANCE = RESIZE_HANDLE_SIZE + LARGE_PADDING;

/**
 * The smallest a note can be resized to.
 *
 * Core enforces a floor of its own and the larger of the two always wins, so
 * this is not the whole story - but it is the half that bites when core's is
 * too low. Core's width is the truncated body preview plus whichever bar
 * buttons are showing, which on a note with no text yet comes to just the two
 * buttons; its height is the bar plus 20px, which leaves less than one line of
 * writing under the title. Either would let the resize handle drag a note down
 * to something with no surface to grab and no title to read - still there,
 * still saved, and findable only by undo.
 *
 * So a note states its own in the terms the rest of the layout is built from:
 * never shorter than its title bar plus one line of body and the margin under
 * it, and never narrower than a title of a few characters between its two
 * margins. Measured, that means this floor governs an empty note while core's
 * takes over once there is enough body text to push past it.
 */
export const MIN_SIZE = {
  width: NOTE_MARGIN * 2 + TITLE_LINE_HEIGHT * 4,
  height: TOPBAR_HEIGHT + TITLE_LINE_HEIGHT + NOTE_MARGIN,
};

/**
 * The card's border, and the heavier one a pinned note gets.
 *
 * One pixel is Blockly's weight for a background edge - core uses it on the
 * workspace and the mutator - and doubling it is the whole of the pinned
 * note's second signal, beside the marker in its bar.
 */
export const CARD_BORDER_WIDTH = 1;

/** See `CARD_BORDER_WIDTH`. */
export const PINNED_CARD_BORDER_WIDTH = CARD_BORDER_WIDTH * 2;

/**
 * The stroke every glyph is authored at, on the 24-unit grid.
 *
 * Tabler's own weight. It is scaled down with the artwork, so a bar marker
 * lands at about 1.3px and a footer glyph at exactly 1 - which is why the two
 * rows read as the same family at two sizes rather than as two weights.
 */
export const GLYPH_STROKE_WIDTH = 2;

/**
 * The fade on a placeholder: the untitled heading, and the empty body's
 * prompt.
 *
 * Chosen, not derived. Far enough back to read as "nothing here yet" against
 * the note's own ink, and no further, since it still has to be legible on the
 * palest paper in the palette.
 */
export const PLACEHOLDER_OPACITY = 0.55;

/**
 * The fade on the footer, which is a caption rather than content.
 *
 * Matches core's own `.blocklyIconGroup` fade as of v13. It matches rather
 * than derives from it - core could move without this following.
 */
export const FOOTER_OPACITY = 0.6;

/** The focus ring drawn on the bar's buttons, which core styles none for. */
export const OUTLINE_WIDTH = 2;

/** See `OUTLINE_WIDTH`. */
export const OUTLINE_OFFSET = 1;

/** See `OUTLINE_WIDTH`. Core's radius for a small piece of chrome. */
export const OUTLINE_RADIUS = 2;

/**
 * The selection ring's weight.
 *
 * Core's, from `.blocklySelected .blocklyCommentHighlight`. A selected note
 * should look selected the same way everything else on the workspace does, so
 * this tracks core deliberately - as does the colour, which is left to core's
 * own `#fc3` rather than named here.
 */
export const SELECTION_STROKE_WIDTH = 3;
