/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Block test.
 */

import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import {createPlayground} from '@blockly/dev-tools';
import {LexicalVariablesPlugin} from '../src/index.js';
import '../src/blocks.js';

// TODO: Edit list of blocks.
const allBlocks = [
  'global_declaration',
  'controls_for',
  'controls_forRange',
  'controls_forEach',
  // 'controls_flow_statements',
  'local_declaration_statement',
  'simple_local_declaration_statement',
  'local_declaration_expression',
  'controls_do_then_return',
  // 'procedures_defnoreturn',
  // 'procedures_callnoreturn',
  // 'procedures_defreturn',
  // 'procedures_callreturn',
];

/**
 * Create a workspace.
 * @param {HTMLElement} blocklyDiv The blockly container div.
 * @param {!Blockly.BlocklyOptions} options The Blockly options.
 * @return {!Blockly.WorkspaceSvg} The created workspace.
 */
function createWorkspace(blocklyDiv, options) {
  const workspace = Blockly.inject(blocklyDiv, options);
  LexicalVariablesPlugin.init(workspace, {disableInvalidBlocks: true});
  return workspace;
}

Blockly.setLocale(En);
document.addEventListener('DOMContentLoaded', function() {
  const defaultOptions = {
    toolbox: `<xml xmlns="https://developers.google.com/blockly/xml">
      <category  colour="370" name="Misc. Blocks">
        ${allBlocks.map((b) => `<block type="${b}"></block>`)}
      </category>
      <sep></sep>
      <category id="catVariables" colour="330" name="Variables">
        <block type="global_declaration"></block>
        <block type="simple_local_declaration_statement"></block>
        <block type="local_declaration_statement"></block>
        <block type="local_declaration_expression"></block>
        <block type="lexical_variable_get"></block>
        <block type="lexical_variable_set"></block>
      </category>
      <category
        id="catFunctions" colour="290" custom="PROCEDURE" name="Functions"
      ></category>
    </xml>`,
    collapse: true,
  };
  createPlayground(document.getElementById('root'), createWorkspace,
      defaultOptions);
});
