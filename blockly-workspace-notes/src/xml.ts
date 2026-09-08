/**
 * @fileoverview XML serialization for notes, for hosts still on the older
 * `Blockly.Xml` API.
 *
 * Blockly 13 still writes and reads workspace comments as XML, so without
 * this a note saved through `Blockly.Xml.workspaceToDom` would silently lose
 * its title, colour, pinned state and metadata, and would load back as a
 * plain comment — `Xml.loadWorkspaceComment` hardcodes
 * `new RenderedWorkspaceComment(...)` instead of going through
 * `workspace.newComment()`, so the plugin's usual hook does not reach it.
 *
 * There is no registry for XML the way there is for JSON serializers, so the
 * entry points on the `Blockly.Xml` namespace are wrapped instead. Each has to
 * be wrapped individually: Blockly's own `appendDomToWorkspace` and
 * `clearWorkspaceAndLoadFromXml` call `domToWorkspace` through a module-local
 * binding, so patching that one export does not reach them.
 *
 * Everything here funnels through the same state objects the JSON serializer
 * uses, so the two formats cannot drift apart.
 */

import * as Blockly from 'blockly/core';

import type {SavedNote} from './types';
import {Note, NoteComment, isNote} from './note';
import {appendNote, saveNote} from './serializer';

/** The entry points wrapped on the Blockly.Xml namespace. */
const PATCHED = [
  'workspaceToDom',
  'domToWorkspace',
  'appendDomToWorkspace',
  'clearWorkspaceAndLoadFromXml',
  'saveWorkspaceComment',
  'loadWorkspaceComment',
] as const;

/** One of the six names above. */
type PatchedName = (typeof PATCHED)[number];

/** The six entry points, as a writable record. */
type PatchedXml = {-readonly [K in PatchedName]: (typeof Blockly.Xml)[K]};

/**
 * `Blockly.Xml` is an ES module namespace object, so TypeScript treats its
 * members as read-only. Replacing them is exactly what this module does —
 * there is no registry for XML the way there is for JSON serializers — so the
 * namespace is viewed through one mutable alias, declared once, here. Each
 * assignment below is still checked against Blockly's real signature.
 */
const Xml = Blockly.Xml as typeof Blockly.Xml & PatchedXml;

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
function decorateElement(elem: Element, state: SavedNote): void {
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
  const state: SavedNote = {} as SavedNote;

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
function topLevelComments(xml: Element): Element[] {
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
function splitComments(xml: Element): {stripped: Element; comments: Element[]} {
  const stripped = xml.cloneNode(true) as Element;
  const comments = topLevelComments(stripped);
  for (const elem of comments) stripped.removeChild(elem);
  return {stripped, comments};
}

/** The original Blockly.Xml functions, kept so they can be restored. */
let originals: PatchedXml | null = null;

/**
 * Reference count, since Blockly.Xml is global but the plugin is per
 * workspace: the wrappers stay in place until the last instance goes away.
 */
let registrationCount = 0;

/**
 * Wraps the Blockly.Xml entry points so notes survive an XML round trip.
 */
export function registerXmlSupport(): void {
  if (registrationCount++) return;

  originals = {
    workspaceToDom: Xml.workspaceToDom,
    domToWorkspace: Xml.domToWorkspace,
    appendDomToWorkspace: Xml.appendDomToWorkspace,
    clearWorkspaceAndLoadFromXml: Xml.clearWorkspaceAndLoadFromXml,
    saveWorkspaceComment: Xml.saveWorkspaceComment,
    loadWorkspaceComment: Xml.loadWorkspaceComment,
  };
  // Captured non-null: the wrappers below only exist while this is populated,
  // which the module-level `let` cannot express.
  const saved = originals;

  /**
   * Runs a load through Blockly with comments held back, then adds the notes.
   * Wrapped in one event group so a whole XML load is a single undo step;
   * Blockly's own loader reuses an open group rather than starting its own.
   *
   * @param load The original Blockly loader to delegate to.
   * @param xml The XML being loaded.
   * @param workspace The target workspace.
   * @returns The new block IDs, from Blockly.
   */
  const loadWithNotes = <W extends Blockly.Workspace>(
    load: (xml: Element, workspace: W) => string[],
    xml: Element,
    workspace: W,
  ): string[] => {
    const {stripped, comments} = splitComments(xml);
    const existingGroup = Blockly.Events.getGroup();
    if (!existingGroup) Blockly.Events.setGroup(true);
    try {
      const blockIds = load.call(Xml, stripped, workspace);
      for (const elem of comments) domToNote(elem, workspace);
      return blockIds;
    } finally {
      Blockly.Events.setGroup(existingGroup);
    }
  };

  Xml.workspaceToDom = function (workspace, skipId = false) {
    const dom = saved.workspaceToDom.call(Xml, workspace, skipId);
    // Blockly emits one <comment> per top comment, in this same order, so the
    // two line up by index. Only extra attributes are added, leaving Blockly's
    // own output — including its RTL handling — exactly as it was.
    const notes = workspace.getTopComments();
    topLevelComments(dom).forEach((elem, i) => {
      const note = notes[i];
      if (isNote(note)) {
        decorateElement(elem, saveNote(note, {addCoordinates: true}));
      }
    });
    return dom;
  };

  Xml.domToWorkspace = function (xml, workspace) {
    return loadWithNotes(saved.domToWorkspace, xml, workspace);
  };

  // Blockly's own versions of these two reach domToWorkspace through a
  // module-local binding, so the patch above never runs for them. Delegating
  // the stripped XML to the originals keeps their extra behaviour — the
  // block-offset maths in append, the clear in the other — intact.
  Xml.appendDomToWorkspace = function (xml, workspace) {
    return loadWithNotes(saved.appendDomToWorkspace, xml, workspace);
  };

  Xml.clearWorkspaceAndLoadFromXml = function (xml, workspace) {
    return loadWithNotes(saved.clearWorkspaceAndLoadFromXml, xml, workspace);
  };

  // Direct callers of the per-comment helpers get note support too.
  Xml.saveWorkspaceComment = function (comment, skipId = false) {
    return isNote(comment)
      ? noteToDom(comment, skipId)
      : saved.saveWorkspaceComment.call(Xml, comment, skipId);
  };

  Xml.loadWorkspaceComment = function (elem, workspace) {
    return domToNote(elem, workspace);
  };
}

/**
 * Puts one saved function back.
 *
 * Generic so the assignment is `PatchedXml[K] = PatchedXml[K]` for a single
 * `K`, which TypeScript accepts; indexing with the whole union would not
 * correlate the two sides.
 *
 * @param name Which entry point to restore.
 * @param saved The saved originals.
 */
function restoreOne<K extends PatchedName>(name: K, saved: PatchedXml): void {
  const target: PatchedXml = Xml;
  target[name] = saved[name];
}

/** Restores Blockly's own XML functions. */
export function unregisterXmlSupport(): void {
  if (--registrationCount > 0) return;
  registrationCount = 0;
  if (!originals) return;
  for (const name of PATCHED) restoreOne(name, originals);
  originals = null;
}
