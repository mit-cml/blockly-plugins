/**
 * @fileoverview Notes: workspace comments that also carry a title, a colour,
 * authorship metadata and a stacking order.
 *
 * Blockly keeps its comment model and its rendered comment in a single
 * inheritance chain (`WorkspaceComment` -> `RenderedWorkspaceComment`), and a
 * headless workspace only ever produces the former. The extra state is
 * therefore expressed as a mixin and applied to both, so notes work
 * identically in a browser and in a headless workspace (which is all a Node
 * test can build — `Blockly.inject` is unavailable there).
 */

import * as Blockly from 'blockly/core';

import {
  DEFAULT_COLOUR,
  FRAME_RADIUS,
  MIN_SIZE,
  NOTE_CLASS,
  NOTE_MARGIN,
  PINNED_CLASS,
  RULE_CLASS,
  TITLED_CLASS,
  TITLE_CLASS,
  TITLE_RULE_Y,
  TOPBAR_HEIGHT,
  UNTITLED_TITLE_TEXT,
} from './constants';
import {edgeFor} from './colour';
import {editTitle} from './title_editor';
import type {
  NoteCopyData,
  NoteMeta,
  NoteProperty,
  NotePropertyValue,
  NoteState,
} from './types';
import {NoteChange} from './events';

/**
 * Any constructor producing a workspace comment.
 *
 * `any[]` rather than the real parameters because a mixin cannot know what its
 * base takes; the two exported classes below restore the real signature.
 */
type CommentConstructor = new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Blockly.comments.WorkspaceComment;

/**
 * Everything the mixin adds to a workspace comment.
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

/**
 * Adds note state and behaviour to a workspace comment class.
 *
 * @param Base `WorkspaceComment` or `RenderedWorkspaceComment`.
 * @returns The extended class.
 */
const NoteMixin = <TBase extends CommentConstructor>(Base: TBase) =>
  class extends Base {
    /**
     * This note's extra state, created on first access.
     *
     * Declared without an initializer on purpose. `target: es6` keeps
     * `useDefineForClassFields` off, so this declaration emits nothing — which
     * matters, because a field definition would run after `super()` and wipe a
     * value that the base constructor's create event had already caused to be
     * built.
     */
    protected noteState_?: NoteState;

    /**
     * Returns this note's extra state, creating it on first access.
     *
     * The state is built lazily rather than in a class field because subclass
     * fields are initialized only after `super()` returns, and the
     * `WorkspaceComment` constructor already fires a create event and drives
     * view setup before that point.
     *
     * @returns The live state object. Treat as read-only.
     */
    getNoteState(): NoteState {
      if (!this.noteState_) {
        const now = new Date().toISOString();
        this.noteState_ = {
          title: '',
          colour: DEFAULT_COLOUR,
          pinned: false,
          zIndex: 0,
          meta: {author: '', createdAt: now, updatedAt: now},
        };
      }
      return this.noteState_;
    }

    /** @returns The note's title, or '' if it has none. */
    getTitle(): string {
      return this.getNoteState().title;
    }

    /**
     * Sets the note's title.
     * @param title The new title.
     */
    setTitle(title: string): void {
      this.changeNoteProperty_('title', String(title ?? ''));
    }

    /** @returns The note's background colour as a hex string. */
    getColour(): string {
      return this.getNoteState().colour;
    }

    /**
     * Sets the note's background colour.
     * @param colour A CSS colour; parsed to hex via Blockly.
     */
    setColour(colour: string): void {
      const parsed = Blockly.utils.colour.parse(colour) ?? DEFAULT_COLOUR;
      this.changeNoteProperty_('colour', parsed);
    }

    /** @returns Whether the note is pinned. */
    isPinned(): boolean {
      return this.getNoteState().pinned;
    }

    /**
     * Pins or unpins the note. A pinned note is locked in place and kept in
     * front of its neighbours.
     * @param pinned Whether the note should be pinned.
     */
    setPinned(pinned: boolean): void {
      this.changeNoteProperty_('pinned', !!pinned);
    }

    /** @returns The note's stacking order; higher is nearer front. */
    getZIndex(): number {
      return this.getNoteState().zIndex;
    }

    /**
     * Sets the note's stacking order.
     * @param zIndex The new stacking order.
     */
    setZIndex(zIndex: number): void {
      this.changeNoteProperty_('zIndex', Number(zIndex) || 0);
    }

    /** @returns A copy of the note's metadata. */
    getMeta(): NoteMeta {
      return {...this.getNoteState().meta};
    }

    /**
     * Replaces the note's metadata wholesale, without firing an event or
     * bumping `updatedAt`. Used when loading, so a round-trip preserves
     * timestamps verbatim.
     * @param meta The metadata to restore.
     */
    restoreMeta(meta: Partial<NoteMeta>): void {
      this.getNoteState().meta = {...this.getNoteState().meta, ...meta};
    }

    /** Records that the note changed just now. */
    touchMeta(): void {
      this.getNoteState().meta.updatedAt = new Date().toISOString();
    }

    /**
     * Returns a plain, JSON-serializable copy of every note-specific field.
     * @returns The note's extra state.
     */
    saveNoteState(): NoteState {
      const state = this.getNoteState();
      return {
        title: state.title,
        colour: state.colour,
        pinned: state.pinned,
        zIndex: state.zIndex,
        meta: {...state.meta},
      };
    }

    /**
     * Applies a property change without firing an event.
     *
     * This is the single write path: `changeNoteProperty_` uses it for user
     * edits, and {@link NoteChange} uses it to replay undo and redo.
     *
     * @param property The property name, or '*' for a whole state
     *     object.
     * @param value The value to apply.
     */
    applyNoteProperty(property: NoteProperty, value?: NotePropertyValue): void {
      const state = this.getNoteState();
      // The property name is what says which shape `value` has — a
      // correspondence the type system cannot see across two independent
      // parameters, so each case asserts the one it knows it has.
      switch (property) {
        case 'title':
          state.title = value as string;
          this.renderTitle();
          break;
        case 'colour':
          state.colour = value as string;
          this.renderColour();
          break;
        case 'pinned':
          state.pinned = value as boolean;
          this.applyPinned();
          break;
        case 'zIndex':
          state.zIndex = value as number;
          this.applyZIndex();
          break;
        case 'meta':
          state.meta = {...(value as NoteMeta)};
          break;
        case '*': {
          // Null is the "forward" half of a delete snapshot: there is nothing
          // to restore when replaying towards the deletion.
          if (!value) break;
          const whole = value as NoteState;
          state.title = whole.title;
          state.colour = whole.colour;
          state.pinned = whole.pinned;
          state.zIndex = whole.zIndex;
          state.meta = {...whole.meta};
          this.renderTitle();
          this.renderColour();
          this.applyPinned();
          this.applyZIndex();
          break;
        }
        default:
          console.warn(`Unknown note property: ${property}`);
      }
    }

    /**
     * Reads a single note property.
     * @param property The property name, or '*'.
     * @returns The current value.
     */
    protected readNoteProperty_(property: NoteProperty): NotePropertyValue {
      return property === '*'
        ? this.saveNoteState()
        : this.getNoteState()[property];
    }

    /**
     * Applies a change and fires an undoable event describing it.
     * @param property The property name.
     * @param value The new value.
     */
    protected changeNoteProperty_(
      property: NoteProperty,
      value: NotePropertyValue,
    ): void {
      const oldValue = this.readNoteProperty_(property);
      if (JSON.stringify(oldValue) === JSON.stringify(value)) return;

      this.applyNoteProperty(property, value);
      this.touchMeta();

      if (Blockly.Events.isEnabled()) {
        Blockly.Events.fire(new NoteChange(this, property, oldValue, value));
      }
    }

    /** Reflects the title in the DOM. Overridden by the rendered subclass. */
    renderTitle(): void {}

    /** Reflects the colour in the DOM. Overridden by the rendered subclass. */
    renderColour(): void {}

    /** Applies the pinned flag. Locking works headlessly too. */
    applyPinned(): void {
      this.setMovable(!this.getNoteState().pinned);
    }

    /** Applies the stacking order. Overridden by the rendered subclass. */
    applyZIndex(): void {}

    /**
     * Disposes of the note.
     *
     * A snapshot event is fired *before* the delete so that undoing a deletion
     * restores the extra fields: a group is undone in reverse, so core's
     * `CommentCreate` rebuilds the bare note first and this event then
     * repaints it. Core's delete event only carries the fields its own
     * serializer knows about.
     *
     * Both events must share a group, or undo would stop after the first and
     * the user would need a second undo to get the colour back.
     */
    dispose(): void {
      const existingGroup = Blockly.Events.getGroup();
      if (!existingGroup) Blockly.Events.setGroup(true);
      try {
        if (!this.isDeadOrDying() && Blockly.Events.isEnabled()) {
          // newValue is null rather than the state: an event whose two sides
          // are equal is dropped by isNull() and never reaches the undo stack.
          Blockly.Events.fire(
            new NoteChange(this, '*', this.saveNoteState(), null),
          );
        }
        super.dispose();
      } finally {
        Blockly.Events.setGroup(existingGroup);
      }
    }
  };

/**
 * The mixin applied to the headless comment, with its real constructor.
 *
 * Naming the result is what makes both of the following work: the constructor
 * parameters survive (a mixin's base is `...args: any[]`, which would otherwise
 * erase them), and `declaration: true` has a type it can write down instead of
 * an anonymous class expression.
 */
const NoteCommentBase = NoteMixin(Blockly.comments.WorkspaceComment) as new (
  workspace: Blockly.Workspace,
  id?: string,
) => Blockly.comments.WorkspaceComment & NoteSurface;

/**
 * A note on a headless workspace: all of the state, none of the rendering.
 */
export class NoteComment extends NoteCommentBase {}

/**
 * The mixin applied to the rendered comment. See `NoteCommentBase`.
 */
const RenderedNoteBase = NoteMixin(
  Blockly.comments.RenderedWorkspaceComment,
) as new (
  workspace: Blockly.WorkspaceSvg,
  id?: string,
) => Blockly.comments.RenderedWorkspaceComment & NoteSurface;

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
   * Draws the title, truncated to the width of the note.
   *
   * Called on every size change as well as every title change, since the
   * truncation depends on both.
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

    this.titleElement_.setAttribute(
      'x',
      `${this.workspace.RTL ? -NOTE_MARGIN : NOTE_MARGIN}`,
    );
    this.titleElement_.setAttribute('y', `${TOPBAR_HEIGHT / 2}`);

    // Trim a character at a time; titles are short, so this settles fast.
    const maxWidth = Math.max(0, this.view.getSize().width - NOTE_MARGIN * 2);
    let text = title;
    while (
      text.length > 1 &&
      Blockly.utils.dom.getTextWidth(this.titleElement_) > maxWidth
    ) {
      text = text.slice(0, -1);
      this.titleNode_.textContent = `${text}\u2026`;
    }
  }

  /** Locks or unlocks the note, and marks it visually. */
  applyPinned() {
    super.applyPinned();
    const pinned = this.isPinned();
    Blockly.utils.dom[pinned ? 'addClass' : 'removeClass'](
      this.getSvgRoot(),
      PINNED_CLASS,
    );
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

/**
 * Reorders the notes on a workspace so their DOM order matches their
 * z-indices.
 *
 * @param workspace The workspace to restack.
 */
export function restackNotes(workspace: Blockly.Workspace): void {
  if (!workspace.rendered) return;
  const notes = workspace
    .getTopComments(false)
    .filter(
      (comment): comment is Note =>
        comment instanceof Note && !comment.isDeadOrDying(),
    );
  notes
    .sort((a, b) => a.getZIndex() - b.getZIndex())
    .forEach((note) => note.view.bringToFront());
}

/**
 * @param workspace The workspace to inspect.
 * @returns One more than the highest z-index in use.
 */
export function nextZIndex(workspace: Blockly.Workspace): number {
  const zIndices = workspace
    .getTopComments(false)
    .filter(isNote)
    .map((note) => note.getZIndex());
  return zIndices.length ? Math.max(...zIndices) + 1 : 1;
}

/**
 * @param workspace The workspace to inspect.
 * @returns One less than the lowest z-index in use.
 */
export function previousZIndex(workspace: Blockly.Workspace): number {
  const zIndices = workspace
    .getTopComments(false)
    .filter(isNote)
    .map((note) => note.getZIndex());
  return zIndices.length ? Math.min(...zIndices) - 1 : -1;
}

/**
 * @param candidate Any value.
 * @returns Whether the value is a note.
 */
export function isNote(candidate: unknown): candidate is Note | NoteComment {
  return candidate instanceof Note || candidate instanceof NoteComment;
}
