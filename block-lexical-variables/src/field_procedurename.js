// -*- mode: javascript; js-indent-level: 2; -*-
// Copyright © 2017 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Specialization of Blockly's FieldTextInput to handle logic of procedure renaming.
 * @author ewpatton@mit.edu (Evan W. Patton)
 */
'use strict';

import * as Blockly from 'blockly';
import './msg';

// TODO: Maybe make a single importable goog compatibility object
const goog = {
  provide: (_) => {},
  require: (_) => {},
  inherits: Blockly.utils.object.inherits,
  dom: Blockly.utils.dom,
  userAgent: Blockly.utils.userAgent,
  asserts: {
    assertObject: (_) => {},
  },
};

goog.provide('AI.Blockly.FieldProcedureName');

goog.require('Blockly.FieldTextInput');

export const AI = {Blockly: {}};

/**
 * FieldProcedureName is a specialization of {@link Blockly.FieldTextInput} that handles renaming
 * procedures in the {@link AI.Blockly.ProcedureDatabase} when the procedure's name is changed.
 * @param {?string} text
 * @constructor
 */
AI.Blockly.FieldProcedureName = function(text) {
  AI.Blockly.FieldProcedureName.superClass_.constructor.call(this, text,
    Blockly.AIProcedure.renameProcedure);
};
goog.inherits(AI.Blockly.FieldProcedureName, Blockly.FieldTextInput);

/**
 * Set the value of the field.
 *
 * @see Blockly.FieldTextInput.setValue
 * @param {?string} newValue The new value of the field.
 * @override
 */
AI.Blockly.FieldProcedureName.prototype.setValue = function(newValue) {
  var oldValue = this.getValue();
  this.oldName_ = oldValue;
  this.doValueUpdate_(newValue);
  AI.Blockly.FieldProcedureName.superClass_.setValue.call(this, newValue);
  newValue = this.getValue();
  if (typeof newValue === 'string' && this.sourceBlock_) {
    var procDb = this.sourceBlock_.workspace.getProcedureDatabase();
    if (procDb) {
      if (procDb.getProcedure(this.sourceBlock_.id)) {
        procDb.renameProcedure(this.sourceBlock_.id, oldValue, newValue);
      } else {
        procDb.addProcedure(newValue, this.sourceBlock_);
      }
    }
  }
  this.oldName_ = undefined;
};
/*
AI.Blockly.FieldProcedureName.prototype.onHtmlInputChange_ = function(e) {
  if (e.type == 'keypress') {
    console.log('Suppressed keypress event');
    return;  // suppress change handling on key press
  }
  console.log("input's value is " + Blockly.FieldTextInput.htmlInput_.value);
  AI.Blockly.FieldProcedureName.superClass_.onHtmlInputChange_.call(this, e);
};
*/

/**
 * Constructs a FieldProcedureName from a JSON arg object.
 * @param {!Object} options A JSON object with options.
 * @return {AI.Blockly.FieldProcedureName} The new field instance.
 * @package
 * @nocollapse
 */
AI.Blockly.FieldProcedureName.fromJson = function(options) {
  const name = Blockly.utils.replaceMessageReferences(options['name']);
  return new AI.Blockly.FieldProcedureName(name);
};

Blockly.fieldRegistry.register('field_procedurename',
    AI.Blockly.FieldProcedureName);

