/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

// TODO: Edit block overview.
/**
 * @fileoverview Block overview.
 */

import {registerCss} from '../src/css';
registerCss();
import './utilities';
import './workspace_svg';
import './procedure_utils';
import './fields/flydown';
import './fields/field_flydown';
import './fields/field_global_flydown';
import './fields/field_nocheck_dropdown';
import './fields/field_lexical_variable';
import './fields/field_parameter_flydown';
import './fields/field_procedurename';
import './blocks/lexical-variables';
import './blocks/controls';
import './procedure_database';
import './blocks/procedures';
import './generators/controls';
import './generators/procedures';
import './generators/lexical-variables';
import * as Blockly from 'blockly';

/**
 * Extend Blockly's hideChaff method with AI2-specific behaviors.
 */
Blockly.hideChaff = (function(func) {
  if (func.isWrapped) {
    return func;
  } else {
    const f = function(...args) {
      const argCopy = Array.prototype.slice.call(args);
      func.apply(this, argCopy);
      // [lyn, 10/06/13] for handling parameter & procedure flydowns
      Blockly.WorkspaceSvg.prototype.hideChaff.call(Blockly.getMainWorkspace(),
          argCopy);
    };
    f.isWrapped = true;
    return f;
  }
})(Blockly.hideChaff);

/**
 * @param workspace
 */
export function init(workspace) {
  // TODO: Might need the next line
  // Blockly.DropDownDiv.createDom();
  const flydown = new Blockly.Flydown(
      new Blockly.Options({scrollbars: false}));
  // ***** [lyn, 10/05/2013] NEED TO WORRY ABOUT MULTIPLE BLOCKLIES! *****
  workspace.flydown_ = flydown;
  Blockly.utils.dom.insertAfter(flydown.createDom('g'),
      workspace.svgBubbleCanvas_);
  flydown.init(workspace);
  flydown.autoClose = true; // Flydown closes after selecting a block
}

// TODO: Remove JSON block definition or convert from JavaScript definitions.
// Blockly.defineBlocksWithJsonArray([
//   {
//     'type': 'global_declaration',
//     'message0': 'block template',
//     'style': 'math_blocks',
//   },
// ]);
