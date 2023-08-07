// -*- mode: java; c-basic-offset: 2; -*-
// Copyright © 2013-2016 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @license
 * @fileoverview Editable parameter field with flydown menu of a getter and
 *   setter block.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

'use strict';

import * as Blockly from 'blockly/core';
import '../msg.js';
import {FieldFlydown} from './field_flydown.js';
import {LexicalVariable} from './field_lexical_variable.js';

/**
 * Class for a parameter declaration field with flyout menu of getter/setter
 * blocks on mouse over.
 * @param {string} name The initial parameter name in the field.
 * @param {boolean} isEditable Indicates whether the the name in the flydown is
 *     editable.
 * @param {?string=} opt_displayLocation The location to display the flydown at
 *     Either: FieldFlydown.DISPLAY_BELOW,
 *             FieldFlydown.DISPLAY_RIGHT
 *     Defaults to DISPLAY_RIGHT.
 * @param {?function=} opt_additionalChangeHandler A one-arg function indicating
 *     what to do in addition to renaming lexical variables. May be
 *     null/undefined to indicate nothing extra to be done.
 * @extends {FieldFlydown}
 * @constructor
 */
// [lyn, 10/26/13] Added opt_additionalChangeHandler to handle propagation of
//    renaming of proc decl params
export class FieldParameterFlydown extends FieldFlydown {
  constructor(name, isEditable, opt_displayLocation, opt_additionalChangeHandler) {
    const changeHandler = function(text) {
      if (!FieldParameterFlydown.changeHandlerEnabled) {
        return text;
      }

      // Both of these should be called in the context of the field (ie
      // 'this').
      const possiblyRenamedText =
          LexicalVariable.renameParam.call(this, text);
      if (opt_additionalChangeHandler) {
        opt_additionalChangeHandler.call(this, possiblyRenamedText);
      }
      return possiblyRenamedText;
    };

    super(name, isEditable, opt_displayLocation, changeHandler);
  };
}

FieldParameterFlydown.prototype.fieldCSSClassName =
    'blocklyFieldParameter';

FieldParameterFlydown.prototype.flyoutCSSClassName =
    'blocklyFieldParameterFlydown';

// [lyn, 07/02/14] Added this flag to control changeHandler
//   There are several spots where we want to disable the changeHandler to avoid
//   unwanted calls to renameParam, such as when these fields are deleted and
//   then readded in updates to procedures and local variable declarations.
FieldParameterFlydown.changeHandlerEnabled = true;

// [lyn, 07/02/14] Execute thunk with changeHandler disabled
FieldParameterFlydown.withChangeHanderDisabled = function(thunk) {
  const oldFlag = FieldParameterFlydown.changeHandlerEnabled;
  FieldParameterFlydown.changeHandlerEnabled = false;
  try {
    thunk();
  } finally {
    FieldParameterFlydown.changeHandlerEnabled = oldFlag;
  }
};

/**
 * Returns the stringified xml representation of the blocks we want to have in
 * the flydown. In this case a variable getter and a variable setter.
 * @return {string} The stringified XML.
 */
FieldParameterFlydown.prototype.flydownBlocksXML_ = function() {
  // TODO: Refactor this to use getValue() instead of getText(). getText()
  //   refers to the view, while getValue refers to the model (in MVC terms).

  // Name in this parameter field.
  const name = this.getText();
  const getterSetterXML =
      '<xml>' +
      '<block type="lexical_variable_get">' +
      '<field name="VAR">' +
      name +
      '</field>' +
      '</block>' +
      '<block type="lexical_variable_set">' +
      '<field name="VAR">' +
      name +
      '</field>' +
      '</block>' +
      '</xml>';
  return getterSetterXML;
};

/**
 * [lyn, 10/24/13]
 * Add an option for toggling horizontal vs. Vertical placement of parameter
 * lists on the given block. Put before "Collapse Block in uncollapsed block"
 * [lyn, 10/27/13] Also remove any "Inline Inputs" option, since vertical
 * params
 * doesn't interact well with it (in procedures_defreturn).
 * @param block
 * @param options
 */
FieldParameterFlydown.addHorizontalVerticalOption = function(
    block, options) {
  let numParams = 0;
  if (block.getParameters) {
    numParams = block.getParameters().length;
  }
  if (block.isCollapsed() || numParams <= 0) {
    return;
  }

  const horizVertOption = {
    enabled: true,
    text: block.horizontalParameters ?
        Blockly.Msg.VERTICAL_PARAMETERS :
        Blockly.Msg.HORIZONTAL_PARAMETERS,
    callback: function() {
      // TODO: We should force the inputs to be external when we do this.
      //   If someone sets the inputs inline and then sets the parameters to
      //   vertical we get the same visual bug as 10/27/13.
      block.setParameterOrientation(!block.horizontalParameters);
    },
  };

  // Find the index of "Collapse Block" and insert this option before it.
  let insertionIndex = 0;
  for (let option; option = options[insertionIndex]; insertionIndex++) {
    if (option.text == Blockly.Msg.COLLAPSE_BLOCK) {
      break;
    }
  }
  // Insert even if we didn't find the option.
  options.splice(insertionIndex, 0, horizVertOption);

  // Remove an "Inline Inputs" option (if there is one).
  for (let i = 0, option; option = options[i]; i++) {
    if (option.text == Blockly.Msg.INLINE_INPUTS) {
      options.splice(i, 1);
      break;
    }
  }
};

/**
 * Constructs a FieldParameterFlydown from a JSON arg object.
 * @param {!Object} options A JSON object with options.
 * @return {FieldParameterFlydown} The new field instance.
 * @package
 * @nocollapse
 */
FieldParameterFlydown.fromJson = function(options) {
  const name = Blockly.utils.replaceMessageReferences(options['name']);
  return new FieldParameterFlydown(name, options['is_editable']);
};

Blockly.fieldRegistry.register('field_parameter_flydown',
    FieldParameterFlydown);


