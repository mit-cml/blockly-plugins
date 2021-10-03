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
import {Flydown} from './fields/flydown';

/**
 * @param workspace
 */
export function init(workspace) {
  // TODO: Might need the next line
  // Blockly.DropDownDiv.createDom();
  const flydown = new Flydown(
      new Blockly.Options({scrollbars: false}));
  // ***** [lyn, 10/05/2013] NEED TO WORRY ABOUT MULTIPLE BLOCKLIES! *****
  workspace.flydown_ = flydown;
  Blockly.utils.dom.insertAfter(flydown.createDom('g'),
      workspace.svgBubbleCanvas_);
  flydown.init(workspace);
  flydown.autoClose = true; // Flydown closes after selecting a block
}
