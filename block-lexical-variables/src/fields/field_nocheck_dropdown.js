// -*- mode: javascript; js-indent-level: 2; -*-
// Copyright © 2017 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @fileoverview Specialization of Blockly's FieldDropdown to allow setting
 * the value even if it's not one of the dynamically generated options.  We use
 * this in situations where we know that the value will eventually be in the
 * generated set.  This can occur, for example, when we are loading from XML and
 * we have procedure call blocks being created before their respective
 * procedure definition block.
 *
 * @author mark.friedman@gmail.com (Mark Friedman)
 */

'use strict';

import * as Blockly from 'blockly/core';
import '../msg.js';

export class FieldNoCheckDropdown extends Blockly.FieldDropdown {
  constructor(...args) {
    // Call superclass constructor
    super(...args);
  };
}

FieldNoCheckDropdown.prototype.doClassValidation_ = function(opt_newValue) {
  let isValueValid = false;
  const options = this.getOptions(true);
  for (let i = 0, option; (option = options[i]); i++) {
    // Options are tuples of human-readable text and language-neutral values.
    if (option[1] === opt_newValue) {
      isValueValid = true;
      break;
    }
  }
  if (!isValueValid) {
    // Add the value to the cached options array.  Note that this is
    // potentially fragile, as it depends on knowledge of the
    // Blockly.FieldDropdown implementation.
    this.generatedOptions_.push([opt_newValue, opt_newValue]);
  }
  return /** @type {string} */ (opt_newValue);
};

/**
 * Construct a FieldNoCheckDropdown from a JSON arg object.
 * @param {!Object} options A JSON object with options (options).
 * @return {!FieldNoCheckDropdown} The new field instance.
 * @package
 * @nocollapse
 */
FieldNoCheckDropdown.fromJson = function(options) {
  return new FieldNoCheckDropdown(options['options'],
      undefined, options);
};

Blockly.fieldRegistry.register('field_nocheck_dropdown',
    FieldNoCheckDropdown);
