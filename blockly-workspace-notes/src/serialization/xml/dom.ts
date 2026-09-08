/**
 * @fileoverview Reading and writing one `<comment>` element.
 *
 * Blockly 13 still writes and reads workspace comments as XML, and a note has
 * to survive that round trip. Everything here funnels through the same state
 * objects `serialization/state.ts` produces, so the XML and JSON formats
 * cannot drift apart.
 *
 * The extra attributes are all optional, so an element written here still
 * reads as an ordinary comment in plain Blockly — it simply ignores what it
 * does not recognise.
 */

import * as Blockly from 'blockly/core';

import type {Note} from '../../model/note';
import type {NoteComment} from '../../model/note_comment';
import type {SavedNote} from '../../types/serialization';
import {appendNote, saveNote} from '../state';

/**
 * Converts a note's JSON state into attributes on a `<comment>` element.
 *
 * Only the note-specific fields are written; core has already supplied
 * `id`/`x`/`y`/`w`/`h` and the text content. Everything added here is
 * optional, so older Blockly reads the element as an ordinary comment and
 * simply ignores what it does not recognise.
 *
 * @param elem The `<comment>` element to decorate.
 * @param state The note state, as produced by `saveNote`.
 */
export function decorateElement(elem: Element, state: SavedNote): void {
  if (state.title) elem.setAttribute('title', state.title);
  if (state.colour) elem.setAttribute('colour', state.colour);
  if (state.pinned) elem.setAttribute('pinned', 'true');
  // `z` rather than `zIndex`, grouping it with core's terse x/y/w/h geometry.
  if (state.zIndex) elem.setAttribute('z', `${state.zIndex}`);
  if (state.meta?.author) elem.setAttribute('author', state.meta.author);
  if (state.meta?.createdAt) elem.setAttribute('created', state.meta.createdAt);
  if (state.meta?.updatedAt) elem.setAttribute('updated', state.meta.updatedAt);
}

/**
 * Reads a `<comment>` element into the state shape the JSON loader uses.
 *
 * Mirrors core's `loadWorkspaceComment` for the shared attributes, including
 * its `isNaN` guards, so a malformed value is skipped rather than written as
 * NaN. The RTL flip is left to `appendNote`, which already applies it.
 *
 * @param elem A `<comment>` element.
 * @returns The note state.
 */
export function domToNoteState(elem: Element): SavedNote {
  const state: SavedNote = Object.create(null);

  const id = elem.getAttribute('id');
  if (id) state.id = id;

  const x = parseInt(elem.getAttribute('x') ?? '', 10);
  const y = parseInt(elem.getAttribute('y') ?? '', 10);
  if (!isNaN(x) && !isNaN(y)) {
    state.x = x;
    state.y = y;
  }

  const width = parseInt(elem.getAttribute('w') ?? '', 10);
  const height = parseInt(elem.getAttribute('h') ?? '', 10);
  if (!isNaN(width) && !isNaN(height)) {
    state.width = width;
    state.height = height;
  }

  if (elem.textContent) state.text = elem.textContent;
  if (elem.getAttribute('collapsed') === 'true') state.collapsed = true;
  if (elem.getAttribute('editable') === 'false') state.editable = false;
  if (elem.getAttribute('movable') === 'false') state.movable = false;
  if (elem.getAttribute('deletable') === 'false') state.deletable = false;

  const title = elem.getAttribute('title');
  if (title) state.title = title;

  const colour = elem.getAttribute('colour');
  if (colour) state.colour = colour;

  if (elem.getAttribute('pinned') === 'true') state.pinned = true;

  const zIndex = parseInt(elem.getAttribute('z') ?? '', 10);
  if (!isNaN(zIndex)) state.zIndex = zIndex;

  const meta = {
    author: elem.getAttribute('author') ?? '',
    createdAt: elem.getAttribute('created') ?? '',
    updatedAt: elem.getAttribute('updated') ?? '',
  };
  if (Object.values(meta).some((value) => value)) state.meta = meta;

  return state;
}

/**
 * Serializes a note to a `<comment>` element.
 *
 * @param note The note to save.
 * @param [skipId] True to omit the note's ID.
 * @returns The `<comment>` element.
 */
export function noteToDom(note: Note | NoteComment, skipId = false): Element {
  const elem = Blockly.utils.xml.createElement('comment');
  const state = saveNote(note, {addCoordinates: true, saveIds: !skipId});

  if (state.id) elem.setAttribute('id', state.id);
  elem.setAttribute('x', `${state.x}`);
  elem.setAttribute('y', `${state.y}`);
  elem.setAttribute('w', `${state.width}`);
  elem.setAttribute('h', `${state.height}`);

  if (state.text) elem.textContent = state.text;
  if (state.collapsed) elem.setAttribute('collapsed', 'true');
  if (state.editable === false) elem.setAttribute('editable', 'false');
  if (state.movable === false) elem.setAttribute('movable', 'false');
  if (state.deletable === false) elem.setAttribute('deletable', 'false');

  decorateElement(elem, state);
  return elem;
}

/**
 * Loads a `<comment>` element as a note.
 *
 * @param elem A `<comment>` element.
 * @param workspace The workspace to load into.
 * @returns The created note.
 */
export function domToNote(
  elem: Element,
  workspace: Blockly.Workspace,
): Note | NoteComment {
  return appendNote(domToNoteState(elem), workspace, {
    // Core's XML loader does not force recordUndo the way the JSON loader
    // does, so honour whatever the caller has set.
    recordUndo: Blockly.Events.getRecordUndo(),
  });
}

/**
 * @param xml An `<xml>` element.
 * @returns Its direct `<comment>` children. Block comments
 *     are nested inside `<block>` and so are untouched.
 */
export function topLevelComments(xml: Element): Element[] {
  return Array.from(xml.childNodes).filter(
    (node): node is Element => node.nodeName.toLowerCase() === 'comment',
  );
}

/**
 * Returns a copy of an `<xml>` element with its top-level comments removed,
 * alongside the removed elements.
 *
 * Loading is delegated to Blockly for everything except comments, and the
 * notes are created afterwards. The caller's DOM is cloned rather than
 * mutated, since callers commonly reuse the same document.
 *
 * @param xml An `<xml>` element.
 * @returns The split.
 */
export function splitComments(xml: Element): {
  stripped: Element;
  comments: Element[];
} {
  const stripped = xml.cloneNode(true) as Element;
  const comments = topLevelComments(stripped);
  for (const elem of comments) stripped.removeChild(elem);
  return {stripped, comments};
}
