/**
 * @fileoverview Wrapping the `Blockly.Xml` entry points so notes survive an
 * XML round trip.
 *
 * Without this a note saved through `Blockly.Xml.workspaceToDom` would
 * silently lose its title, colour, pinned state and metadata, and would load
 * back as a plain comment — `Xml.loadWorkspaceComment` hardcodes
 * `new RenderedWorkspaceComment(...)` instead of going through
 * `workspace.newComment()`, so the plugin's usual hook does not reach it.
 *
 * There is no registry for XML the way there is for JSON serializers, so the
 * exports on the `Blockly.Xml` namespace are wrapped instead. Each has to be
 * wrapped individually: Blockly's own `appendDomToWorkspace` and
 * `clearWorkspaceAndLoadFromXml` call `domToWorkspace` through a module-local
 * binding, so patching that one export does not reach them.
 *
 * Like the other registries this touches, `Blockly.Xml` is global while the
 * plugin is per-workspace, so the wrappers are reference-counted.
 */

import * as Blockly from 'blockly/core';

import {isNote} from '../../utils/guards';
import {asOneUndoStep} from '../../utils/undo';
import {saveNote} from '../state';
import {
  decorateElement,
  domToNote,
  noteToDom,
  splitComments,
  topLevelComments,
} from './dom';

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
    return asOneUndoStep(() => {
      const blockIds = load.call(Xml, stripped, workspace);
      for (const elem of comments) domToNote(elem, workspace);
      return blockIds;
    });
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
