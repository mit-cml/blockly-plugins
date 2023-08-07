/**
 * @fileoverview Control blocks for Blockly, modified for App Inventor.
 * @author fraser@google.com (Neil Fraser)
 * @author andrew.f.mckinney@gmail.com (Andrew F. McKinney)
 * Due to the frequency of long strings, the 80-column wrap rule need not apply
 * to language files.
 */

/**
 * Lyn's History:
 * [lyn, written 11/16-17/13, added 07/01/14] Added freeVariables, renameFree,
 * and renameBound to forRange and forEach loops
 * [lyn, 10/27/13] Specify direction of flydowns
 * [lyn, 10/25/13] Made collapsed block labels more sensible.
 * [lyn, 10/10-14/13]
 *   + Installed flydown index variable declarations in forRange and forEach
 * loops
 *   + Abstracted over string labels on all blocks using constants defined in
 * en/_messages.js
 *   + Renamed "for <i> start [] end [] step []" block to "for each <number>
 * from [] to [] by []"
 *   + Renamed "for each <i> in list []" block to "for each <item> in list []"
 *   + Renamed "choose test [] then-return [] else-return []" to "if [] then []
 * else []"
 *     (TODO: still needs to have a mutator like  the "if" statement blocks).
 *   + Renamed "evaluate" block to "evaluate but ignore result"
 *   + Renamed "do {} then-return []" block to "do {} result []" and re-added
 * this block to the Control drawer (who removed it?)
 *   + Removed get block (still in Variable drawer; no longer needed with
 * parameter flydowns)
 * [lyn, 11/29-30/12]
 *   + Change forEach and forRange loops to take name as input text rather than
 * via plug.
 *   + For these blocks, add extra methods to support renaming.
 */

'use strict';

import * as Blockly from 'blockly/core';
import '../msg.js';
import {FieldParameterFlydown} from '../fields/field_parameter_flydown.js';
import {FieldFlydown} from '../fields/field_flydown.js';
import {
  FieldLexicalVariable,
  LexicalVariable,
} from '../fields/field_lexical_variable.js';
import * as Utilities from '../utilities.js';
import * as Shared from '../shared.js';
import {Substitution} from '../substitution.js'

Blockly.Blocks['controls_forRange'] = {
  // For range.
  category: 'Control',
  helpUrl: Blockly.Msg.LANG_CONTROLS_FORRANGE_HELPURL,
  init: function() {
    // Let the theme determine the color.
    // this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.setStyle('loop_blocks');
    // this.setOutput(true, null);
    // Need to deal with variables here
    // [lyn, 11/30/12] Changed variable to be text input box that does renaming
    // right (i.e., avoids variable capture)
    this.appendValueInput('START')
        .setCheck(Utilities.yailTypeToBlocklyType('number',
            Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_ITEM)
        .appendField(new FieldParameterFlydown(
            Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_VAR, true,
            FieldFlydown.DISPLAY_BELOW), 'VAR')
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_START)
        .setAlign(Blockly.inputs.Align.RIGHT);
    this.appendValueInput('END')
        .setCheck(Utilities.yailTypeToBlocklyType('number',
            Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_END)
        .setAlign(Blockly.inputs.Align.RIGHT);
    this.appendValueInput('STEP')
        .setCheck(Utilities.yailTypeToBlocklyType('number',
            Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_STEP)
        .setAlign(Blockly.inputs.Align.RIGHT);
    this.appendStatementInput('DO')
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_DO)
        .setAlign(Blockly.inputs.Align.RIGHT);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.LANG_CONTROLS_FORRANGE_TOOLTIP);
    this.lexicalVarPrefix = Shared.loopRangeParameterPrefix;
  },
  referenceResults: function(name, prefix, env) {
    let loopVar = this.getFieldValue('VAR');
    // Invariant: Shared.showPrefixToUser must also be true!
    if (Shared.usePrefixInCode) {
      loopVar =
          (Shared.possiblyPrefixMenuNameWith(Shared.loopRangeParameterPrefix))(
              loopVar);
    }
    const newEnv = env.concat([loopVar]);
    const startResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('START'), name, prefix, env);
    const endResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('END'), name, prefix, env);
    const stepResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('STEP'), name, prefix, env);
    const doResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('DO'), name, prefix, newEnv);
    const nextResults = LexicalVariable.referenceResult(
        LexicalVariable.getNextTargetBlock(this), name, prefix, env);
    return [startResults, endResults, stepResults, doResults, nextResults];
  },
  withLexicalVarsAndPrefix: function(child, proc) {
    if (this.getInputTargetBlock('DO') == child) {
      const lexVar = this.getFieldValue('VAR');
      proc(lexVar, this.lexicalVarPrefix);
    }
  },
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  blocksInScope: function() {
    const doBlock = this.getInputTargetBlock('DO');
    if (doBlock) {
      return [doBlock];
    } else {
      return [];
    }
  },
  declaredNames: function() {
    return [this.getFieldValue('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('VAR'))) {
      this.setFieldValue(newName, 'VAR');
    }
  },
  renameBound: function(boundSubstitution, freeSubstitution) {
    LexicalVariable.renameFree(this.getInputTargetBlock('START'),
        freeSubstitution);
    LexicalVariable.renameFree(this.getInputTargetBlock('END'),
        freeSubstitution);
    LexicalVariable.renameFree(this.getInputTargetBlock('STEP'),
        freeSubstitution);
    const oldIndexVar = this.getFieldValue('VAR');
    const newIndexVar = boundSubstitution.apply(oldIndexVar);
    if (newIndexVar !== oldIndexVar) {
      this.renameVar(oldIndexVar, newIndexVar);
      const indexSubstitution = Substitution.simpleSubstitution(
          oldIndexVar, newIndexVar);
      const extendedFreeSubstitution = freeSubstitution.extend(
          indexSubstitution);
      LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          extendedFreeSubstitution);
    } else {
      const removedFreeSubstitution = freeSubstitution.remove([oldIndexVar]);
      LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          removedFreeSubstitution);
    }
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      LexicalVariable.renameFree(nextBlock, freeSubstitution);
    }
  },
  renameFree: function(freeSubstitution) {
    const indexVar = this.getFieldValue('VAR');
    const bodyFreeVars = LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    bodyFreeVars.deleteName(indexVar);
    const renamedBodyFreeVars = bodyFreeVars.renamed(freeSubstitution);
    if (renamedBodyFreeVars.isMember(indexVar)) { // Variable capture!
      const newIndexVar = FieldLexicalVariable.nameNotIn(indexVar,
          renamedBodyFreeVars.toList());
      const boundSubstitution = Substitution.simpleSubstitution(
          indexVar, newIndexVar);
      this.renameBound(boundSubstitution, freeSubstitution);
    } else {
      this.renameBound(new Substitution(), freeSubstitution);
    }
  },
  freeVariables: function() { // return the free variables of this block
    const result = LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    // Remove bound index variable from body free vars
    result.deleteName(this.getFieldValue('VAR'));
    result.unite(LexicalVariable.freeVariables(
        this.getInputTargetBlock('START')));
    result.unite(
        LexicalVariable.freeVariables(this.getInputTargetBlock('END')));
    result.unite(LexicalVariable.freeVariables(
        this.getInputTargetBlock('STEP')));
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      result.unite(LexicalVariable.freeVariables(nextBlock));
    }
    return result;
  },
};

// Alias controls_for to controls_forRange We need this because
// we can't use controls_flow_statements within controls_forRange
// due to Blockly checking
delete Blockly.Blocks['controls_for'];
Blockly.Blocks['controls_for'] = Blockly.Blocks['controls_forRange'];

Blockly.Blocks['controls_forEach'] = {
  // For each loop.
  category: 'Control',
  helpUrl: Blockly.Msg.LANG_CONTROLS_FOREACH_HELPURL,
  init: function() {
    // Let the theme determine the color.
    // this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.setStyle('loop_blocks');
    // this.setOutput(true, null);
    // [lyn, 10/07/13] Changed default name from "i" to "item"
    // [lyn, 11/29/12] Changed variable to be text input box that does renaming
    // right (i.e., avoids variable capture)
    this.appendValueInput('LIST')
        .setCheck(Utilities.yailTypeToBlocklyType('list',
            Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_ITEM)
        .appendField(new FieldParameterFlydown(
            Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_VAR,
            true, FieldFlydown.DISPLAY_BELOW), 'VAR')
        .appendField(Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_INLIST)
        .setAlign(Blockly.inputs.Align.RIGHT);
    this.appendStatementInput('DO')
        .appendField(Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_DO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.LANG_CONTROLS_FOREACH_TOOLTIP);
    this.lexicalVarPrefix = Shared.loopParameterPrefix;
  },
  referenceResults: function(name, prefix, env) {
    let loopVar = this.getFieldValue('VAR');
    // Invariant: Shared.showPrefixToUser must also be true!
    if (Shared.usePrefixInCode) {
      loopVar = (Shared.possiblyPrefixMenuNameWith(Shared.loopParameterPrefix))(
          loopVar);
    }
    const newEnv = env.concat([loopVar]);
    const listResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('LIST'), name, prefix, env);
    const doResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('DO'), name, prefix, newEnv);
    const nextResults = LexicalVariable.referenceResult(
        LexicalVariable.getNextTargetBlock(this), name, prefix, env);
    return [listResults, doResults, nextResults];
  },
  withLexicalVarsAndPrefix:
    Blockly.Blocks.controls_forRange.withLexicalVarsAndPrefix,
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  blocksInScope: function() {
    const doBlock = this.getInputTargetBlock('DO');
    if (doBlock) {
      return [doBlock];
    } else {
      return [];
    }
  },
  declaredNames: function() {
    return [this.getFieldValue('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('VAR'))) {
      this.setFieldValue(newName, 'VAR');
    }
  },
  renameBound: function(boundSubstitution, freeSubstitution) {
    LexicalVariable.renameFree(this.getInputTargetBlock('LIST'),
        freeSubstitution);
    const oldIndexVar = this.getFieldValue('VAR');
    const newIndexVar = boundSubstitution.apply(oldIndexVar);
    if (newIndexVar !== oldIndexVar) {
      this.renameVar(oldIndexVar, newIndexVar);
      const indexSubstitution = Substitution.simpleSubstitution(
          oldIndexVar, newIndexVar);
      const extendedFreeSubstitution = freeSubstitution.extend(
          indexSubstitution);
      LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          extendedFreeSubstitution);
    } else {
      const removedFreeSubstitution = freeSubstitution.remove([oldIndexVar]);
      LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          removedFreeSubstitution);
    }
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      LexicalVariable.renameFree(nextBlock, freeSubstitution);
    }
  },
  renameFree: function(freeSubstitution) {
    const indexVar = this.getFieldValue('VAR');
    const bodyFreeVars = LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    bodyFreeVars.deleteName(indexVar);
    const renamedBodyFreeVars = bodyFreeVars.renamed(freeSubstitution);
    if (renamedBodyFreeVars.isMember(indexVar)) { // Variable capture!
      const newIndexVar = FieldLexicalVariable.nameNotIn(indexVar,
          renamedBodyFreeVars.toList());
      const boundSubstitution = Substitution.simpleSubstitution(
          indexVar, newIndexVar);
      this.renameBound(boundSubstitution, freeSubstitution);
    } else {
      this.renameBound(new Substitution(), freeSubstitution);
    }
  },
  freeVariables: function() { // return the free variables of this block
    const result = LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    // Remove bound index variable from body free vars
    result.deleteName(this.getFieldValue('VAR'));
    result.unite(LexicalVariable.freeVariables(
        this.getInputTargetBlock('LIST')));
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      result.unite(LexicalVariable.freeVariables(nextBlock));
    }
    return result;
  },
};

Blockly.Blocks['controls_do_then_return'] = {
  // String length.
  category: 'Control',
  helpUrl: Blockly.Msg.LANG_CONTROLS_DO_THEN_RETURN_HELPURL,
  init: function() {
    // this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.setStyle('loop_blocks');
    this.appendStatementInput('STM')
        .appendField(Blockly.Msg.LANG_CONTROLS_DO_THEN_RETURN_INPUT_DO);
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.LANG_CONTROLS_DO_THEN_RETURN_INPUT_RETURN)
        .setAlign(Blockly.inputs.Align.RIGHT);
    this.setOutput(true, null);
    this.setTooltip(Blockly.Msg.LANG_CONTROLS_DO_THEN_RETURN_TOOLTIP);
  },
};

