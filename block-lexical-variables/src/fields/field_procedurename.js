// -*- mode: javascript; js-indent-level: 2; -*-
// Copyright © 2017 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Specialization of Blockly's FieldTextInput to handle logic of
 *     procedure renaming.
 * @author ewpatton@mit.edu (Evan W. Patton)
 */
'use strict';

import * as Blockly from 'blockly';
import '../msg';
import * as ProcedureUtils from '../procedure_utils';

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

/**
 * FieldProcedureName is a specialization of {@link Blockly.FieldTextInput}
 * that handles renaming procedures in the {@link ProcedureDatabase}
 * when the procedure's name is changed.
 * @param {?string} text
 * @constructor
 */
export const FieldProcedureName = function(text) {
  FieldProcedureName.superClass_.constructor.call(this, text,
      ProcedureUtils.renameProcedure);
};
Blockly.utils.object.inherits(FieldProcedureName, Blockly.FieldTextInput);

/**
 * Set the value of the field.
 *
 * @see Blockly.FieldTextInput.setValue
 * @param {?string} newValue The new value of the field.
 * @override
 */
FieldProcedureName.prototype.setValue = function(newValue) {
  const oldValue = this.getValue();
  this.oldName_ = oldValue;
  this.doValueUpdate_(newValue);
  FieldProcedureName.superClass_.setValue.call(this, newValue);
  newValue = this.getValue();
  if (typeof newValue === 'string' && this.sourceBlock_) {
    const procDb = this.sourceBlock_.workspace.getProcedureDatabase();
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
FieldProcedureName.prototype.onHtmlInputChange_ = function(e) {
  if (e.type == 'keypress') {
    console.log('Suppressed keypress event');
    return;  // suppress change handling on key press
  }
  console.log("input's value is " + Blockly.FieldTextInput.htmlInput_.value);
  FieldProcedureName.superClass_.onHtmlInputChange_.call(this, e);
};
*/

/**
 * Constructs a FieldProcedureName from a JSON arg object.
 * @param {!Object} options A JSON object with options.
 * @return {FieldProcedureName} The new field instance.
 * @package
 * @nocollapse
 */
FieldProcedureName.fromJson = function(options) {
  const name = Blockly.utils.replaceMessageReferences(options['name']);
  return new FieldProcedureName(name);
};

Blockly.fieldRegistry.register('field_procedurename',
    FieldProcedureName);

