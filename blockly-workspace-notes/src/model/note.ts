/**
 * @fileoverview A note on a rendered workspace: the chrome drawn over the
 * state `model/note_mixin.ts` defines.
 *
 * Everything here is SVG the note adds to, or takes away from, the comment
 * core already built — the card, the title, the rule under it, and the marker
 * that shows a note is pinned — plus the plumbing that keeps that chrome in
 * step with a comment core is resizing, collapsing and dragging underneath
 * it.
 */

import * as Blockly from 'blockly/core';

import {
  NOTE_CLASS,
  PIN_CLASS,
  PINNED_CLASS,
  RULE_CLASS,
  TITLED_CLASS,
  TITLE_CLASS,
  UNTITLED_TITLE_TEXT,
} from '../constants/dom';
import {
  FRAME_RADIUS,
  MIN_SIZE,
  NOTE_MARGIN,
  PIN_GLYPH_GRID,
  PIN_GLYPH_INK,
  PIN_ICON_GAP,
  PIN_ICON_SIZE,
  TITLE_RULE_Y,
  TOPBAR_HEIGHT,
} from '../constants/layout';
import type {NoteCopyData} from '../types/clipboard';
import {edgeFor} from '../utils/colour';
import {editTitle} from '../ui/title_editor';
import {RenderedNoteBase} from './note_mixin';
import {restackNotes} from './stacking';

/**
 * A note on a rendered workspace.
 */
export class Note extends RenderedNoteBase {
  /**
   * The paper card behind the note's chrome.
   *
   * Every field here is optional, and that is not defensiveness: they are
   * assigned after `super()` returns, and `super()` can call back into
   * `renderTitle()` and `renderColour()`, which read them. The guard in
   * `renderTitle` exists for exactly that window.
   */
  private card_?: SVGRectElement | null;

  /** The rule under the title. */
  private rule_?: SVGLineElement;

  /** Where a press on the title started, while one is in progress. */
  private titlePressPoint_?: {x: number; y: number} | null;

  /** The SVG text element holding the title. */
  private titleElement_?: SVGTextElement;

  /** The marker shown while the note is pinned. */
  private pin_?: SVGGElement;

  /** The text node inside `titleElement_`. */
  private titleNode_?: Text;

  /** Watches the comment's size so the chrome can follow it. */
  private sizeObserver_?: MutationObserver;

  /**
   * @param workspace The workspace to add the note to.
   * @param id An optional ID; generated when omitted.
   */
  constructor(workspace: Blockly.WorkspaceSvg, id?: string) {
    super(workspace, id);

    const root = this.getSvgRoot();
    Blockly.utils.dom.addClass(root, NOTE_CLASS);
    const topBar = root.querySelector('.blocklyCommentTopbar');

    /**
     * The card itself: core's own highlight rect, which a note fills rather
     * than drawing paper of its own. Core resizes it on every pointer move of
     * a drag and strokes it when the note is selected, so borrowing it keeps
     * both for free.
     *
     * The corners are set once. Core only ever writes height, width and x to
     * this rect, so the radii survive every resize.
     * @private
     */
    this.card_ = root.querySelector('.blocklyCommentHighlight');
    this.card_?.setAttribute('rx', `${FRAME_RADIUS}`);
    this.card_?.setAttribute('ry', `${FRAME_RADIUS}`);

    /**
     * The hairline under the title.
     *
     * The heading needs separating from the body, and a box around the body
     * is the one thing that cannot do it: a lighter bordered panel inset in a
     * coloured body is exactly how Blockly draws a field on a block, so a
     * note built that way reads as a block however it is shaped. A rule reads
     * as an index card instead.
     * @private
     */
    this.rule_ = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.LINE, {
      'class': RULE_CLASS,
    });
    if (this.card_) {
      root.insertBefore(this.rule_, this.card_.nextSibling);
    } else {
      root.appendChild(this.rule_);
    }

    /**
     * Where the pointer went down on the title, so a press that turns into a
     * drag can be told apart from a click.
     * @private
     */
    this.titlePressPoint_ = null;

    /**
     * The pin marker. Tabler's `pinned` glyph, authored on a 24-unit grid.
     *
     * It lives in the root group beside the rule, *not* in core's top bar.
     * Core mirrors that bar wholesale in RTL and each of its children has to
     * undo the mirror for itself; the root group is not mirrored, so the
     * marker flips its own coordinates the way `renderRule` does and the two
     * stay consistent.
     *
     * `aria-hidden` because it is decoration: it repeats what `setMovable`
     * already tells assistive technology, and a second announcement of the
     * same fact is noise. The stylesheet hides it entirely unless the note is
     * pinned, and keeps it out of the way of pointer events.
     * @private
     */
    this.pin_ = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.G, {
      'class': PIN_CLASS,
      'aria-hidden': 'true',
    });
    if (this.rule_) {
      root.insertBefore(this.pin_, this.rule_.nextSibling);
    } else {
      root.appendChild(this.pin_);
    }
    for (const d of [
      'M9 4v6l-2 4v2h10v-2l-2 -4v-6',
      'M12 16l0 5',
      'M8 4l8 0',
    ]) {
      Blockly.utils.dom.createSvgElement(
        Blockly.utils.Svg.PATH,
        {'d': d},
        this.pin_,
      );
    }

    /**
     * The SVG text element showing the title above the writing area.
     * @private
     */
    this.titleElement_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.TEXT,
      {'class': `${TITLE_CLASS} blocklyText`},
      topBar,
    );

    /**
     * The text node holding the (possibly truncated) title.
     * @private
     */
    this.titleNode_ = document.createTextNode('');
    this.titleElement_.appendChild(this.titleNode_);

    // A field on a block opens its editor on a single click, and the title
    // does the same. Gesture decides a field click by checking the press
    // never travelled further than the drag radius, so this repeats that test
    // rather than claiming every press: dragging a note by its title has to
    // keep working.
    //
    // Bound directly rather than through browserEvents.conditionalBind, which
    // gates on Blockly's own touch handling.
    this.titleElement_.addEventListener('pointerdown', (e) => {
      this.titlePressPoint_ = {x: e.clientX, y: e.clientY};
    });

    this.titleElement_.addEventListener('pointerup', (e) => {
      const press = this.titlePressPoint_;
      this.titlePressPoint_ = null;
      if (!press || !this.isEditable()) return;
      const travelled = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      if (travelled > Blockly.config.dragRadius) return;

      // Deferred by a task, and deliberately not stopped. Core's gesture ends
      // on this same release and focuses the note's root, so an editor opened
      // inline would have focus taken straight back off it; and Gesture binds
      // the release on the document, so stopping the event here would leave
      // that gesture running.
      setTimeout(() => editTitle(this), 0);
    });

    /**
     * Watches the view's own width and height attributes.
     *
     * Core resizes through `setSizeWithoutFiringEvents` on every pointer move
     * of a resize drag and only fires its size listeners once, on pointer up.
     * Laying the title out from those listeners alone would leave it
     * truncated to the old width for the whole drag, so track the attributes
     * core writes instead - they change on every move.
     * @private
     */
    this.sizeObserver_ = new MutationObserver(() => this.renderChrome());
    this.sizeObserver_.observe(root, {
      attributes: true,
      attributeFilter: ['width', 'height'],
    });
    this.view.addDisposeListener(() => this.sizeObserver_?.disconnect());

    this.view.addOnCollapseListener(() => this.renderChrome());

    this.renderColour();
    this.renderChrome();

    // Every size a note is ever given passes through here: core's resize drag
    // calls this on each pointer move, `setSize` calls it, and so does
    // collapsing (with the stored size, which is why clamping cannot disturb
    // it). Core's own floor is computed in a private method a plugin has no
    // business replacing, and it is the wrong floor anyway - see MIN_SIZE.
    const setViewSize = this.view.setSizeWithoutFiringEvents.bind(this.view);
    this.view.setSizeWithoutFiringEvents = (size: Blockly.utils.Size) => {
      setViewSize(
        Blockly.utils.Size.max(
          size,
          new Blockly.utils.Size(MIN_SIZE.width, MIN_SIZE.height),
        ),
      );
    };

    // Core sizes the note once from its own constructor, and derives the
    // writing area's offset there from the measured height of the top bar
    // rect. That measurement happens before `super()` returns, which is
    // before this constructor can add NOTE_CLASS - so the rect is still core's
    // own 24px bar, and the body is left starting a title row too high,
    // overlapping the title and crossing the rule. It corrected itself on the
    // first resize, collapse or keystroke, which is what made it look like a
    // rendering glitch rather than a wrong number.
    //
    // The class is on the root by now, so one more size pass measures 48 and
    // puts the body under the rule. Without firing events: the note is still
    // being constructed, and a size change nobody made does not belong on the
    // undo stack.
    this.view.setSizeWithoutFiringEvents(this.view.getSize());
  }

  /**
   * Redraws everything this plugin lays out over core's comment view: the
   * card's height and the title.
   */
  renderChrome() {
    if (this.isDeadOrDying()) return;
    this.renderCard();
    this.renderRule();
    this.renderTitle();
  }

  /**
   * Shrinks the card to the top bar when the note is collapsed.
   *
   * Core leaves its highlight rect at the expanded size whatever the
   * collapsed state - `updateHighlightRect` is always passed `this.size` -
   * because the rect is `fill: none` for a plain comment and therefore never
   * seen. A note fills it, so left alone a collapsed note would sit there as
   * a full-height card with an empty body. `view.getSize()` is the
   * collapse-aware measurement, so the height is taken from that instead.
   */
  renderCard() {
    if (!this.card_) return;
    this.card_.setAttribute('height', `${this.view.getSize().height}`);
  }

  /**
   * Stretches the hairline to the width of the note.
   *
   * It is inset to the title's own gutter rather than running edge to edge,
   * so it starts where the heading starts. The stylesheet hides it on a
   * collapsed note, where there is no body left to divide it from.
   */
  renderRule() {
    if (!this.rule_) return;
    const {width} = this.view.getSize();
    const dir = this.workspace.RTL ? -1 : 1;
    const inset = Math.min(NOTE_MARGIN, width / 2);
    this.rule_.setAttribute('x1', `${dir * inset}`);
    this.rule_.setAttribute('x2', `${dir * Math.max(inset, width - inset)}`);
    this.rule_.setAttribute('y1', `${TITLE_RULE_Y}`);
    this.rule_.setAttribute('y2', `${TITLE_RULE_Y}`);
  }

  /**
   * Paints the note by overriding the CSS custom properties core's comment
   * stylesheet already reads, which avoids restyling its elements directly.
   *
   * Two values off the one stored colour: the paper, and the edge that draws
   * both the card's outline and the rule under the title. The text is written
   * straight onto the paper, so there is no third.
   */
  renderColour() {
    const colour = this.getColour();
    const style = this.getSvgRoot().style;
    style.setProperty('--commentFillColour', colour);
    style.setProperty('--commentBorderColour', edgeFor(colour));
  }

  /**
   * Draws the title and the pin marker, truncating the title to what is left
   * of the width.
   *
   * Called on every size change as well as every title change, since the
   * truncation depends on both, and on pinning, which moves the title over to
   * make room for the marker.
   */
  renderTitle() {
    if (!this.titleElement_ || this.isDeadOrDying()) return;

    const named = !!this.getTitle();
    Blockly.utils.dom[named ? 'addClass' : 'removeClass'](
      this.getSvgRoot(),
      TITLED_CLASS,
    );

    // An unnamed note still shows a title row - the placeholder is what says
    // the row can be clicked - so there is always text to lay out. The
    // stylesheet greys it.
    const title = named ? this.getTitle() : UNTITLED_TITLE_TEXT;
    if (!this.titleNode_ || !this.titleElement_) return;
    this.titleNode_.textContent = title;

    // The marker leads the title, so it is what the title is indented past.
    // Nothing in core makes room for it: `calcMinSize` sums its own two bar
    // buttons by name, so this offset is the only thing keeping the two from
    // overlapping.
    const indent = this.isPinned()
      ? (PIN_GLYPH_INK.width * PIN_ICON_SIZE) / PIN_GLYPH_GRID + PIN_ICON_GAP
      : 0;
    // Inside core's top bar group, which it mirrors in RTL - so x counts
    // inwards from the note's edge either way, and the sign follows.
    const dir = this.workspace.RTL ? -1 : 1;
    this.positionPin_(dir);

    this.titleElement_.setAttribute('x', `${dir * (NOTE_MARGIN + indent)}`);
    this.titleElement_.setAttribute('y', `${TOPBAR_HEIGHT / 2}`);

    // Trim a character at a time; titles are short, so this settles fast.
    const maxWidth = Math.max(
      0,
      this.view.getSize().width - NOTE_MARGIN * 2 - indent,
    );
    let text = title;
    while (
      text.length > 1 &&
      Blockly.utils.dom.getTextWidth(this.titleElement_) > maxWidth
    ) {
      text = text.slice(0, -1);
      this.titleNode_.textContent = `${text}\u2026`;
    }
  }

  /**
   * Places the pin marker at the start of the title row.
   *
   * The glyph is authored on a 24-unit grid, so it is scaled down to one line
   * box. In RTL the whole top bar is mirrored by core, and the negative scale
   * undoes that for the glyph itself - the same correction the title gets from
   * the stylesheet.
   *
   * @param dir 1 in a left-to-right workspace, -1 in a right-to-left one.
   */
  private positionPin_(dir: number) {
    if (!this.pin_) return;
    const scale = PIN_ICON_SIZE / PIN_GLYPH_GRID;
    // Offset by the glyph's own padding so it is the ink that lands on the
    // margin, level with the body text below, rather than the box around it.
    const x = dir * (NOTE_MARGIN - PIN_GLYPH_INK.x * scale);
    const y =
      TOPBAR_HEIGHT / 2 - (PIN_GLYPH_INK.y + PIN_GLYPH_INK.height / 2) * scale;
    this.pin_.setAttribute(
      'transform',
      `translate(${x}, ${y}) scale(${dir * scale}, ${scale})`,
    );
  }

  /** Locks or unlocks the note, and marks it visually. */
  applyPinned() {
    super.applyPinned();
    const pinned = this.isPinned();
    Blockly.utils.dom[pinned ? 'addClass' : 'removeClass'](
      this.getSvgRoot(),
      PINNED_CLASS,
    );
    // The marker takes room from the title, so the row has to be laid out
    // again. Nothing else would do it until the next resize.
    this.renderTitle();
    if (pinned) this.applyZIndex();
  }

  /** Restacks every note on the workspace to match their z-indices. */
  applyZIndex() {
    restackNotes(this.workspace);
  }

  /**
   * Includes the note's extra state in clipboard data so that duplicate and
   * paste keep the title and colour. Consumed by NotePaster.
   * @returns The copy data, or null if the note is not copyable.
   */
  toCopyData(): NoteCopyData | null {
    const data = super.toCopyData() as NoteCopyData | null;
    if (!data) return null;
    data.noteState = this.saveNoteState();
    return data;
  }
}
