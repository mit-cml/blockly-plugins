'use strict';

import * as Shared from '../shared.js';
import Blockly from 'blockly';
import pkg from 'blockly/javascript.js';

if (pkg) {
// We might be loaded into an environment that doesn't have Blockly's JavaScript generator.
  const {javascriptGenerator} = pkg;
  javascriptGenerator['lexical_variable_get'] = function (block) {
    const code = getVariableName(block.getFieldValue('VAR'));
    return [code, javascriptGenerator.ORDER_ATOMIC];
  };

  /**
   * Generate variable name
   * @param {string} name
   * @return {string}
   */
  function getVariableName(name) {
    const pair = Shared.unprefixName(name);
    const prefix = pair[0];
    const unprefixedName = pair[1];
    if (prefix === Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX ||
        prefix === Shared.GLOBAL_KEYWORD) {
      return unprefixedName;
    } else {
      return (Shared.possiblyPrefixGeneratedVarName(prefix))(unprefixedName);
    }
  }

  /**
   * Generate basic variable setting code.
   * @param {Blockly.Block} block
   * @param {string} varFieldName
   * @return {string} The code.
   */
  function genBasicSetterCode(block, varFieldName) {
    const argument0 = javascriptGenerator.valueToCode(block, 'VALUE',
        javascriptGenerator.ORDER_ASSIGNMENT) || '0';
    const varName = getVariableName(block.getFieldValue(varFieldName));
    return varName + ' = ' + argument0 + ';\n';
  }

  javascriptGenerator['lexical_variable_set'] = function (block) {
    // Variable setter.
    return genBasicSetterCode(block, 'VAR');
  };

  javascriptGenerator['global_declaration'] = function (block) {
    // Global variable declaration
    return 'var ' + genBasicSetterCode(block, 'NAME');
  };

  function generateDeclarations(block) {
    let code = '{\n  let ';
    for (let i = 0; block.getFieldValue('VAR' + i); i++) {
      code += (Shared.usePrefixInCode ? 'local_' : '') +
          block.getFieldValue('VAR' + i);
      code += ' = ' + (javascriptGenerator.valueToCode(block,
          'DECL' + i, javascriptGenerator.ORDER_NONE) || '0');
      code += ', ';
    }
    // Get rid of the last comma
    code = code.slice(0, -2);
    code += ';\n';
    return code;
  }

  javascriptGenerator['local_declaration_statement'] = function () {
    let code = generateDeclarations(this);
    code += javascriptGenerator.statementToCode(this, 'STACK',
        javascriptGenerator.ORDER_NONE);
    code += '}\n';
    return code;
  };

  javascriptGenerator['local_declaration_expression'] = function () {
    // TODO: This can probably be redone to use the variables as parameters to the generated function
    // and then call the function with the generated variable values.
    let code = '(function() {\n'
    code += generateDeclarations(this);
    code += 'return ' + (javascriptGenerator.valueToCode(this,
        'RETURN', javascriptGenerator.ORDER_NONE) || 'null');
    code += '}})()\n';
    return [code, javascriptGenerator.ORDER_NONE];
  };
}
