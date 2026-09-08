/**
 * @fileoverview Playground for the workspace notes plugin.
 *
 * Rendered behaviour (dragging, resizing, the title in the top bar, the
 * colour swatches) cannot be covered by the headless mocha tests, so this
 * page is where it gets exercised. The "Save notes" / "Load notes" actions
 * make the round-trip visible without opening devtools.
 */

import * as Blockly from 'blockly';
import {toolboxCategories, createPlayground} from '@blockly/dev-tools';

import {WorkspaceNotes} from '../src/index';

/** Holds the most recent save, so Load can restore it. */
let savedState = null;

/** The most recent XML save, for the XML round-trip actions. */
let savedXml = null;

/**
 * Creates a workspace with the notes plugin attached.
 *
 * @param {HTMLElement} blocklyDiv The blockly container div.
 * @param {!Blockly.BlocklyOptions} options The Blockly options.
 * @returns {!Blockly.WorkspaceSvg} The created workspace.
 */
function createWorkspace(blocklyDiv, options) {
  const workspace = Blockly.inject(blocklyDiv, options);

  const notes = new WorkspaceNotes(workspace, {
    getAuthor: () => 'playground',
  });
  notes.init();

  // Handy for poking at things from the browser console.
  globalThis.notesPlugin = notes;

  return workspace;
}

document.addEventListener('DOMContentLoaded', function () {
  const defaultOptions = {
    toolbox: toolboxCategories,
  };

  createPlayground(
    document.getElementById('root'),
    createWorkspace,
    defaultOptions,
  ).then((playground) => {
    playground.addAction('Add note', (workspace) => {
      globalThis.notesPlugin.createNote({
        title: 'Note',
        text: 'Say something...',
        x: 40,
        y: 40,
      });
      console.log(
        'Notes on workspace:',
        workspace.getTopComments(false).length,
      );
    });

    playground.addAction('Save notes', (workspace) => {
      savedState = Blockly.serialization.workspaces.save(workspace);
      console.log(JSON.stringify(savedState, null, 2));
      console.log(
        'workspaceComments key present:',
        Object.hasOwn(savedState, 'workspaceComments'),
        '| notes saved:',
        savedState.workspaceNotes?.notes.length ?? 0,
      );
    });

    playground.addAction('Load notes', (workspace) => {
      if (!savedState) {
        console.warn('Nothing saved yet — press "Save notes" first.');
        return;
      }
      Blockly.serialization.workspaces.load(savedState, workspace);
      console.log(
        'Notes after reload:',
        workspace.getTopComments(false).length,
      );
    });

    playground.addAction('Save notes as XML', (workspace) => {
      savedXml = Blockly.Xml.domToPrettyText(
        Blockly.Xml.workspaceToDom(workspace),
      );
      console.log(savedXml);
    });

    playground.addAction('Load notes from XML', (workspace) => {
      if (!savedXml) {
        console.warn('Nothing saved yet — press "Save notes as XML" first.');
        return;
      }
      Blockly.Xml.clearWorkspaceAndLoadFromXml(
        Blockly.utils.xml.textToDom(savedXml),
        workspace,
      );
      console.log(
        'Notes after XML reload:',
        workspace.getTopComments(false).length,
      );
    });

    playground.addAction('Load a legacy file', (workspace) => {
      // No `workspaceNotes` key at all: what plain Blockly would have written.
      Blockly.serialization.workspaces.load(
        {
          workspaceComments: [
            {
              id: 'legacy1',
              x: 60,
              y: 220,
              width: 220,
              height: 110,
              text: 'Saved before this plugin existed.',
            },
          ],
        },
        workspace,
      );
      console.log(
        'Loaded legacy comment as a note:',
        workspace.getCommentById('legacy1')?.constructor.name,
      );
    });
  });
});
