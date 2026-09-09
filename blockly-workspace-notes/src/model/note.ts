/**
 * @fileoverview A note on a rendered workspace: the chrome drawn over the
 * state `model/note_mixin.ts` defines.
 *
 * Everything here is SVG the note adds to, or takes away from, the comment
 * core already built — the card, the title, and the markers that show a note
 * is pinned or locked — plus the plumbing that keeps that chrome in step with
 * a comment core is resizing, collapsing and dragging underneath it.
 */

import * as Blockly from 'blockly/core';

import {
  NOTE_CLASS,
  FOOTER_CLASS,
  FOOTER_TEXT_CLASS,
  LOCK_CLASS,
  LOCKED_CLASS,
  PIN_CLASS,
  SELECTION_CLASS,
  PINNED_CLASS,
  TITLED_CLASS,
  TITLE_CLASS,
  UNTITLED_TITLE_TEXT,
} from '../constants/dom';
import {
  BAR_EMPTY_INSET,
  BAR_INSET,
  BODY_INSET,
  FOOTER_HANDLE_CLEARANCE,
  FOOTER_HEIGHT,
  FOOTER_ICON_SIZE,
  FOOTER_ITEM_GAP,
  FOOTER_LABEL_GAP,
  MIN_FOOTER_AUTHOR_CHARS,
  MIN_SIZE,
  GLYPH_GRID,
  LOCK_GLYPH_INK,
  MARKER_ICON_GAP,
  MARKER_ICON_SIZE,
  PIN_GLYPH_INK,
  TOPBAR_HEIGHT,
} from '../constants/layout';
import type {GlyphInk} from '../constants/layout';
import type {NoteCopyData} from '../types/clipboard';
import {edgeFor, inkFor} from '../utils/colour';
import {
  CALENDAR_GLYPH,
  CHEVRON_GLYPH,
  LOCK_GLYPH,
  PIN_GLYPH,
  TRASH_GLYPH,
  USER_GLYPH,
  glyphToDataUri,
} from '../ui/icons';
import {editTitle} from '../ui/title_editor';
import {msg} from '../utils/messages';
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

  /** Where a press on the title started, while one is in progress. */
  private titlePressPoint_?: {x: number; y: number} | null;

  /** The SVG text element holding the title. */
  private titleElement_?: SVGTextElement;

  /** The marker shown while the note is pinned. */
  private pin_?: SVGGElement;

  /** The marker shown while the note is locked. */
  private lock_?: SVGGElement;

  /** The rect that draws the selection ring. */
  private selection_?: SVGRectElement;

  /** The footer group, and the four pieces laid out inside it. */
  private footer_?: SVGGElement;

  /** See `footer_`. */
  private authorIcon_?: SVGGElement;

  /** See `footer_`. */
  private authorText_?: SVGTextElement;

  /** See `footer_`. */
  private dateIcon_?: SVGGElement;

  /** See `footer_`. */
  private dateText_?: SVGTextElement;

  /**
   * Core's two bar buttons.
   *
   * Kept only so their artwork can be retinted when the note is recoloured.
   * Everything else about them - where they sit, what they do, their focus and
   * ARIA - stays core's business.
   */
  private foldoutIcon_?: SVGImageElement | null;

  /** See `foldoutIcon_`. */
  private deleteIcon_?: SVGImageElement | null;

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
    this.foldoutIcon_ = root.querySelector('.blocklyFoldoutIcon');
    this.deleteIcon_ = root.querySelector('.blocklyDeleteIcon');

    /**
     * The card itself: core's own highlight rect, which a note fills rather
     * than drawing paper of its own. Core resizes it on every pointer move of
     * a drag and strokes it when the note is selected, so borrowing it keeps
     * both for free.
     *
     * Square, like Blockly's own comment: core leaves this rect unrounded and
     * a note no longer overrides that.
     * @private
     */
    this.card_ = root.querySelector('.blocklyCommentHighlight');

    /**
     * The two title bar markers: Tabler's `pinned` and `lock`, both authored
     * on a 24-unit grid, and both drawn into the same slot between the
     * collapse button and the title. The stylesheet shows at most one, so the
     * slot never carries two and the title's offset stays a single term.
     *
     * They live in the root group, *not* in core's top bar. Core mirrors that
     * bar wholesale in RTL and each of its children has to undo the mirror for
     * itself; the root group is not mirrored, so a marker flips its own
     * coordinates instead. Both are inserted after the bar in document order
     * so they paint on top of it - the bar is opaque, and anything before it
     * is simply covered.
     *
     * They differ in what they tell assistive technology. The pin is
     * decoration: pinning takes away one thing, the menu says so plainly, and
     * anyone can undo it in a click. Locking takes away four at once, removes
     * a visible button from the bar, and in the case this was built for cannot
     * be undone by the person reading it - and core's only signal is the
     * readonly attribute on the body, which is reached after focus is already
     * inside it and says nothing about the title or the missing bin. So the
     * lock is labelled and the pin is not.
     * @private
     */
    let after: Element | null = topBar;
    const marker = (
      cls: string,
      paths: string[],
      aria: Record<string, string>,
    ) => {
      const g = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.G, {
        'class': cls,
        ...aria,
      });
      for (const d of paths) {
        Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, {'d': d}, g);
      }
      if (after) {
        root.insertBefore(g, after.nextSibling);
        after = g;
      } else {
        root.appendChild(g);
      }
      return g;
    };
    this.pin_ = marker(PIN_CLASS, PIN_GLYPH, {'aria-hidden': 'true'});
    this.lock_ = marker(LOCK_CLASS, LOCK_GLYPH, {
      'role': 'img',
      'aria-label': msg('NOTE_LOCKED_LABEL', 'Locked'),
    });

    /**
     * The footer: who wrote the note, and when it last changed.
     *
     * Both are recorded on every note already and neither was ever shown. It
     * sits along the foot rather than in the title bar because the bar is a
     * row of controls and this is a caption - and because the body can give up
     * a line at the bottom, where the bar has no room to give.
     * @private
     */
    this.footer_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.G,
      {'class': FOOTER_CLASS, 'aria-hidden': 'true'},
      root,
    );
    const glyph = (paths: string[]) => {
      const g = Blockly.utils.dom.createSvgElement(
        Blockly.utils.Svg.G,
        {},
        this.footer_,
      );
      for (const d of paths) {
        Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, {'d': d}, g);
      }
      return g;
    };
    const label = () =>
      Blockly.utils.dom.createSvgElement(
        Blockly.utils.Svg.TEXT,
        {'class': `${FOOTER_TEXT_CLASS} blocklyText`},
        this.footer_,
      );
    this.authorIcon_ = glyph(USER_GLYPH);
    this.authorText_ = label();
    this.dateIcon_ = glyph(CALENDAR_GLYPH);
    this.dateText_ = label();

    /**
     * The selection ring.
     *
     * A rect of its own rather than a stroke on the card, because the card is
     * painted first and the title bar is painted over it: a stroke there is
     * half-covered for the bar's whole height and full thickness below, which
     * reads as a ring that changes width halfway down. Drawn last, it is even
     * the whole way round.
     * @private
     */
    this.selection_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.RECT,
      {'class': SELECTION_CLASS, 'aria-hidden': 'true'},
      root,
    );
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
      // The editable check is also what keeps a locked note's title from
      // opening, which is why the inline editor itself needs no lock handling.
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
    // own 24px bar, and the body is left starting too high, overlapping the
    // title row. It corrected itself on the first resize, collapse or
    // keystroke, which is what made it look like a rendering glitch rather
    // than a wrong number.
    //
    // The class is on the root by now, so one more size pass measures the
    // note's own bar height and puts the body below it. Without firing events:
    // the note is still being constructed, and a size change nobody made does
    // not belong on the undo stack.
    this.view.setSizeWithoutFiringEvents(this.view.getSize());
  }

  /**
   * Redraws everything this plugin lays out over core's comment view: the
   * card's height and the title.
   */
  renderChrome() {
    if (this.isDeadOrDying()) return;
    this.renderCard();
    this.renderTitle();
    this.renderFooter();
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
    const {width, height} = this.view.getSize();
    this.card_?.setAttribute('height', `${height}`);

    // The ring traces the card, so it takes the same box - including core's
    // convention of hanging the card off the leading edge in RTL.
    this.selection_?.setAttribute('x', `${this.workspace.RTL ? -width : 0}`);
    this.selection_?.setAttribute('y', '0');
    this.selection_?.setAttribute('width', `${width}`);
    this.selection_?.setAttribute('height', `${height}`);
  }

  /**
   * Paints the note by overriding the CSS custom properties core's comment
   * stylesheet already reads, which avoids restyling its elements directly.
   *
   * Three values off the one stored colour: the body, the edge that draws both
   * the border and the title bar, and the ink that everything written on the
   * note is drawn in. The ink is the one core has no property for, so it also
   * has to be painted into the bar buttons by hand - see below.
   */
  renderColour() {
    const colour = this.getColour();
    const ink = inkFor(colour);
    const style = this.getSvgRoot().style;
    style.setProperty('--commentFillColour', colour);
    style.setProperty('--commentBorderColour', edgeFor(colour));
    style.setProperty('--noteInkColour', ink);

    // Core's bar buttons are <image> elements, which no amount of CSS can
    // tint, so the artwork is swapped for one already drawn in this note's
    // ink. Core reads nothing back off them but their bounding box, id and
    // visibility - none of which the picture affects - so the buttons stay
    // entirely core's, keyboard handling and all.
    this.foldoutIcon_?.setAttribute('href', glyphToDataUri(CHEVRON_GLYPH, ink));
    this.deleteIcon_?.setAttribute('href', glyphToDataUri(TRASH_GLYPH, ink));
  }

  /**
   * Draws the title and its marker, truncating the title to what is left of
   * the width.
   *
   * Called on every size change as well as every title change, since the
   * truncation depends on both - and on pinning and locking, either of which
   * moves the title over to make room for a marker.
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

    // The title is boxed in on both sides: the collapse button before it, the
    // delete button after it, and the pin marker in between when there is one.
    // Core makes room for none of that - `calcMinSize` sums only its own two
    // buttons, and nothing at all knows about the marker - so these insets are
    // the only thing keeping the four from overlapping.
    // One marker slot, and a lock takes it from a pin: a note that cannot be
    // edited is the more urgent of the two facts, and the pin comes back the
    // moment it is unlocked. So the leading offset stays one term however many
    // states the note is in at once.
    const marker = this.isLocked()
      ? LOCK_GLYPH_INK
      : this.isPinned()
        ? PIN_GLYPH_INK
        : null;
    const leading = BAR_INSET + (marker ? markerAdvance(marker) : 0);

    // Inside core's top bar group, which it mirrors in RTL - so x counts
    // inwards from the note's edge either way, and the sign follows.
    const dir = this.workspace.RTL ? -1 : 1;
    this.positionMarker_(this.pin_, PIN_GLYPH_INK, dir);
    this.positionMarker_(this.lock_, LOCK_GLYPH_INK, dir);

    this.titleElement_.setAttribute('x', `${dir * leading}`);
    this.titleElement_.setAttribute('y', `${TOPBAR_HEIGHT / 2}`);

    // A locked note has no delete button, so the far end of its bar holds
    // nothing but the margin. Reserving a button's worth there would leave the
    // title stopping short of an empty gap.
    const trailing = this.isLocked() ? BAR_EMPTY_INSET : BAR_INSET;

    // Trim a character at a time; titles are short, so this settles fast.
    const maxWidth = Math.max(
      0,
      this.view.getSize().width - leading - trailing,
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
   * Lays out the author and the date along the foot of the note.
   *
   * Both are read from the note's own metadata, so a host that supplies no
   * `getAuthor` gets the date alone and the row shortens to match. The date is
   * `updatedAt` rather than `createdAt`: on a working note the useful question
   * is whether it is still current.
   *
   * The row stops short of the resize handle, which core puts in this same
   * corner, and the author is what gives way when there is not enough width -
   * the date is short and fixed, so truncating it would save nothing.
   */
  renderFooter() {
    if (!this.footer_ || !this.authorText_ || !this.dateText_) return;
    if (!this.authorIcon_ || !this.dateIcon_) return;

    const {author, updatedAt} = this.getMeta();
    const date = formatDate(updatedAt);
    // Nothing worth a row: let the stylesheet's :empty rule hide it.
    this.footer_.setAttribute('data-empty', author || date ? 'false' : 'true');

    const dir = this.workspace.RTL ? -1 : 1;
    const {width, height} = this.view.getSize();
    const y = height - BODY_INSET - FOOTER_HEIGHT / 2;
    const scale = FOOTER_ICON_SIZE / GLYPH_GRID;

    // `offset` is measured from the note's leading edge. The footer sits in
    // the root group, which core does not mirror - unlike the title bar - so
    // nothing here flips itself. In RTL the local space runs from -width to 0,
    // so an offset becomes a negative coordinate and the glyph is placed by
    // its far edge; the artwork keeps its own orientation either way, which a
    // calendar or a person very much needs.
    const place = (
      icon: SVGGElement,
      text: SVGTextElement,
      value: string,
      offset: number,
    ) => {
      const shown = !!value;
      icon.style.display = shown ? '' : 'none';
      text.style.display = shown ? '' : 'none';
      if (!shown) return 0;
      const iconX = dir > 0 ? offset : -(offset + FOOTER_ICON_SIZE);
      icon.setAttribute(
        'transform',
        `translate(${iconX}, ${y - FOOTER_ICON_SIZE / 2}) scale(${scale})`,
      );
      const textOffset = offset + FOOTER_ICON_SIZE + FOOTER_LABEL_GAP;
      text.setAttribute('x', `${dir * textOffset}`);
      text.setAttribute('y', `${y}`);
      text.textContent = value;
      return (
        FOOTER_ICON_SIZE +
        FOOTER_LABEL_GAP +
        Blockly.utils.dom.getTextWidth(text)
      );
    };

    // The date is placed first so its width is known, then the author is given
    // whatever is left.
    const room = Math.max(0, width - BODY_INSET * 2 - FOOTER_HANDLE_CLEARANCE);
    this.dateText_.textContent = date;
    const dateWidth = date
      ? FOOTER_ICON_SIZE +
        FOOTER_LABEL_GAP +
        Blockly.utils.dom.getTextWidth(this.dateText_)
      : 0;

    let authorLabel = author;
    const authorRoom =
      room - dateWidth - (date && author ? FOOTER_ITEM_GAP : 0);
    if (authorLabel) {
      let trimmed = author;
      this.authorText_.textContent = authorLabel;
      while (
        trimmed.length > 1 &&
        FOOTER_ICON_SIZE +
          FOOTER_LABEL_GAP +
          Blockly.utils.dom.getTextWidth(this.authorText_) >
          authorRoom
      ) {
        trimmed = trimmed.slice(0, -1);
        authorLabel = `${trimmed}\u2026`;
        this.authorText_.textContent = authorLabel;
      }
      // A name cut to a letter or two says nothing and still spends a glyph
      // and a gap saying it, so below that the author gives up its place.
      if (trimmed.length < MIN_FOOTER_AUTHOR_CHARS) authorLabel = '';
    }

    let x = BODY_INSET;
    const used = place(this.authorIcon_, this.authorText_, authorLabel, x);
    if (used) x += used + FOOTER_ITEM_GAP;
    place(this.dateIcon_, this.dateText_, date, x);
  }

  /**
   * Places a marker in the slot between the collapse button and the title.
   *
   * Both markers are positioned unconditionally, hidden or not: the stylesheet
   * decides which one paints, and writing one attribute to a hidden group is
   * cheaper than working out whether it was worth skipping.
   *
   * The glyphs are authored on a 24-unit grid, so they are scaled down to one
   * line box. In RTL the whole top bar is mirrored by core, and the negative
   * scale undoes that for the glyph itself - the same correction the title
   * gets from the stylesheet.
   *
   * @param el The marker group, if it has been built yet.
   * @param ink Where the glyph's ink sits in its grid.
   * @param dir 1 in a left-to-right workspace, -1 in a right-to-left one.
   */
  private positionMarker_(
    el: SVGGElement | undefined,
    ink: GlyphInk,
    dir: number,
  ) {
    if (!el) return;
    const scale = MARKER_ICON_SIZE / GLYPH_GRID;
    // Offset by the glyph's own padding so it is the ink that starts where the
    // title row's contents do, rather than the empty box around it.
    const x = dir * (BAR_INSET - ink.x * scale);
    const y = TOPBAR_HEIGHT / 2 - (ink.y + ink.height / 2) * scale;
    el.setAttribute(
      'transform',
      `translate(${x}, ${y}) scale(${dir * scale}, ${scale})`,
    );
  }

  /** Holds or releases the note, and marks it visually. */
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

  /** Marks the note read-only, and gives the lock the marker slot. */
  applyLocked() {
    super.applyLocked();
    Blockly.utils.dom[this.isLocked() ? 'addClass' : 'removeClass'](
      this.getSvgRoot(),
      LOCKED_CLASS,
    );
    // Mandatory, not defensive. Locking changes which marker shows and takes
    // the delete button out of the bar, but `setEditable` fires no event and
    // touches no size attribute, so the size observer never wakes and nothing
    // else would lay the row out again.
    this.renderTitle();
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
    // Core's own version does not check this, so without it a locked note
    // could still be copied by anything reaching past the context menu.
    if (!this.isCopyable()) return null;
    const data = super.toCopyData() as NoteCopyData | null;
    if (!data) return null;
    data.noteState = this.saveNoteState();
    return data;
  }
}

/**
 * How much of the title row a marker takes, its gap included.
 *
 * Measured across the ink rather than the glyph's box, matching where
 * `positionMarker_` puts it - the two have to agree or the title either
 * collides with the marker or floats away from it.
 *
 * @param ink Where the glyph's ink sits in its grid.
 * @returns The width to give the marker, in workspace units.
 */
function markerAdvance(ink: GlyphInk): number {
  return (ink.width * MARKER_ICON_SIZE) / GLYPH_GRID + MARKER_ICON_GAP;
}

/**
 * Renders a stored timestamp as a short, local date.
 *
 * The metadata holds ISO 8601 strings so they survive a round trip verbatim;
 * this is only for reading. An unparseable or absent value yields an empty
 * string, which the footer treats as "nothing to show" rather than printing
 * "Invalid Date" on the note.
 *
 * @param iso An ISO 8601 timestamp, or an empty string.
 * @returns The date in the viewer's locale, or '' if there is not one.
 */
function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
