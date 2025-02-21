'use strict';

import * as Blockly from 'blockly/core';
import '../inputs/indented_input.js';
import '../msg.js';
import {ErrorCheckers} from '../warningHandler.js';
import {
    FieldLexicalVariable,
    LexicalVariable,
} from '../fields/field_lexical_variable.js';
import * as Shared from '../shared.js';
import {NameSet} from "../nameSet.js";

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
            {func: ErrorCheckers.checkIsInDefinition},
            {
                func: ErrorCheckers.checkDropDownContainsValidValue,
                dropDowns: ['VAR'],
            },
        ];
        this.setOnChange(function(changeEvent) {
            this.workspace.getWarningHandler().checkErrors(this);
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
    getDeclaredVars: function() {
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
            {func: ErrorCheckers.checkIsInDefinition},
            {
                func: ErrorCheckers.checkDropDownContainsValidValue,
                dropDowns: ['VAR'],
            },
        ];
        this.setOnChange(function(changeEvent) {
            this.workspace.getWarningHandler().checkErrors(this);
        });
    },
    referenceResults: Blockly.Blocks.lexical_variable_get.referenceResults,
    getDeclaredVars: function() {
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
