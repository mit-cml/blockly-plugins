// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Variables blocks for Blockly, modified for MIT App Inventor.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

/**
 * Lyn's History:
 *  * [lyn, written 11/16-17/13, added 07/01/14]
 *   + Added freeVariables, renameFree, and renameBound to local declarations
 *   + Added freeVariables and renameFree to getters and setters
 *   + Added renameVar and renameVars to local declaration
 *   + renamed addDeclarationInputs_ to updatedDeclarationInputs_
 * [lyn, 03/04/13]
 *   + Remove notion of collapsed input from local variable declaration
 * statements/expressions, which has been eliminated in updated to Blockly
 * v1636.
 *   + Update appendTitle* to appendField*
 * [lyn, 01/18/13] Remove onchange from lexical_variable_get and
 * lexical_variable_set. This fixes issue 667 (Variable getter/setter names
 * deleted in copied blocks) and improves laggy drag problem.
 * [lyn, 10/27/13]
 *   + Modified local declaration parameter flydowns so editing the name
 * changes corresponding name in an open mutator.
 *   + Changed local declaration compose() to rebuild inputs only if local
 * names have changed.
 *     (essential for getting param flydown name changes reflected in open
 * mutator).
 *   + Fixed local declaration expression compose() to be the same as that for
 * local declaration statements.
 *   + Modified addDeclarationInputs_ to remove existing declarations, add new
 * ones, and keep last two declarations (body and collapsed text) rather than
 * recreating them. This is now used by both domToMutation() and compose(),
 * eliminating duplicated code.
 *   + Eliminated dummy declarations.
 *   + Specify direction of flydowns
 * [lyn, 10/25/13] Made collapsed block labels more sensible.
 * [lyn, 10/10-14/13]
 *   + Installed variable declaration flydowns in global definition and local
 * variable declaration statements and expressions.
 *   + Abstracted over string labels on all blocks using constants defined in
 * en/_messages.js
 *   + Cleaned up code, including refactoring to increase sharing between
 *     local_declaration_statement and local_declaration_expression.
 *   + Fixed bug: Modified onchange for local declarations to keep localNames_
 * instance variable updated when param is edited directly on declaration
 * block.
 *   + In local variable statements/expression, changed both "in do" and "in
 * return" to "scope" (shape distinguishes them). But maybe these should just
 * be empty string?
 * [lyn, 11/18/12] Renaming for globals (still working on renaming of procedure
 * and loop params)
 * [lyn, 11/17/12] Integration of simple naming into App Inventor
 * [lyn, 11/11/12] More work on onchange event. Allow invalid names for
 * untethered getters/setters on workspace, but not when click in to other
 * blocks.
 * [lyn, 11/08-10/12] Get dropdown list of names in scope to work for globals
 * and params
 *                    (including loops) in raw blockly. Pass along to Andrew
 * for integration into AI. Initial work on onchange event to change names when
 * getters/setters copied and moved.
 * [lyn, 11/05-07/12] Add local variable declaration expressions. Get mutator
 * working for local declaration statements and expressions. But these don't
 * save/load properly from XML Helpful 10/7 hangout with Andrew and Paul.
 * [lyn, 11/04/12] Created. Add global declarations. Work on local variable
 * declaration statement.
 */

/*
// For debugging only
function myStringify (obj) {
  var seen = [];
  return JSON.stringify(obj, function(key, val) {
   if (typeof val == "object") {
       if (seen.indexOf(val) >= 0) {
           return undefined;
       }
       seen.push(val);
   }
   return val
   });
}
*/

'use strict';

import * as Blockly from 'blockly/core';
import '../msg.js';
import * as WarningHandler from '../warningHandler.js';
import {FieldParameterFlydown} from '../fields/field_parameter_flydown.js';
import {FieldFlydown} from '../fields/field_flydown.js';
import {FieldGlobalFlydown} from '../fields/field_global_flydown.js';
import {
  FieldLexicalVariable,
  LexicalVariable,
} from '../fields/field_lexical_variable.js';
import * as Utilities from '../utilities.js';
import * as Shared from '../shared.js';
import {NameSet} from "../nameSet.js";
import {Substitution} from '../substitution.js'

delete Blockly.Blocks['global_declaration'];
/**
 * Prototype bindings for a global variable declaration block.
 */
Blockly.Blocks['global_declaration'] = {
  // Global var defn
  category: 'Variables',
  helpUrl: Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_HELPURL,
  init: function() {
    this.setStyle('variable_blocks');
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TITLE_INIT)
        .appendField(new FieldGlobalFlydown(
            Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_NAME,
            FieldFlydown.DISPLAY_BELOW), 'NAME')
        .appendField(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TO);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TOOLTIP);
  },
  getVars: function() {
    const field = this.getField('NAME');
    return field ? [field.getText()] : [];
  },
  getGlobalNames: function() {
    return this.getVars();
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('NAME'))) {
      this.setFieldValue(newName, 'NAME');
    }
  },
};

/**
 * Prototype bindings for a variable getter block.
 */
Blockly.Blocks['lexical_variable_get'] = {
  // Variable getter.
  category: 'Variables',
  helpUrl: Blockly.Msg.LANG_VARIABLES_GET_HELPURL,
  init: function() {
    this.setStyle('variable_blocks');
    this.fieldVar_ = new FieldLexicalVariable(' ');
    this.fieldVar_.setBlock(this);
    this.appendDummyInput()
        .appendField(Blockly.Msg.LANG_VARIABLES_GET_TITLE_GET)
        .appendField(this.fieldVar_, 'VAR');
    this.setOutput(true, null);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_GET_TOOLTIP);
    this.errors = [
      {func: WarningHandler.checkIsInDefinition},
      {
        func: WarningHandler.checkDropDownContainsValidValue,
        dropDowns: ['VAR'],
      },
    ];
    this.setOnChange(function(changeEvent) {
      WarningHandler.checkErrors(this);
    });
  },
  referenceResults: function(name, prefix, env) {
    const childrensReferenceResults = this.getChildren().map(function(blk) {
      return LexicalVariable.referenceResult(blk, name, prefix, env);
    });
    let blocksToRename = [];
    let capturables = [];
    for (let r = 0; r < childrensReferenceResults.length; r++) {
      blocksToRename = blocksToRename.concat(childrensReferenceResults[r][0]);
      capturables = capturables.concat(childrensReferenceResults[r][1]);
    }
    const possiblyPrefixedReferenceName = this.getField('VAR').getText();
    const unprefixedPair = Shared.unprefixName(possiblyPrefixedReferenceName);
    const referencePrefix = unprefixedPair[0];
    const referenceName = unprefixedPair[1];
    const referenceNotInEnv = ((Shared.usePrefixInCode &&
            (env.indexOf(possiblyPrefixedReferenceName) == -1)) ||
        ((!Shared.usePrefixInCode) && (env.indexOf(referenceName) == -1)));
    if (!(referencePrefix === Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX)) {
      if ((referenceName === name) && referenceNotInEnv) {
        // if referenceName refers to name and not some intervening
        // declaration, it's a reference to be renamed:
        blocksToRename.push(this);
        // Any intervening declared name with the same prefix as the searched
        // for name can be captured:
        if (Shared.usePrefixInCode) {
          for (let i = 0; i < env.length; i++) {
            // env is a list of prefixed names.
            const unprefixedEntry = Shared.unprefixName(env[i]);
            if (prefix === unprefixedEntry[0]) {
              capturables.push(unprefixedEntry[1]);
            }
          }
        } else { // Shared.usePrefixInCode
          capturables = capturables.concat(env);
        }
      } else if (referenceNotInEnv &&
          (!Shared.usePrefixInCode || prefix === referencePrefix)) {
        // If reference is not in environment, it's externally declared and
        // capturable When Shared.usePrefixInYail is true, only consider names
        // with same prefix to be capturable
        capturables.push(referenceName);
      }
    }
    return [[blocksToRename, capturables]];
  },
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  renameLexicalVar: function(oldName, newName, oldTranslatedName,
      newTranslatedName) {
    if (oldTranslatedName === undefined) {
      // Local variables
      if (oldName === this.getFieldValue('VAR')) {
        this.setFieldValue(newName, 'VAR');
      }
    } else if (oldTranslatedName && oldTranslatedName ===
        this.fieldVar_.getText()) {
      // Global variables

      // Force a regeneration of the dropdown options, so the subsequent
      // calls to setValue and setFieldValue will work properly.
      this.fieldVar_.getOptions(false);
      this.fieldVar_.setValue(newName);
      if (oldName === newName) {
        this.setFieldValue(newName, 'VAR');
      }
      this.fieldVar_.forceRerender();
    }
  },
  renameFree: function(freeSubstitution) {
    const prefixPair = Shared.unprefixName(this.getFieldValue('VAR'));
    const prefix = prefixPair[0];
    // Only rename lexical (nonglobal) names
    if (prefix !== Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX) {
      const oldName = prefixPair[1];
      const newName = freeSubstitution.apply(oldName);
      if (newName !== oldName) {
        this.renameLexicalVar(oldName, newName);
      }
    }
  },
  freeVariables: function() { // return the free lexical variables of this block
    const prefixPair = Shared.unprefixName(this.getFieldValue('VAR'));
    const prefix = prefixPair[0];
    // Only return lexical (nonglobal) names
    if (prefix !== Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX) {
      const oldName = prefixPair[1];
      return new NameSet([oldName]);
    } else {
      return new NameSet();
    }
  },
};

/**
 * Prototype bindings for a variable setter block.
 */
Blockly.Blocks['lexical_variable_set'] = {
  // Variable setter.
  category: 'Variables',
  helpUrl: Blockly.Msg.LANG_VARIABLES_SET_HELPURL, // *** [lyn, 11/10/12] Fix
  // this
  init: function() {
    this.setStyle('variable_blocks');
    this.fieldVar_ = new FieldLexicalVariable(' ');
    this.fieldVar_.setBlock(this);
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET)
        .appendField(this.fieldVar_, 'VAR')
        .appendField(Blockly.Msg.LANG_VARIABLES_SET_TITLE_TO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_SET_TOOLTIP);
    this.errors = [
      {func: WarningHandler.checkIsInDefinition},
      {
        func: WarningHandler.checkDropDownContainsValidValue,
        dropDowns: ['VAR'],
      },
    ];
    this.setOnChange(function(changeEvent) {
      WarningHandler.checkErrors(this);
    });
  },
  referenceResults: Blockly.Blocks.lexical_variable_get.referenceResults,
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  renameLexicalVar: Blockly.Blocks.lexical_variable_get.renameLexicalVar,
  renameFree: function(freeSubstitution) {
    // potentially rename the set variable
    const prefixPair = Shared.unprefixName(this.getFieldValue('VAR'));
    const prefix = prefixPair[0];
    // Only rename lexical (nonglobal) names
    if (prefix !== Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX) {
      const oldName = prefixPair[1];
      const newName = freeSubstitution.apply(oldName);
      if (newName !== oldName) {
        this.renameLexicalVar(oldName, newName);
      }
    }
    // [lyn, 06/26/2014] Don't forget to rename children!
    this.getChildren().map(function(blk) {
      LexicalVariable.renameFree(blk, freeSubstitution);
    });
  },
  freeVariables: function() { // return the free lexical variables of this block
    // [lyn, 06/27/2014] Find free vars of *all* children, including subsequent
    // commands in NEXT slot.
    const childrenFreeVars = this.getChildren().map(function(blk) {
      return LexicalVariable.freeVariables(blk);
    });
    const result = NameSet.unionAll(childrenFreeVars);
    const prefixPair = Shared.unprefixName(this.getFieldValue('VAR'));
    const prefix = prefixPair[0];
    // Only return lexical (nonglobal) names
    if (prefix !== Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX) {
      const oldName = prefixPair[1];
      result.insert(oldName);
    }
    return result;
  },
};

/**
 * Prototype bindings for a statement block that declares local names for use
 * in a statement body.
 * [lyn, 10/13/13] Refactored to share more code with
 * Blockly.Blocks.local_declaration_expression.
 */
Blockly.Blocks['local_declaration_statement'] = {
  // Define a procedure with no return value.
  // category: null,  // Procedures are handled specially.
  category: 'Variables', // *** [lyn, 11/07/12] Abstract over this
  helpUrl: Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_HELPURL,
  bodyInputName: 'STACK',
  init: function() {
    this.setStyle('variable_blocks');
    this.initLocals();
    this.appendStatementInput('STACK')
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_IN_DO);

    // Add notch and nub for vertical statement composition
    this.setPreviousStatement(true);
    this.setNextStatement(true);

    this.setTooltip(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_TOOLTIP);
    this.lexicalVarPrefix = Shared.localNamePrefix;
  },
  referenceResults: function(name, prefix, env) {
    // Collect locally declared names ...
    const localDeclNames = [];
    for (let i = 0; this.getInput('DECL' + i); i++) {
      let localName = this.getFieldValue('VAR' + i);
      // Invariant: Shared.showPrefixToUser must also be true!
      if (Shared.usePrefixInCode) {
        localName = (Shared.possiblyPrefixMenuNameWith(Shared.localNamePrefix))(
            localName);
      }
      localDeclNames.push(localName);
    }
    const newEnv = env.concat(localDeclNames); // ... and add to environment
    // Collect locally initialization expressions:
    const localInits = [];
    for (let i = 0; this.getInput('DECL' + i); i++) {
      const init = this.getInputTargetBlock('DECL' + i);
      if (init) {
        localInits.push(init);
      }
    }
    const initResults = localInits.map(function(init) {
      return LexicalVariable.referenceResult(init, name, prefix, env);
    });
    const doResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('STACK'), name, prefix, newEnv);
    const nextResults = LexicalVariable.referenceResult(
        LexicalVariable.getNextTargetBlock(this), name, prefix, env);
    return initResults.concat([doResults, nextResults]);
  },
  withLexicalVarsAndPrefix: function(child, proc) {
    if (this.getInputTargetBlock(this.bodyInputName) == child) {
      const localNames = this.declaredNames();
      // not arguments_ instance var
      for (let i = 0; i < localNames.length; i++) {
        proc(localNames[i], this.lexicalVarPrefix);
      }
    }
  },
  initLocals: function() {
    // Let the theme determine the color.
    // this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.setStyle('variable_blocks');
    this.localNames_ =
        [Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_DEFAULT_NAME];
    const declInput = this.appendValueInput('DECL0');
    declInput.appendField(
        Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_TITLE_INIT)
        .appendField(this.parameterFlydown(0), 'VAR0')
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_INPUT_TO)
        .setAlign(Blockly.inputs.Align.RIGHT);

    // Add mutator for editing local variable names
    this.setMutator(new Blockly.icons.MutatorIcon(['local_mutatorarg'], this));
  },
  onchange: function() {
    this.localNames_ = this.declaredNames(); // ensure localNames_ is in sync
    // with paramFlydown fields
  },
  // Store local names in mutation element of XML for block
  mutationToDom: function() {
    const container = Blockly.utils.xml.createElement('mutation');
    for (let i = 0; i < this.localNames_.length; i++) {
      const parameter = Blockly.utils.xml.createElement('localname');
      parameter.setAttribute('name', this.localNames_[i]);
      container.appendChild(parameter);
    }
    return container;
  },
  // Retrieve local names from mutation element of XML for block
  domToMutation: function(xmlElement) {
    // and replace existing declarations
    const children = Utilities.getChildren(xmlElement);
    if (children.length > 0) { // Ensure xml element is nonempty
      // Else we'll overwrite initial list with "name" for new block
      this.localNames_ = [];
      for (let i = 0, childNode; childNode = children[i]; i++) {
        if (childNode.nodeName.toLowerCase() == 'localname') {
          this.localNames_.push(childNode.getAttribute('name'));
        }
      }
    }
    this.updateDeclarationInputs_(this.localNames_); // add declarations; inits
    // are undefined
  },
  updateDeclarationInputs_: function(names, inits) {
    // Modify this block to replace existing initializers by new declaration
    // inputs created from names and inits. If inits is undefined, treat all
    // initial expressions as undefined. Keep existing body at end of input
    // list. [lyn, 03/04/13] As of change to, Blockly 1636, there is no longer
    // a collapsed input at end.

    // Remember last (= body) input
    const bodyInput = this.inputList[this.inputList.length - 1]; // Body input
    // for local
    // declaration
    const numDecls = this.inputList.length - 1;

    // [lyn, 07/03/14] stop rendering until block is recreated
    const savedRendered = this.rendered;
    this.rendered = false;

    // Modify this local-in-do block according to arrangement of name blocks in
    // mutator editor. Remove all the local declaration inputs ...
    const thisBlock = this; // Grab correct object for use in thunk below
    FieldParameterFlydown.withChangeHanderDisabled(
        // [lyn, 07/02/14] Need to disable change handler, else this will try
        // to rename params removed fields.
        function() {
          for (let i = 0; i < numDecls; i++) {
            thisBlock.removeInput('DECL' + i);
          }
        },
    );

    // Empty the inputList and recreate it, building local initializers from
    // mutator
    this.inputList = [];
    this.localNames_ = names;

    for (let i = 0; i < names.length; i++) {
      const declInput = this.appendValueInput('DECL' + i);
      // [lyn, 11/06/12]
      //   This was for case where tried to put "local" keyword on same line
      // with first local name. But even though alignment set to
      // Blockly.inputs.Align.RIGHT, the input was left justified and covered the plus
      // sign for popping up the mutator. So I put the "local" keyword on it's
      // own line even though this wastes vertical space. This should be fixed
      // in the future. if (i == 0) { declInput.appendField("local"); // Only
      // put keyword "local" on top line. }
      declInput.appendField(
          Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_TITLE_INIT)
          .appendField(this.parameterFlydown(i), 'VAR' + i)
          .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_INPUT_TO)
          .setAlign(Blockly.inputs.Align.RIGHT);
      if (inits && inits[i]) { // If there is an initializer, connect it
        declInput.connection.connect(inits[i]);
      }
    }

    // Now put back last (= body) input
    this.inputList = this.inputList.concat(bodyInput);

    this.rendered = savedRendered;
    if (this.rendered) {
      this.initSvg();
      this.render();
    }
  },
  // [lyn, 10/27/13] Introduced this to correctly handle renaming of mutatorarg
  // in open mutator when procedure parameter flydown name is edited.

  // Return a new local variable parameter flydown
  parameterFlydown: function(paramIndex) {
    const initialParamName = this.localNames_[paramIndex];
    const localDecl = this; // Here, "this" is the local decl block. Name it to
    // use in function below
    const localParameterChangeHandler = function(newParamName) {
      // This handler has the same subtleties as
      // procedureParameterChangeHandler in language/common/procedures.js, but
      // is somewhat simpler since doesn't have associated callers to change.
      // See the notes there.

      // See Subtleties #1 and #2 in  procedureParameterChangeHandler in
      // language/common/procedures.js
      const newLocals = localDecl.localNames_;
      newLocals[paramIndex] = newParamName;

      // If there's an open mutator, change the name in the corresponding slot.
      if (localDecl.mutator && localDecl.mutator.rootBlock_) {
        // Iterate through mutatorarg param blocks and change name of one at
        // paramIndex
        const mutatorContainer = localDecl.mutator.rootBlock_;
        let mutatorargIndex = 0;
        let mutatorarg = mutatorContainer.getInputTargetBlock('STACK');
        while (mutatorarg && mutatorargIndex < paramIndex) {
          mutatorarg = mutatorarg.nextConnection &&
              mutatorarg.nextConnection.targetBlock();
          mutatorargIndex++;
        }
        if (mutatorarg && mutatorargIndex == paramIndex) {
          // See Subtlety #3 in  procedureParameterChangeHandler in
          // language/common/procedures.js
          Blockly.Field.prototype.setValue.call(mutatorarg.getField('NAME'),
              newParamName);
        }
      }
    };
    return new FieldParameterFlydown(initialParamName,
        true, // name is editable
        FieldFlydown.DISPLAY_RIGHT,
        localParameterChangeHandler);
  },
  decompose: function(workspace) {
    // Create "mutator" editor populated with name blocks with local variable
    // names
    const containerBlock = workspace.newBlock('local_mutatorcontainer');
    containerBlock.initSvg();
    containerBlock.setDefBlock(this);
    let connection = containerBlock.getInput('STACK').connection;
    for (let i = 0; i < this.localNames_.length; i++) {
      const localName = this.getFieldValue('VAR' + i);
      const nameBlock = workspace.newBlock('local_mutatorarg');
      nameBlock.initSvg();
      nameBlock.setFieldValue(localName, 'NAME');
      // Store the old location.
      nameBlock.oldLocation = i;
      connection.connect(nameBlock.previousConnection);
      connection = nameBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // [lyn, 10/27/13] Modified this so that doesn't rebuild block if names
    // haven't changed. This is *essential* to handle Subtlety #3 in
    // localParameterChangeHandler within parameterFlydown.

    const newLocalNames = [];
    const initializers = [];
    let mutatorarg = containerBlock.getInputTargetBlock('STACK');
    while (mutatorarg) {
      newLocalNames.push(mutatorarg.getFieldValue('NAME'));
      initializers.push(mutatorarg.valueConnection_); // pushes undefined if
      // doesn't exist
      mutatorarg =
          mutatorarg.nextConnection && mutatorarg.nextConnection.targetBlock();
    }

    // Reconstruct inputs only if local list has changed
    if (!LexicalVariable.stringListsEqual(this.localNames_,
        newLocalNames)) {
      // Switch off rendering while the block is rebuilt.
      // var savedRendered = this.rendered;
      // this.rendered = false;

      this.updateDeclarationInputs_(newLocalNames, initializers);

      // Restore rendering and show the changes.
      // this.rendered = savedRendered;
      // if (this.rendered) {
      //  this.render();
      // }
    }
  },
  saveConnections: function(containerBlock) {
    // Store child initializer blocks for local name declarations with name
    // blocks in mutator editor
    let nameBlock = containerBlock.getInputTargetBlock('STACK');
    let i = 0;
    while (nameBlock) {
      const localDecl = this.getInput('DECL' + i);
      nameBlock.valueConnection_ =
          localDecl && localDecl.connection.targetConnection;
      i++;
      nameBlock = nameBlock.nextConnection &&
          nameBlock.nextConnection.targetBlock();
    }
    // Store body statement or expression connection
    const bodyInput = this.getInput(this.bodyInputName); // 'STACK' or 'RETURN'
    if (bodyInput) {
      containerBlock.bodyConnection_ = bodyInput.connection.targetConnection;
    }
  },
  getVars: function() {
    const varList = [];
    for (let i = 0, input; input = this.getField('VAR' + i); i++) {
      varList.push(input.getValue());
    }
    return varList;
  },
  // Interface with LexicalVariable.renameParam
  declaredNames: function() {
    return this.getVars();
  },
  declaredVariables: function() {
    return this.getVars();
  },
  // [lyn, 11/16/13 ] Return all the initializer connections
  initializerConnections: function() {
    const connections = [];
    for (let i = 0, input; input = this.getInput('DECL' + i); i++) {
      connections.push(input.connection && input.connection.targetConnection);
    }
    return connections;
  },
  // Interface with LexicalVariable.renameParam
  blocksInScope: function() {
    // *** [lyn, 11/24/12]
    // This will go away with DO-AND-RETURN block
    const doBody = this.getInputTargetBlock(this.bodyInputName);
    // List of non-null doBody or empty list for null doBody
    const doBodyList = (doBody && [doBody]) || [];
    return doBodyList; // List of non-null body elements.
  },
  renameVar: function(oldName, newName) {
    this.renameVars(Substitution.simpleSubstitution(oldName, newName));
  },
  // substitution is a dict (i.e., object) mapping old names to new ones
  renameVars: function(substitution) {
    const localNames = this.declaredNames();
    const renamedLocalNames = substitution.map(localNames);
    if (!LexicalVariable.stringListsEqual(renamedLocalNames,
        localNames)) {
      const initializerConnections = this.initializerConnections();
      this.updateDeclarationInputs_(renamedLocalNames, initializerConnections);
      // Update the mutator's variables if the mutator is open.
      if (this.mutator && this.mutator.isVisible()) {
        const blocks = this.mutator.workspace_.getAllBlocks();
        for (let x = 0, block; block = blocks[x]; x++) {
          if (block.type == 'procedures_mutatorarg') {
            const oldName = block.getFieldValue('NAME');
            const newName = substitution.apply(oldName);
            if (newName !== oldName) {
              block.setFieldValue(newName, 'NAME');
            }
          }
        }
      }
    }
  },
  renameBound: function(boundSubstitution, freeSubstitution) {
    const oldMutation = Blockly.Xml.domToText(this.mutationToDom());
    const localNames = this.declaredNames();
    for (let i = 0; i < localNames.length; i++) {
      // This is LET semantics, not LET* semantics, and needs to change!
      LexicalVariable.renameFree(this.getInputTargetBlock('DECL' + i),
          freeSubstitution);
    }
    const paramSubstitution = boundSubstitution.restrictDomain(localNames);
    this.renameVars(paramSubstitution);
    const newFreeSubstitution = freeSubstitution.remove(localNames)
        .extend(paramSubstitution);
    LexicalVariable.renameFree(
        this.getInputTargetBlock(this.bodyInputName), newFreeSubstitution);
    const newMutation = Blockly.Xml.domToText(this.mutationToDom());
    if (Blockly.Events.isEnabled()) {
      Blockly.Events.fire(
          new Blockly.Events.BlockChange(this, 'mutation', null, oldMutation,
              newMutation));
    }
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      LexicalVariable.renameFree(nextBlock, freeSubstitution);
    }
  },
  renameFree: function(freeSubstitution) {
    // This is LET semantics, not LET* semantics, and needs to change!
    const localNames = this.declaredNames();
    const localNameSet = new NameSet(localNames);
    const bodyFreeVars = LexicalVariable.freeVariables(
        this.getInputTargetBlock(this.bodyInputName));
    bodyFreeVars.subtract(localNameSet);
    const renamedFreeVars = bodyFreeVars.renamed(freeSubstitution);
    const capturedVars = renamedFreeVars.intersection(localNameSet);
    if (!capturedVars.isEmpty()) { // Case where some names are captured!
      // Must consistently rename declarations and uses of capturedFreeVars
      // with
      // names that do not conflict with renamedFreeVars, localNames, or each
      // other.
      const forbiddenNames = localNameSet.union(renamedFreeVars).toList();
      const boundBindings = {};
      const capturedVarList = capturedVars.toList();
      for (let i = 0, capturedVar; capturedVar = capturedVarList[i]; i++) {
        const newCapturedVar = FieldLexicalVariable.nameNotIn(
            capturedVar,
            forbiddenNames);
        boundBindings[capturedVar] = newCapturedVar;
        forbiddenNames.push(newCapturedVar);
      }
      this.renameBound(new Substitution(boundBindings),
          freeSubstitution);
    } else {
      this.renameBound(new Substitution(), freeSubstitution);
    }
  },
  freeVariables: function() { // return the free lexical variables of this block
    const result = LexicalVariable.freeVariables(
        this.getInputTargetBlock(this.bodyInputName));
    const localNames = this.declaredNames();
    result.subtract(new NameSet(localNames)); // This is LET semantics,
    // not LET* semantics,
    // but should be changed!
    const numDecls = localNames.length;
    for (let i = 0; i < numDecls; i++) {
      result.unite(LexicalVariable.freeVariables(
          this.getInputTargetBlock('DECL' + i)));
    }
    if (this.nextConnection) {
      const nextBlock = this.nextConnection.targetBlock();
      result.unite(LexicalVariable.freeVariables(nextBlock));
    }
    return result;
  },
};


/**
 * Prototype bindings for an expression block that declares local names for use
 * in an expression body.
 * [lyn, 10/13/13] Refactored to share more code with
 * Blockly.Blocks.local_declaration_statement.
 */
Blockly.Blocks['local_declaration_expression'] = {
  category: 'Variables', // *** [lyn, 11/07/12] Abstract over this
  helpUrl: Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_EXPRESSION_HELPURL,
  initLocals: Blockly.Blocks.local_declaration_statement.initLocals,
  bodyInputName: 'RETURN',
  init: function() {
    this.setStyle('variables_blocks');
    this.initLocals();
    // this.appendIndentedValueInput('RETURN')
    this.appendValueInput('RETURN')
        .appendField(
            Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_EXPRESSION_IN_RETURN);
    // Create plug for expression output
    this.setOutput(true, null);
    this.setTooltip(
        Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_EXPRESSION_TOOLTIP);
  },
  referenceResults: function(name, prefix, env) {
    // Collect locally declared names ...
    const localDeclNames = [];
    for (let i = 0; this.getInput('DECL' + i); i++) {
      let localName = this.getFieldValue('VAR' + i);
      // Invariant: Shared.showPrefixToUser must also be true!
      if (Shared.usePrefixInCode) {
        localName = (Shared.possiblyPrefixMenuNameWith(Shared.localNamePrefix))(
            localName);
      }
      localDeclNames.push(localName);
    }
    const newEnv = env.concat(localDeclNames); // ... and add to environment
    // Collect locally initialization expressions:
    const localInits = [];
    for (let i = 0; this.getInput('DECL' + i); i++) {
      const init = this.getInputTargetBlock('DECL' + i);
      if (init) {
        localInits.push(init);
      }
    }
    const initResults = localInits.map(function(init) {
      return LexicalVariable.referenceResult(init, name, prefix, env);
    });
    const returnResults = LexicalVariable.referenceResult(
        this.getInputTargetBlock('RETURN'), name, prefix, newEnv);
    return initResults.concat([returnResults]);
  },
  withLexicalVarsAndPrefix:
    Blockly.Blocks.local_declaration_statement.withLexicalVarsAndPrefix,
  onchange: Blockly.Blocks.local_declaration_statement.onchange,
  mutationToDom: Blockly.Blocks.local_declaration_statement.mutationToDom,
  domToMutation: Blockly.Blocks.local_declaration_statement.domToMutation,
  updateDeclarationInputs_:
    Blockly.Blocks.local_declaration_statement.updateDeclarationInputs_,
  parameterFlydown: Blockly.Blocks.local_declaration_statement.parameterFlydown,
  blocksInScope: Blockly.Blocks.local_declaration_statement.blocksInScope,
  decompose: Blockly.Blocks.local_declaration_statement.decompose,
  compose: Blockly.Blocks.local_declaration_statement.compose,
  saveConnections: Blockly.Blocks.local_declaration_statement.saveConnections,
  getVars: Blockly.Blocks.local_declaration_statement.getVars,
  declaredNames: Blockly.Blocks.local_declaration_statement.declaredNames,
  declaredVariables:
      Blockly.Blocks.local_declaration_statement.declaredVariables,
  renameVar: Blockly.Blocks.local_declaration_statement.renameVar,
  renameVars: Blockly.Blocks.local_declaration_statement.renameVars,
  renameBound: Blockly.Blocks.local_declaration_statement.renameBound,
  renameFree: Blockly.Blocks.local_declaration_statement.renameFree,
  freeVariables: Blockly.Blocks.local_declaration_statement.freeVariables,
};

Blockly.Blocks['local_mutatorcontainer'] = {
  // Local variable container (for mutator dialog).
  init: function() {
    // Let the theme determine the color.
    // this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.setStyle('variable_blocks');
    this.appendDummyInput()
        .appendField(
            Blockly.Msg
                .LANG_VARIABLES_LOCAL_MUTATOR_CONTAINER_TITLE_LOCAL_NAMES);
    this.appendStatementInput('STACK');
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_LOCAL_MUTATOR_CONTAINER_TOOLTIP);
    this.contextMenu = false;
    this.mustNotRenameCapturables = true;
  },
  // [lyn. 11/24/12] Set procBlock associated with this container.
  setDefBlock: function(defBlock) {
    this.defBlock_ = defBlock;
  },
  // [lyn. 11/24/12] Set procBlock associated with this container.
  // Invariant: should not be null, since only created as mutator for a
  // particular proc block.
  getDefBlock: function() {
    return this.defBlock_;
  },
  // [lyn. 11/24/12] Return list of param names in this container
  // Invariant: there should be no duplicates!
  declaredNames: function() {
    const paramNames = [];
    let paramBlock = this.getInputTargetBlock('STACK');
    while (paramBlock) {
      paramNames.push(paramBlock.getFieldValue('NAME'));
      paramBlock = paramBlock.nextConnection &&
          paramBlock.nextConnection.targetBlock();
    }
    return paramNames;
  },
};

Blockly.Blocks['local_mutatorarg'] = {
  // Procedure argument (for mutator dialog).
  init: function() {
    // Let the theme determine the color.
    // this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.setStyle('variable_blocks');
    this.appendDummyInput()
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_MUTATOR_ARG_TITLE_NAME)
        .appendField(new Blockly.FieldTextInput(
            Blockly.Msg.LANG_VARIABLES_LOCAL_MUTATOR_ARG_DEFAULT_VARIABLE,
            LexicalVariable.renameParam),
        'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.contextMenu = false;
    this.lexicalVarPrefix = Shared.localNamePrefix;
    this.mustNotRenameCapturables = true;
  },
  getContainerBlock: function() {
    let parent = this.getParent();
    while (parent && !(parent.type === 'local_mutatorcontainer')) {
      parent = parent.getParent();
    }
    // [lyn, 11/24/12] Cache most recent container block so can reference it
    // upon removal from mutator arg stack
    this.cachedContainerBlock_ =
        (parent && (parent.type === 'local_mutatorcontainer') && parent) ||
        null;
    return this.cachedContainerBlock_;
  },
  getDefBlock: function() {
    const container = this.getContainerBlock();
    return (container && container.getDefBlock()) || null;
  },
  blocksInScope: function() {
    const defBlock = this.getDefBlock();
    return (defBlock && defBlock.blocksInScope()) || [];
  },
  declaredNames: function() {
    const container = this.getContainerBlock();
    return (container && container.declaredNames()) || [];
  },

  // [lyn, 11/24/12] Check for situation in which mutator arg has been removed
  // from stack,
  onchange: function() {
    const paramName = this.getFieldValue('NAME');
    if (paramName) { // paramName is null when delete from stack
      // console.log("Mutatorarg onchange: " + paramName);
      const cachedContainer = this.cachedContainerBlock_;
      const container = this.getContainerBlock(); // Order is important; this
      // must come after
      // cachedContainer since it
      // sets cachedContainerBlock_
      // console.log("Mutatorarg onchange: " + paramName
      //            + "; cachedContainer = " + JSON.stringify((cachedContainer
      // && cachedContainer.type) || null) + "; container = " +
      // JSON.stringify((container && container.type) || null));
      if ((!cachedContainer) && container) {
        // Event: added mutator arg to container stack
        // console.log("Mutatorarg onchange ADDED: " + paramName);
        const declaredNames = this.declaredNames();
        const firstIndex = declaredNames.indexOf(paramName);
        if (firstIndex != -1) {
          // Assertion: we should get here, since paramName should be among
          // names
          const secondIndex = declaredNames.indexOf(paramName, firstIndex + 1);
          if (secondIndex != -1) {
            // If we get here, there is a duplicate on insertion that must be
            // resolved
            const newName = FieldLexicalVariable.nameNotIn(paramName,
                declaredNames);
            this.setFieldValue(newName, 'NAME');
          }
        }
      }
    }
  },
};
