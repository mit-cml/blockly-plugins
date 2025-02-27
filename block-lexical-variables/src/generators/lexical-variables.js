'use strict';

import * as Shared from '../shared.js';
import * as Blockly from 'blockly/core';
import * as pkg from 'blockly/javascript';

if (pkg) {
// We might be loaded into an environment that doesn't have Blockly's JavaScript generator.
  const {javascriptGenerator, Order} = pkg;
  javascriptGenerator.forBlock['lexical_variable_get'] = function (block, generator) {
    const code = getVariableName(block.getFieldValue('VAR'));
    return [code, Order.ATOMIC];
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
  function genBasicSetterCode(block, varFieldName, generator) {
    const argument0 = generator.valueToCode(block, 'VALUE',
        Order.ASSIGNMENT) || '0';
    const varName = getVariableName(block.getFieldValue(varFieldName));
    return varName + ' = ' + argument0 + ';\n';
  }

  javascriptGenerator.forBlock['lexical_variable_set'] = function (block, generator) {
    // Variable setter.
    return genBasicSetterCode(block, 'VAR', generator);
  };

  javascriptGenerator.forBlock['global_declaration'] = function (block, generator) {
    // Global variable declaration
    return 'var ' + genBasicSetterCode(block, 'NAME', generator);
  };

  function generateDeclarations(block, generator) {
    let code = '{\n  let ';
    for (let i = 0; block.getFieldValue('VAR' + i); i++) {
      code += (Shared.usePrefixInCode ? 'local_' : '') +
          block.getFieldValue('VAR' + i);
      code += ' = ' + (generator.valueToCode(block,
          'DECL' + i, Order.NONE) || '0');
      code += ', ';
    }
    // Get rid of the last comma
    code = code.slice(0, -2);
    code += ';\n';
    return code;
  }

  javascriptGenerator.forBlock['local_declaration_statement'] = function (block, generator) {
    let code = generateDeclarations(block, generator);
    code += generator.statementToCode(block, 'STACK');
    code += '}\n';
    return code;
  };

  javascriptGenerator.forBlock['local_declaration_expression'] = function (block, generator) {
    // TODO: This can probably be redone to use the variables as parameters to the generated function
    // and then call the function with the generated variable values.
    let code = '(function() {\n'
    code += generateDeclarations(block, generator);
    code += 'return ' + (generator.valueToCode(block,
        'RETURN', Order.NONE) || 'null');
    code += '}})()\n';
    return [code, Order.NONE];
  };

  javascriptGenerator.forBlock['simple_local_declaration_statement'] = function (block, generator) {
    let code = '{\n  let ';
    code += (Shared.usePrefixInCode ? 'local_' : '') +
        block.getFieldValue('VAR');
    code += ' = ' + (generator.valueToCode(block,
        'DECL', Order.NONE) || '0');
    code += ';\n';
    code += generator.statementToCode(block, 'DO');
    code += '}\n';
    return code;
  }
}

