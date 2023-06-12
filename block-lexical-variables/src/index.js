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

import {registerCss} from '../src/css.js';
registerCss();
import './utilities.js';
import './workspace.js';
import './procedure_utils.js';
import './fields/flydown.js';
import './fields/field_flydown.js';
import './fields/field_global_flydown.js';
import './fields/field_nocheck_dropdown.js';
import './fields/field_lexical_variable.js';
import './fields/field_parameter_flydown.js';
import './fields/field_procedurename.js';
import './blocks/lexical-variables.js';
import './blocks/controls.js';
import './procedure_database.js';
import './blocks/procedures.js';
import './generators/controls.js';
import './generators/procedures.js';
import './generators/lexical-variables.js';
import * as Blockly from 'blockly/core';
import {Flydown} from './fields/flydown.js';

// Export Flydown and fields for use by plugin users.
// Note that we might eb exporting too much here, but let's see how it goes.
export * from './fields/flydown.js';
export * from './fields/field_flydown.js';
export * from './fields/field_global_flydown.js';
export * from './fields/field_parameter_flydown.js';
export * from './fields/field_lexical_variable.js';
export * from './fields/field_nocheck_dropdown.js';
export * from './fields/field_procedurename.js';

/**
 * @param workspace
 */
export function init(workspace) {
  // TODO: Might need the next line
  // Blockly.DropDownDiv.createDom();
  const flydown = new Flydown(
      new Blockly.Options({
        scrollbars: false,
        rtl: workspace.RTL,
        renderer: workspace.options.renderer,
        rendererOverrides: workspace.options.rendererOverrides,
      })
  );
  // ***** [lyn, 10/05/2013] NEED TO WORRY ABOUT MULTIPLE BLOCKLIES! *****
  workspace.flydown_ = flydown;
  Blockly.utils.dom.insertAfter(flydown.createDom('g'),
      workspace.svgBubbleCanvas_);
  flydown.init(workspace);
  flydown.autoClose = true; // Flydown closes after selecting a block
}
