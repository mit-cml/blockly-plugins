import * as Blockly from 'blockly/core';
import * as Shared from "./shared.js";
import {FieldLexicalVariable, LexicalVariable} from "./fields/field_lexical_variable.js";
import {Substitution} from "./substitution.js";

export const mixin = function (target, source) {
    for (const prop in source) {
        target[prop] = source[prop];
    }
};

export const coreLexicalVariableScopeMixin = {
    referenceResults: function(name, prefix, env) {
        const thisBlock = this;
        const possiblyPrefixedVarNames = thisBlock.getDeclaredVarFieldNamesAndPrefixes().map(([varFieldName, varPrefix]) => {
            if (Shared.usePrefixInCode) {
                const varName = thisBlock.getFieldValue(varFieldName);
                const nameFunc = Shared.possiblyPrefixMenuNameWith(varPrefix);
                return nameFunc(varName);
            } else {
                return thisBlock.getFieldValue(varFieldName);
            }
        });
        const newEnv = env.concat(possiblyPrefixedVarNames);
        const inputResults =  thisBlock.inputList.map((input) => {
            return LexicalVariable.referenceResult(
                thisBlock.getInputTargetBlock(input.name),
                name,
                prefix,
                input.name === thisBlock.getScopedInputName() ? newEnv : env);
        });
        if (thisBlock.nextConnection) {
            inputResults.push(LexicalVariable.referenceResult(
                thisBlock.getNextBlock(), name, prefix, env));
        }
        return inputResults;
    },

    withLexicalVarsAndPrefix: function(child, proc) {
        const thisBlock = this;
        if (child && thisBlock.getInputTargetBlock(thisBlock.getScopedInputName()) === child) {
            thisBlock.getDeclaredVarFieldNamesAndPrefixes().forEach(([fieldName, prefix]) => {
                const lexVar = thisBlock.getFieldValue(fieldName);
                if (thisBlock && thisBlock.getVariableType) proc(lexVar, prefix, '', thisBlock.getVariableType());
                else proc(lexVar, prefix);
            });
        }
    },

    getDeclaredVars: function () {
        const thisBlock = this;
        return thisBlock.getDeclaredVarFieldNames().map((fieldName) => {
            return thisBlock.getFieldValue(fieldName);
        });
    },

    blocksInScope: function () {
        const thisBlock = this;
        const blocks = thisBlock.getInputTargetBlock(thisBlock.getScopedInputName());
        return (blocks && [blocks]) || [];
    },

    declaredNames: function() { // TODO: Not sure why we have two different names for the same thing.
        return this.getDeclaredVars()
    },

    renameVar: function (oldName, newName) {
        // If we have a renameVars function, it means that the block has some extra logic
        // beyond a simple rename.
        // TODO: Figure out if we can abstract the renameVars logic for different blocks.
        if (this.renameVars) {
            this.renameVars(Substitution.simpleSubstitution(oldName, newName));
        } else {
            const thisBlock = this;
            thisBlock.getDeclaredVarFieldNames().forEach((fieldName) => {
                if (Blockly.Names.equals(oldName, thisBlock.getFieldValue(fieldName))) {
                    thisBlock.setFieldValue(newName, fieldName);
                }
            });
        }
    },

    renameBound: function (boundSubstitution, freeSubstitution) {
        const thisBlock = this;
        let modifiedSubstitution = freeSubstitution;
        thisBlock.inputList.forEach((input) => {
            if (input.name === thisBlock.getScopedInputName()) {
                thisBlock.getDeclaredVarFieldNames().forEach((fieldName) => {
                    const oldVar = thisBlock.getFieldValue(fieldName);
                    const newVar = boundSubstitution.apply(oldVar);
                    if (newVar !== oldVar) {
                        thisBlock.renameVar(oldVar, newVar);
                        const varSubstitution = Substitution.simpleSubstitution(
                            oldVar, newVar);
                        modifiedSubstitution = freeSubstitution.extend(varSubstitution);
                    } else {
                        modifiedSubstitution = freeSubstitution.remove([oldVar]);
                    }
                });
                LexicalVariable.renameFree(
                    thisBlock.getInputTargetBlock(thisBlock.getScopedInputName()),
                    modifiedSubstitution);
            } else {
                LexicalVariable.renameFree(
                    thisBlock.getInputTargetBlock(input.name), freeSubstitution);
            }
        });
        if (thisBlock.nextConnection) {
            const nextBlock = thisBlock.nextConnection.targetBlock();
            LexicalVariable.renameFree(nextBlock, freeSubstitution);
        }
    },

    renameFree: function (freeSubstitution) {
        const thisBlock = this;
        const bodyFreeVars = LexicalVariable.freeVariables(
            thisBlock.getInputTargetBlock(thisBlock.getScopedInputName()));

        const boundSubstitution = new Substitution();
        thisBlock.getDeclaredVarFieldNames().forEach((fieldName) => {
            const oldVar = thisBlock.getFieldValue(fieldName);
            bodyFreeVars.deleteName(oldVar);
            const renamedBodyFreeVars = bodyFreeVars.renamed(freeSubstitution);
            if (renamedBodyFreeVars.isMember(oldVar)) { // Variable is bound in body.
                const newVar = FieldLexicalVariable.nameNotIn(
                    oldVar, renamedBodyFreeVars.toList());
                const substitution = Substitution.simpleSubstitution(
                    oldVar, newVar);
                boundSubstitution.extend(substitution);
            }
        });
        thisBlock.renameBound(boundSubstitution, freeSubstitution);
    },

    freeVariables: function () { // return the free variables of this block
        const thisBlock = this;
        const result = LexicalVariable.freeVariables(
            thisBlock.getInputTargetBlock(thisBlock.getScopedInputName()));

        thisBlock.getDeclaredVarFieldNames().forEach((fieldName) => {
            result.deleteName(thisBlock.getFieldValue(fieldName));
        });

        // Add free variables from other inputs.
        thisBlock.inputList.forEach((input) => {
            if (input.name !== thisBlock.getScopedInputName()) {
                result.unite(LexicalVariable.freeVariables(
                    thisBlock.getInputTargetBlock(input.name)));
            }
        });

        // Add the free variables from the next block(s).
        if (thisBlock.nextConnection) {
            var nextBlock = thisBlock.nextConnection.targetBlock();
            result.unite(LexicalVariable.freeVariables(nextBlock));
        }

        return result;
    },
}

/**
 * The block that this is mixed into needs to have the following methods defined on it:
 * - getDeclaredVarFieldNames(): a list of the names of the fields of the block's declared variables.
 * - getScopedInputName(): The name of the input that defines the block's scope (e.g., "DO")
 *
 * @mixin
 */
export const lexicalVariableScopeMixin = {
    ...coreLexicalVariableScopeMixin,
    getDeclaredVarFieldNamesAndPrefixes: function () {
        const thisBlock = this;
        return thisBlock.getDeclaredVarFieldNames().map((varFieldName) => [varFieldName, undefined]);
    },
}

/**
 * The block that this is mixed into needs to have the following methods defined on it:
 * - getDeclaredVarFieldNamesAndPrefixes(): a list of pairs of the names of the fields of the block's declared variables
 *     and the prefixes to use for those variables (e.g., [["KEY", "key"], ["VALUE", "value"]]).
 * - getScopedInputName(): The name of the input that defines the block's scope (e.g., "DO")
*
 * @mixin
 */
export const prefixedLexicalVariableScopeMixin = {
    ...coreLexicalVariableScopeMixin,
    getDeclaredVarFieldNames: function () {
        const thisBlock = this;
        return thisBlock.getDeclaredVarFieldNamesAndPrefixes().map(([varFieldName, _]) => varFieldName);
    },
}

Blockly.Extensions.registerMixin('lexical_variable_scope_mixin', lexicalVariableScopeMixin);
Blockly.Extensions.registerMixin('prefixed_lexical_variable_scope_mixin', prefixedLexicalVariableScopeMixin);
