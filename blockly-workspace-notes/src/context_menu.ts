/**
 * @fileoverview Context menu items for notes.
 *
 * Two things about core are worth knowing here. First, its comment menu items
 * are *not* part of `registerDefaultOptions()` — `registerCommentOptions()`
 * has to be called explicitly or there is no "Add Comment" at all. Second, its
 * `commentCreate` hardcodes `new RenderedWorkspaceComment(...)` rather than
 * going through `workspace.newComment()`, so overriding that method is not
 * enough to make the menu produce notes; the item itself must be replaced.
 *
 * All three of core's items are replaced, the other two only so that the menu
 * calls a note a note throughout rather than switching to "comment" for
 * duplicate and delete.
 */

import * as Blockly from 'blockly/core';

import {DEFAULT_PALETTE} from './constants';
import type {PaletteEntry} from './types';
import {Note, nextZIndex, previousZIndex} from './note';

const ScopeType = Blockly.ContextMenuRegistry.ScopeType;

/** IDs of the items this module registers, in the order they are added. */
const NOTE_ITEM_IDS = [
  'noteColour',
  'notePin',
  'noteCollapse',
  'noteBringToFront',
  'noteSendToBack',
];

/**
 * Reads a Blockly message with a fallback, since `blockly/core` on its own
 * ships no message table.
 *
 * @param key The message key.
 * @param fallback The text to use when the key is unset.
 * @returns The message.
 */
function msg(key: string, fallback: string): string {
  return Blockly.Msg[key] || fallback;
}

/**
 * @param scope The menu scope.
 * @returns The note the menu was opened on, if any.
 */
function noteFromScope(scope: Blockly.ContextMenuRegistry.Scope): Note | null {
  const comment = scope.comment;
  return comment instanceof Note ? comment : null;
}

/**
 * Runs a mutation as a single undoable step.
 *
 * @param mutate The mutation to perform.
 */
function asOneUndoStep(mutate: () => void): void {
  const existingGroup = Blockly.Events.getGroup();
  if (!existingGroup) Blockly.Events.setGroup(true);
  try {
    mutate();
  } finally {
    Blockly.Events.setGroup(existingGroup);
  }
}

/**
 * Builds the row of colour swatches used as a menu item's display text.
 *
 * Blockly's context menu has no notion of submenus, but `displayText` accepts
 * an HTMLElement — so the whole palette fits in one row rather than spilling
 * seven entries into the menu.
 *
 * @param note The note to recolour.
 * @param palette The
 *     swatches.
 * @returns The swatch row.
 */
function createSwatchRow(note: Note, palette: PaletteEntry[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'blocklyNoteSwatchRow';

  for (const {name, fill} of palette) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'blocklyNoteSwatch';
    // The swatch shows the note's colour itself, the way a block's colour
    // reads in the toolbox.
    swatch.style.backgroundColor = fill;
    swatch.title = name;
    swatch.setAttribute('aria-label', name);
    if (note.getColour().toLowerCase() === fill.toLowerCase()) {
      swatch.classList.add('blocklyNoteSwatchSelected');
    }

    swatch.addEventListener('pointerdown', (e) => {
      // Stop the menu's own handler from also firing for this row.
      e.stopPropagation();
      e.preventDefault();
      asOneUndoStep(() => note.setColour(fill));
      Blockly.ContextMenu.hide();
    });

    row.appendChild(swatch);
  }

  return row;
}

/**
 * Registers every note-related context menu item.
 *
 * @param options Registration options.
 * @param options.palette The colour swatches to offer.
 */
export function registerNoteContextMenu({palette = DEFAULT_PALETTE} = {}) {
  const registry = Blockly.ContextMenuRegistry.registry;

  // Core does not register these by default; without them there is no
  // "Add Comment" entry to replace.
  if (!registry.getItem('commentCreate')) {
    Blockly.ContextMenuItems.registerCommentOptions();
  }

  // Core's three comment items call a note a comment. Each is replaced below,
  // keeping its ID, weight and keyboard shortcut so any host code referring to
  // it still finds it and the menu still shows the shortcut hint. The wording
  // falls back to core's own for a plain comment, which a host can still
  // create directly even with this plugin installed.
  registry.unregister('commentDuplicate');
  registry.register({
    id: 'commentDuplicate',
    scopeType: ScopeType.COMMENT,
    weight: 1,
    associatedKeyboardShortcut: 'duplicate',
    displayText: (scope) =>
      noteFromScope(scope)
        ? msg('DUPLICATE_NOTE', 'Duplicate note')
        : msg('DUPLICATE_COMMENT', 'Duplicate Comment'),
    preconditionFn: (scope) =>
      scope.comment?.isMovable() ? 'enabled' : 'hidden',
    callback: (scope) => {
      const comment = scope.comment;
      const data = comment?.toCopyData();
      if (!comment || !data) return;
      Blockly.clipboard.paste(data, comment.workspace);
    },
  });

  registry.unregister('commentDelete');
  registry.register({
    id: 'commentDelete',
    scopeType: ScopeType.COMMENT,
    weight: 6,
    associatedKeyboardShortcut: 'delete',
    displayText: (scope) =>
      noteFromScope(scope)
        ? msg('DELETE_NOTE', 'Delete note')
        : msg('REMOVE_COMMENT', 'Remove Comment'),
    preconditionFn: (scope) =>
      scope.comment?.isDeletable() ? 'enabled' : 'hidden',
    callback: (scope) => {
      const comment = scope.comment;
      if (!comment) return;
      asOneUndoStep(() => comment.dispose());
      comment.workspace.getAudioManager().play('delete');
    },
  });

  registry.unregister('commentCreate');
  registry.register({
    id: 'commentCreate',
    scopeType: ScopeType.WORKSPACE,
    weight: 8,
    displayText: () => msg('ADD_COMMENT', 'Add Note'),
    preconditionFn: (scope) =>
      scope.workspace?.isMutator ? 'hidden' : 'enabled',
    callback: (scope, menuOpenEvent, menuSelectEvent, location) => {
      const workspace = scope.workspace;
      if (!workspace) return;
      asOneUndoStep(() => {
        const note = new Note(workspace);
        note.moveTo(
          Blockly.utils.svgMath.screenToWsCoordinates(
            workspace,
            new Blockly.utils.Coordinate(location.x, location.y),
          ),
        );
        note.setZIndex(nextZIndex(workspace));
        Blockly.getFocusManager().focusNode(note);
      });
    },
  });

  registry.register({
    id: 'noteColour',
    scopeType: ScopeType.COMMENT,
    weight: 3,
    displayText: (scope) => {
      const note = noteFromScope(scope);
      return note ? createSwatchRow(note, palette) : '';
    },
    preconditionFn: (scope) => {
      const note = noteFromScope(scope);
      return note?.isEditable() ? 'enabled' : 'hidden';
    },
    // Selecting the row itself does nothing; the swatches handle their own
    // clicks so that one press picks a colour and dismisses the menu.
    callback: () => {},
  });

  registry.register({
    id: 'notePin',
    scopeType: ScopeType.COMMENT,
    weight: 4,
    displayText: (scope) =>
      noteFromScope(scope)?.isPinned()
        ? msg('UNPIN_NOTE', 'Unpin note')
        : msg('PIN_NOTE', 'Pin note'),
    preconditionFn: (scope) => (noteFromScope(scope) ? 'enabled' : 'hidden'),
    callback: (scope) => {
      const note = noteFromScope(scope);
      if (!note) return;
      asOneUndoStep(() => {
        const pinning = !note.isPinned();
        if (pinning) note.setZIndex(nextZIndex(note.workspace));
        note.setPinned(pinning);
      });
    },
  });

  // Core registers no collapse item for comments - registerCollapseExpandBlock
  // is ScopeType.BLOCK only - so with the foldout arrow gone from the bar this
  // is the only way to collapse a note.
  registry.register({
    id: 'noteCollapse',
    scopeType: ScopeType.COMMENT,
    weight: 4.1,
    displayText: (scope) =>
      noteFromScope(scope)?.isCollapsed()
        ? msg('EXPAND_NOTE', 'Expand note')
        : msg('COLLAPSE_NOTE', 'Collapse note'),
    preconditionFn: (scope) => (noteFromScope(scope) ? 'enabled' : 'hidden'),
    callback: (scope) => {
      const note = noteFromScope(scope);
      if (!note) return;
      asOneUndoStep(() => note.setCollapsed(!note.isCollapsed()));
    },
  });

  registry.register({
    id: 'noteBringToFront',
    scopeType: ScopeType.COMMENT,
    weight: 4.2,
    displayText: () => msg('NOTE_BRING_TO_FRONT', 'Bring to front'),
    preconditionFn: (scope) => (noteFromScope(scope) ? 'enabled' : 'hidden'),
    callback: (scope) => {
      const note = noteFromScope(scope);
      if (!note) return;
      asOneUndoStep(() => note.setZIndex(nextZIndex(note.workspace)));
    },
  });

  registry.register({
    id: 'noteSendToBack',
    scopeType: ScopeType.COMMENT,
    weight: 4.3,
    displayText: () => msg('NOTE_SEND_TO_BACK', 'Send to back'),
    preconditionFn: (scope) => (noteFromScope(scope) ? 'enabled' : 'hidden'),
    callback: (scope) => {
      const note = noteFromScope(scope);
      if (!note) return;
      asOneUndoStep(() => note.setZIndex(previousZIndex(note.workspace)));
    },
  });
}

/**
 * Removes the note items and restores core's `commentCreate`.
 */
export function unregisterNoteContextMenu(): void {
  const registry = Blockly.ContextMenuRegistry.registry;

  for (const id of NOTE_ITEM_IDS) {
    if (registry.getItem(id)) registry.unregister(id);
  }

  // Hand core's own three items back, in the order it registers them.
  if (registry.getItem('commentDuplicate')) {
    registry.unregister('commentDuplicate');
    Blockly.ContextMenuItems.registerCommentDuplicate();
  }

  if (registry.getItem('commentDelete')) {
    registry.unregister('commentDelete');
    Blockly.ContextMenuItems.registerCommentDelete();
  }

  if (registry.getItem('commentCreate')) {
    registry.unregister('commentCreate');
    Blockly.ContextMenuItems.registerCommentCreate();
  }
}

Blockly.Css.register(`
.blocklyNoteSwatchRow {
  display: flex;
  gap: 6px;
  padding: 2px 0;
}

.blocklyNoteSwatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  cursor: pointer;
}

/* #fc3 is the selection colour core uses for comments and blocks. */
.blocklyNoteSwatchSelected {
  outline: 2px solid #fc3;
  outline-offset: 1px;
}
`);
