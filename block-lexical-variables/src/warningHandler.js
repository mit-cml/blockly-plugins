// -*- mode: javascript; c-basic-offset: 2; -*-
// Copyright © 2013-2016 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * Methods to handle warnings in the block editor.
 *
 * @author mckinney@mit.edu (Andrew F. McKinney)
 * @author mark.friedman@gmail.com (Mark Friedman)
 */

'use strict';

import * as Blockly from 'blockly/core';
import './msg.js';

/**
 * Takes a block as the context (this), puts the appropriate error or warning
 * on the block.
 * @param {Blockly.Block} block The block to check for errors.
 */
export const checkErrors = function(block) {
  if ((block.getSvgRoot && !block.getSvgRoot()) || block.readOnly) {
    // remove from error count
    if (block.hasWarning) {
      block.hasWarning = false;
    }
    if (block.hasError) {
      block.hasError = false;
    }
    return;
  }

  // give the block empty arrays of errors and warnings to check if they aren't
  // defined.
  if (!block.errors) {
    block.errors = [];
  }
  if (!block.warnings) {
    block.warnings = [];
  }

  // add warnings and errors that are on every block
  const errorTestArray = block.errors;
  const warningTestArray = block.warnings;

  // check if there are any errors
  for (let i=0; i<errorTestArray.length; i++) {
    if (errorTestArray[i].func &&
      errorTestArray[i].func.call(this, block, errorTestArray[i])) {
      if (!block.hasError) {
        block.hasError = true;
      }
      if (block.hasWarning) {
        block.hasWarning = false;
      }
      return;
    }
  }

  if (block.hasError) {
    block.hasError = false;
  }
  // if there are no errors, check for warnings
  for (let i=0; i<warningTestArray.length; i++) {
    if (warningTestArray[i].func &&
      warningTestArray[i].func.call(this, block, warningTestArray[i])) {
      if (!block.hasWarning) {
        block.hasWarning = true;
      }
      return;
    }
  }

  // remove the warning icon, if there is one
  if (block.warning) {
    block.setWarningText(null);
  }
  if (block.hasWarning) {
    block.hasWarning = false;
  }
};


// Errors

// Errors indicate that the project will not run
// Each function returns true if there is an error, and sets the error text on
// the block

// Check if the block is inside of a variable declaration block, if so, create
// an error
export const checkIsInDefinition = function(block) {
  // Allow property getters as they should be pure.
  const rootBlock = block.getRootBlock();
  if (rootBlock.type === 'global_declaration') {
    const errorMessage = Blockly.Msg.ERROR_BLOCK_CANNOT_BE_IN_DEFINITION;
    block.setWarningText(errorMessage);
    return true;
  } else {
    return false;
  }
};


// Check if the block has an invalid drop down value, if so, create an error
export const checkDropDownContainsValidValue = function(block, params) {
  if (block.workspace.isDragging && block.workspace.isDragging()) {
    return false; // wait until the user is done dragging to check validity.
  }
  for (let i=0; i<params.dropDowns.length; i++) {
    const dropDown = block.getField(params.dropDowns[i]);
    const dropDownList = dropDown.menuGenerator_();
    const text = dropDown.getText();
    const value = dropDown.getValue();
    let textInDropDown = false;
    if (dropDown.updateMutation) {
      dropDown.updateMutation();
    }
    for (let k=0; k<dropDownList.length; k++) {
      if (dropDownList[k][1] === value && value !== ' ') {
        textInDropDown = true;
        // A mismatch in the untranslated value and translated text can be
        // corrected.
        if (dropDownList[k][0] !== text) {
          dropDown.setValue(dropDownList[k][0]);
        }
        break;
      }
    }
    if (!textInDropDown) {
      const errorMessage = Blockly.Msg.ERROR_SELECT_VALID_ITEM_FROM_DROPDOWN;
      block.setWarningText(errorMessage);
      return true;
    }
  }
  return false;
};
