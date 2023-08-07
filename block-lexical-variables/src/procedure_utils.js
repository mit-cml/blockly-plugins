// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Visual blocks editor for App Inventor
 * Methods to handle serialization of the blocks workspace.
 *
 * @author sharon@google.com (Sharon Perl)
 */

'use strict';

import * as Blockly from 'blockly/core';
import './msg.js';
import {
  FieldLexicalVariable,
  LexicalVariable,
} from './fields/field_lexical_variable.js';

const procDefaultValue = ['', ''];

export const onChange = function(procedureId) {
  let workspace = this.block.workspace.getTopWorkspace();
  // [lyn, 10/14/13] .editable is undefined on blocks. Changed to .editable_
  if (!this.block.isEditable()) {
    workspace = Blockly.Drawer.flyout_.workspace_;
    return;
  }

  const def = workspace.getProcedureDatabase().getProcedure(procedureId);
  // loading but the definition block hasn't been processed yet.
  if (!def) return;
  const text = def.getFieldValue('NAME');
  if (text == '' || text != this.getValue()) {
    for (let i=0; this.block.getInput('ARG' + i) != null; i++) {
      this.block.removeInput('ARG' + i);
    }
    // return;
  }
  this.doValueUpdate_(text);
  if (def) {
    // [lyn, 10/27/13] Lyn sez: this causes complications (e.g., might open up
    // mutator on collapsed procedure declaration block) and is no longer
    // necessary with changes to setProedureParameters.
    // if(def.paramIds_ == null){
    //  def.mutator.setVisible(true);
    //  def.mutator.shouldHide = true;
    // }
    // It's OK if def.paramIds is null
    this.block.setProcedureParameters(def.arguments_, def.paramIds_, true);
  }
};

export const getProcedureNames = function(returnValue, opt_workspace) {
  const workspace = opt_workspace || Blockly.common.getMainWorkspace();
  const topBlocks = workspace.getTopBlocks();
  const procNameArray = [procDefaultValue];
  for (let i=0; i<topBlocks.length; i++) {
    const procName = topBlocks[i].getFieldValue('NAME');
    if (topBlocks[i].type == 'procedures_defnoreturn' && !returnValue) {
      procNameArray.push([procName, procName]);
    } else if (topBlocks[i].type == 'procedures_defreturn' && returnValue) {
      procNameArray.push([procName, procName]);
    }
  }
  if (procNameArray.length > 1 ) {
    procNameArray.splice(0, 1);
  }
  return procNameArray;
};

// [lyn, 10/22/13] Return a list of all procedure declaration blocks
// If returnValue is false, lists all fruitless procedure declarations
// (defnoreturn) If returnValue is true, lists all fruitful procedure
// declaraations (defreturn)
export const getProcedureDeclarationBlocks = function(returnValue,
    opt_workspace) {
  const workspace = opt_workspace || Blockly.common.getMainWorkspace();
  const topBlocks = workspace.getTopBlocks(false);
  const blockArray = [];
  for (let i=0; i<topBlocks.length; i++) {
    if (topBlocks[i].type == 'procedures_defnoreturn' && !returnValue) {
      blockArray.push(topBlocks[i]);
    } else if (topBlocks[i].type == 'procedures_defreturn' && returnValue) {
      blockArray.push(topBlocks[i]);
    }
  }
  return blockArray;
};

export const getAllProcedureDeclarationBlocksExcept = function(block) {
  const topBlocks = block.workspace.getTopBlocks(false);
  const blockArray = [];
  for (let i=0; i<topBlocks.length; i++) {
    if (topBlocks[i].type === 'procedures_defnoreturn' ||
        topBlocks[i].type === 'procedures_defreturn') {
      if (topBlocks[i] !== block) {
        blockArray.push(topBlocks[i]);
      }
    }
  }
  return blockArray;
};

export const removeProcedureValues = function(name, workspace) {
  if (workspace && // [lyn, 04/13/14] ensure workspace isn't undefined
      workspace === Blockly.common.getMainWorkspace()) {
    const blockArray = workspace.getAllBlocks();
    for (let i=0; i<blockArray.length; i++) {
      const block = blockArray[i];
      if (block.type == 'procedures_callreturn' ||
          block.type == 'procedures_callnoreturn') {
        if (block.getFieldValue('PROCNAME') == name) {
          block.removeProcedureValue();
        }
      }
    }
  }
};

// [lyn, 10/27/13] Defined as a replacement for Blockly.Procedures.rename
/**
 * Rename a procedure definition to a new name.
 *
 * @this FieldProcedureName
 * @param {!string} newName New name for the procedure represented by the
 *     field's source block.
 * @return {string} The new, validated name of the block.
 */
export const renameProcedure = function(newName) {
  // this is bound to field_textinput object
  const oldName = this.oldName_ || this.getValue();
  const originalNewName = newName;

  // [lyn, 10/27/13] now check legality of identifiers
  newName = LexicalVariable.makeLegalIdentifier(newName);

  // [lyn, 10/28/13] Prevent two procedures from having the same name.
  const procBlocks = getAllProcedureDeclarationBlocksExcept(
      this.sourceBlock_);
  const procNames = procBlocks.map(function(decl) {
    return decl.getFieldValue('NAME');
  });
  newName = FieldLexicalVariable.nameNotIn(newName, procNames);
  if (newName !== originalNewName) {
    this.doValueUpdate_(newName);
  }
  // Rename any callers.
  const blocks = this.sourceBlock_.workspace.getAllBlocks();
  for (let x = 0; x < blocks.length; x++) {
    const func = blocks[x].renameProcedure;
    if (func) {
      func.call(blocks[x], oldName, newName);
    }
  }
  this.oldName_ = newName;
  return newName;
};
