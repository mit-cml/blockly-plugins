/**
 * @fileoverview Styles for workspace notes.
 *
 * Registered at module load: Blockly.Css.register only takes effect for
 * injections that happen afterwards, so importing this plugin before calling
 * Blockly.inject is required.
 *
 * A note is a plain rounded card. Almost everything here is a small
 * adjustment to elements core already builds and already sizes - the card is
 * core's own highlight rect, and the writing area is core's own textarea - so
 * that resizing, collapsing and selection keep working without help.
 *
 * Colours come from the --commentFillColour / --commentBorderColour custom
 * properties core's comment stylesheet reads, plus one of ours for the
 * writing area's fill.
 *
 * NOTE: this stylesheet is a JavaScript template literal. A backtick anywhere
 * inside it, including in a comment quoting a selector, silently ends the
 * literal. npm run build will not catch that, because it is a runtime error
 * rather than a syntax one; npm test will.
 */

import * as Blockly from 'blockly/core';

import {
  NOTE_CLASS,
  PIN_CLASS,
  PINNED_CLASS,
  TITLED_CLASS,
  TITLE_CLASS,
} from '../constants/dom';
import {
  BAR_ICON_MARGIN,
  BAR_ICON_SIZE,
  BODY_INSET,
  SCROLLBAR_WIDTH,
  TITLE_FONT_SIZE,
  TOPBAR_HEIGHT,
} from '../constants/layout';

Blockly.Css.register(`
/*
 * The sheet of paper. This is core's own highlight rect, which it resizes on
 * every pointer move of a drag and strokes when the note is selected; the
 * rounded corners are set as attributes by the note itself.
 */
.${NOTE_CLASS} .blocklyCommentHighlight {
  fill: var(--commentFillColour);
  stroke: var(--commentBorderColour);
  stroke-width: 1px;
}

/*
 * A pinned note is locked in place, and says so twice: a marker at the head of
 * the title row, and a heavier edge.
 *
 * Two quiet signals rather than one loud one. The edge is what carries at a
 * glance across a busy workspace, and it is still legible when a long title has
 * pushed the marker to the very corner of the note.
 */
.${NOTE_CLASS}.${PINNED_CLASS} .blocklyCommentHighlight {
  stroke-width: 2px;
}

/*
 * The marker itself: Tabler's pin, stroked rather than filled so it sits at the
 * weight of the heading it leads rather than as a solid blot on the paper.
 *
 * display:none rather than visibility, matching how core hides its own bar
 * buttons - CommentBarButton.canBeFocused() defers to checkVisibility(), so a
 * display:none element is skipped by keyboard navigation rather than trapped
 * on. It is decoration either way, and aria-hidden in the markup.
 *
 * pointer-events:none because the title row is the note's drag handle. A note
 * has to stay draggable by the part of the row the marker occupies.
 */
.${NOTE_CLASS} .${PIN_CLASS} {
  display: none;
  fill: none;
  stroke: var(--noteInkColour);
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}

.${NOTE_CLASS}.${PINNED_CLASS} .${PIN_CLASS} {
  display: block;
}

/*
 * The title bar, in the same shade as the border.
 *
 * Core already paints this rect from --commentBorderColour and a note simply
 * lets it, so the two-tone note is Blockly's own model rather than anything
 * built on top of it. Only the height is ours: core's 24px bar is sized for a
 * strip of icons, and a note needs a line of title between two margins. Core
 * measures this rect's rendered height and derives the writing area's offset
 * from it, so the number has to be set here rather than drawn around.
 */
.${NOTE_CLASS} .blocklyCommentTopbarBackground {
  height: ${TOPBAR_HEIGHT}px;
}

/*
 * Core's two bar buttons, collapse and delete.
 *
 * Core ships the delete button display:none, so showing it is the whole of
 * that. Both keep everything core gives them - position, focus, ARIA, the
 * collapse button's relabelling between "Collapse Comment" and "Expand
 * Comment" - because they are still core's buttons; only their artwork is
 * swapped, in renderColour, for a copy drawn in this note's ink.
 *
 * The size is core's own 20px. Its transform-origin is not: core hardcodes
 * 12px 12px so the collapsed rule can rotate the chevron about its middle.
 * That number is in user space, not relative to the icon's own box - it works
 * for core because core's 24px bar leaves a margin of 2, putting a 20px icon's
 * centre at 12. A 48px bar leaves a margin of 14, so the centre is 24, and
 * using core's number would swing the chevron off the note entirely.
 */
.${NOTE_CLASS} .blocklyFoldoutIcon,
.${NOTE_CLASS} .blocklyDeleteIcon {
  display: block;
  width: ${BAR_ICON_SIZE}px;
  height: ${BAR_ICON_SIZE}px;
}

.${NOTE_CLASS} .blocklyFoldoutIcon {
  transform-origin: ${BAR_ICON_MARGIN + BAR_ICON_SIZE / 2}px
    ${BAR_ICON_MARGIN + BAR_ICON_SIZE / 2}px;
}

/*
 * Core styles no focus ring for these, so a keyboard user would otherwise get
 * the browser's default outline on a bare <image>. The note's own edge colour
 * keeps it in the same family as everything else on the card.
 */
.${NOTE_CLASS} .blocklyFoldoutIcon:focus-visible,
.${NOTE_CLASS} .blocklyDeleteIcon:focus-visible {
  outline: 2px solid var(--noteInkColour);
  outline-offset: 1px;
  border-radius: 2px;
}

/*
 * You write on the paper, not in a box on it.
 *
 * Core gives its textarea a fill and a 1px border, which is what makes a
 * comment read as a panel - and a lighter bordered panel inset in a coloured
 * body is precisely how Blockly draws a field on a block. Both come off here,
 * so the note stays one flat colour and only the rule under the title divides
 * it. Core's own 5px padding goes too, so the body's first character lines up
 * with the first letter of the title rather than sitting 5px right of it.
 */
.${NOTE_CLASS} .blocklyMinimalBody {
  box-sizing: border-box;
  padding: 0 ${BODY_INSET}px ${BODY_INSET}px;
}

/*
 * The writing area itself: core's fill, border and padding off, and the
 * scrollbar quietened.
 *
 * Core's textarea scrolls with the platform's own bar, and on a system set to
 * show scrollbars always - rather than as an overlay that fades - that is a
 * full-width white track down the side of the sheet: the one piece of
 * furniture on a note that otherwise carries nothing but the words on it.
 *
 * So it is made quiet rather than removed. Removing it outright would take the
 * only sign that there is more text below, on the one element of a note that
 * can have more to show than fits. Instead the gutter is narrowed and always
 * reserved - the text keeps its width whether the bar is painted or not, so
 * nothing reflows - and the paint is what changes: nothing at rest, and while
 * the pointer is on the note or the caret is in it, a thumb in the paper's own
 * edge colour, the same hairline that draws the card and the rule.
 */
.${NOTE_CLASS} .blocklyTextarea {
  background-color: transparent;
  color: var(--noteInkColour);
  border: none;
  padding: 0;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.${NOTE_CLASS}:hover .blocklyTextarea,
.${NOTE_CLASS} .blocklyTextarea:focus {
  scrollbar-color: var(--commentBorderColour) transparent;
}

/*
 * The same for engines without scrollbar-color (Safari, and Chrome before
 * 121). Chrome 121+ ignores these once the standard properties above are set
 * to anything but auto, so the two cannot both apply and disagree.
 */
.${NOTE_CLASS} .blocklyTextarea::-webkit-scrollbar {
  width: ${SCROLLBAR_WIDTH}px;
}

.${NOTE_CLASS} .blocklyTextarea::-webkit-scrollbar-track {
  background: transparent;
}

.${NOTE_CLASS} .blocklyTextarea::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: ${SCROLLBAR_WIDTH / 2}px;
}

.${NOTE_CLASS}:hover .blocklyTextarea::-webkit-scrollbar-thumb,
.${NOTE_CLASS} .blocklyTextarea:focus::-webkit-scrollbar-thumb {
  background: var(--commentBorderColour);
}

/*
 * Where there is no pointer there is no hover, and a rule that only paints on
 * hover would leave a touch device with a permanently invisible scrollbar -
 * including while a finger is actually dragging the text. So on those the
 * thumb is simply always painted; it is thin and in the paper's own colour,
 * which was the point.
 */
@media (hover: none) {
  .${NOTE_CLASS} .blocklyTextarea {
    scrollbar-color: var(--commentBorderColour) transparent;
  }

  .${NOTE_CLASS} .blocklyTextarea::-webkit-scrollbar-thumb {
    background: var(--commentBorderColour);
  }
}

/* Bring the resize handle inside the sheet instead of over its corner. */
.${NOTE_CLASS} .blocklyResizeHandle {
  transform: translate(-${BODY_INSET}px, -${BODY_INSET}px);
}

.blocklyRTL .${NOTE_CLASS} .blocklyResizeHandle {
  transform: scale(-1, 1) translate(-${BODY_INSET}px, -${BODY_INSET}px);
}

/*
 * Title. A heading on the paper, so it takes the weight of one, and a click
 * opens its editor the way a click on a field does.
 *
 * The type is set below rather than here: the renderer writes the font
 * SHORTHAND, which resets weight and size, so a rule at this specificity
 * would lose both.
 */
.${TITLE_CLASS} {
  dominant-baseline: middle;
  user-select: none;
  cursor: text;
}

.blocklyReadonly.blocklyComment .${TITLE_CLASS} {
  cursor: inherit;
}

/*
 * The selectors below are deliberately over-specific. The renderer generates
 * a .blocklyText rule with fill #fff at three classes
 * (.thrasos-renderer.classic-theme .blocklyText), so a single-class rule
 * loses to it and the title comes out white on pale paper; four here means
 * the outcome does not depend on which stylesheet was injected last.
 *
 * The type has to be set here for the same reason, and it is the sharper of
 * the two traps: alongside that fill rule the renderer writes
 *
 *   .thrasos-renderer.classic-theme .blocklyText {
 *     font: normal 11pt sans-serif;
 *   }
 *
 * and font is a SHORTHAND, so it resets font-weight and font-size to the
 * theme's field values every time. A plain .blocklyNoteTitle { font-weight:
 * bold } is therefore not merely outranked, it is overwritten - which is why
 * the title rendered at body weight and body size, indistinguishable from the
 * text it heads.
 */
.${NOTE_CLASS}.blocklyComment .${TITLE_CLASS}.blocklyText {
  fill: var(--noteInkColour);
  font-size: ${TITLE_FONT_SIZE}px;
  font-weight: bold;
}

/*
 * An unnamed note shows a placeholder rather than an empty row, greyed so it
 * reads as a prompt and not as a title someone typed.
 */
.${NOTE_CLASS}.blocklyComment:not(.${TITLED_CLASS})
  .${TITLE_CLASS}.blocklyText {
  fill: var(--noteInkColour);
  opacity: 0.55;
}

.blocklyRTL .${TITLE_CLASS} {
  /* Revert the top bar's mirroring, matching core's .blocklyCommentPreview. */
  transform: scale(-1, 1);
  direction: rtl;
}

/*
 * Core's truncated body preview never shows: the title stands in for it, both
 * on an expanded note and on a collapsed one. The second selector is needed
 * because core reveals the preview once a comment collapses, with
 * .blocklyCollapsed.blocklyComment .blocklyCommentPreview, which outranks a
 * two-class rule.
 */
.${NOTE_CLASS} .blocklyCommentPreview,
.${NOTE_CLASS}.blocklyComment.blocklyCollapsed .blocklyCommentPreview {
  visibility: hidden;
}

/*
 * The title's editor, which is meant to be invisible.
 *
 * .blocklyHtmlInput is Blockly's field editor, and a field editor is supposed
 * to announce itself - it sits centred in a white box over the block. On a
 * note that reads as a mode: a panel opens on the paper. Everything that draws
 * the box comes off, so clicking the title just puts a caret in it and the
 * text carries on looking like the heading it already was.
 *
 * The background is the browser's own input default rather than anything
 * Blockly sets, which is why it has to be cleared explicitly.
 *
 * The type is not here: the size is scaled by the workspace zoom, and the
 * weight has to beat a three-class renderer rule, so title_editor.ts sets
 * both inline where the scale is known.
 */
.blocklyNoteTitleInput {
  background: transparent;
  text-align: left;
  padding: 0;
}

/*
 * Only the fade is set here. The colour itself is applied inline by
 * title_editor.ts, because the editor lives in Blockly's WidgetDiv - a
 * sibling of the workspace, not a descendant of the note - so the note's own
 * --noteInkColour never reaches it.
 */
.blocklyNoteTitleInput::placeholder {
  opacity: 0.55;
}

.blocklyRTL .blocklyNoteTitleInput {
  text-align: right;
}

/* The title is hidden while its editor is open, as a field's label is. */
.blocklyEditing .${TITLE_CLASS} {
  visibility: hidden;
}

/*
 * Selection, last in this sheet and over-specific on purpose.
 *
 * Core's ring is .blocklySelected .blocklyCommentHighlight - two classes,
 * exactly what the card rule above is - and this stylesheet is registered
 * after core's, so without a third class the card's own hairline would
 * quietly win and a selected note would show no ring at all.
 *
 * The collapsed selectors undo core's own pair, which drops the ring from the
 * highlight rect and moves it onto the top bar. That is right for a comment
 * whose bar is its whole collapsed body; here the card is still the shape to
 * outline, and the bar has no fill to carry a stroke.
 */
.blocklySelected.${NOTE_CLASS} .blocklyCommentHighlight,
.blocklySelected.${NOTE_CLASS}.blocklyCollapsed .blocklyCommentHighlight {
  stroke: #fc3;
  stroke-width: 3px;
}

.blocklySelected.${NOTE_CLASS}.blocklyCollapsed
  .blocklyCommentTopbarBackground {
  stroke: none;
}
`);
