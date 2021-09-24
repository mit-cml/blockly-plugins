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

import * as Blockly from 'blockly';
import './msg';

// TODO: Maybe make a single importable goog compatibility object
const goog = {
  provide: (_) => {
  },
  require: (_) => {
  },
  inherits: Blockly.utils.object.inherits,
  dom: Blockly.utils.dom,
  userAgent: Blockly.utils.userAgent,
  asserts: {
    assertObject: (_) => {
    },
  },
};

goog.provide('Blockly.Blocks.control');

goog.require('Blockly.Blocks.Utilities');

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
        .setCheck(Blockly.Blocks.Utilities.yailTypeToBlocklyType('number',
            Blockly.Blocks.Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_ITEM)
        .appendField(new Blockly.FieldParameterFlydown(
            Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_VAR, true,
            Blockly.FieldFlydown.DISPLAY_BELOW), 'VAR')
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_START)
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendValueInput('END')
        .setCheck(Blockly.Blocks.Utilities.yailTypeToBlocklyType('number',
            Blockly.Blocks.Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_END)
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendValueInput('STEP')
        .setCheck(Blockly.Blocks.Utilities.yailTypeToBlocklyType('number',
            Blockly.Blocks.Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_STEP)
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendStatementInput('DO')
        .appendField(Blockly.Msg.LANG_CONTROLS_FORRANGE_INPUT_DO)
        .setAlign(Blockly.ALIGN_RIGHT);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.LANG_CONTROLS_FORRANGE_TOOLTIP);
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
    Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('START'),
        freeSubstitution);
    Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('END'),
        freeSubstitution);
    Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('STEP'),
        freeSubstitution);
    const oldIndexVar = this.getFieldValue('VAR');
    const newIndexVar = boundSubstitution.apply(oldIndexVar);
    if (newIndexVar !== oldIndexVar) {
      this.renameVar(oldIndexVar, newIndexVar);
      const indexSubstitution = Blockly.Substitution.simpleSubstitution(
          oldIndexVar, newIndexVar);
      const extendedFreeSubstitution = freeSubstitution.extend(
          indexSubstitution);
      Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          extendedFreeSubstitution);
    } else {
      const removedFreeSubstitution = freeSubstitution.remove([oldIndexVar]);
      Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          removedFreeSubstitution);
    }
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      Blockly.LexicalVariable.renameFree(nextBlock, freeSubstitution);
    }
  },
  renameFree: function(freeSubstitution) {
    const indexVar = this.getFieldValue('VAR');
    const bodyFreeVars = Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    bodyFreeVars.deleteName(indexVar);
    const renamedBodyFreeVars = bodyFreeVars.renamed(freeSubstitution);
    if (renamedBodyFreeVars.isMember(indexVar)) { // Variable capture!
      const newIndexVar = Blockly.FieldLexicalVariable.nameNotIn(indexVar,
          renamedBodyFreeVars.toList());
      const boundSubstitution = Blockly.Substitution.simpleSubstitution(
          indexVar, newIndexVar);
      this.renameBound(boundSubstitution, freeSubstitution);
    } else {
      this.renameBound(new Blockly.Substitution(), freeSubstitution);
    }
  },
  freeVariables: function() { // return the free variables of this block
    const result = Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    // Remove bound index variable from body free vars
    result.deleteName(this.getFieldValue('VAR'));
    result.unite(Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('START')));
    result.unite(
        Blockly.LexicalVariable.freeVariables(this.getInputTargetBlock('END')));
    result.unite(Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('STEP')));
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      result.unite(Blockly.LexicalVariable.freeVariables(nextBlock));
    }
    return result;
  },
};

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
        .setCheck(Blockly.Blocks.Utilities.yailTypeToBlocklyType('list',
            Blockly.Blocks.Utilities.INPUT))
        .appendField(Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_ITEM)
        .appendField(new Blockly.FieldParameterFlydown(
            Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_VAR,
            true, Blockly.FieldFlydown.DISPLAY_BELOW), 'VAR')
        .appendField(Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_INLIST)
        .setAlign(Blockly.ALIGN_RIGHT);
    this.appendStatementInput('DO')
        .appendField(Blockly.Msg.LANG_CONTROLS_FOREACH_INPUT_DO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.LANG_CONTROLS_FOREACH_TOOLTIP);
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
    Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('LIST'),
        freeSubstitution);
    const oldIndexVar = this.getFieldValue('VAR');
    const newIndexVar = boundSubstitution.apply(oldIndexVar);
    if (newIndexVar !== oldIndexVar) {
      this.renameVar(oldIndexVar, newIndexVar);
      const indexSubstitution = Blockly.Substitution.simpleSubstitution(
          oldIndexVar, newIndexVar);
      const extendedFreeSubstitution = freeSubstitution.extend(
          indexSubstitution);
      Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          extendedFreeSubstitution);
    } else {
      const removedFreeSubstitution = freeSubstitution.remove([oldIndexVar]);
      Blockly.LexicalVariable.renameFree(this.getInputTargetBlock('DO'),
          removedFreeSubstitution);
    }
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      Blockly.LexicalVariable.renameFree(nextBlock, freeSubstitution);
    }
  },
  renameFree: function(freeSubstitution) {
    const indexVar = this.getFieldValue('VAR');
    const bodyFreeVars = Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    bodyFreeVars.deleteName(indexVar);
    const renamedBodyFreeVars = bodyFreeVars.renamed(freeSubstitution);
    if (renamedBodyFreeVars.isMember(indexVar)) { // Variable capture!
      const newIndexVar = Blockly.FieldLexicalVariable.nameNotIn(indexVar,
          renamedBodyFreeVars.toList());
      const boundSubstitution = Blockly.Substitution.simpleSubstitution(
          indexVar, newIndexVar);
      this.renameBound(boundSubstitution, freeSubstitution);
    } else {
      this.renameBound(new Blockly.Substitution(), freeSubstitution);
    }
  },
  freeVariables: function() { // return the free variables of this block
    const result = Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('DO'));
    // Remove bound index variable from body free vars
    result.deleteName(this.getFieldValue('VAR'));
    result.unite(Blockly.LexicalVariable.freeVariables(
        this.getInputTargetBlock('LIST')));
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      result.unite(Blockly.LexicalVariable.freeVariables(nextBlock));
    }
    return result;
  },
};
