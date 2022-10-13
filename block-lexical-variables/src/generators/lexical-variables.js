'use strict';

import * as Shared from '../shared';
import * as Blockly from 'blockly';
import {javascriptGenerator} from 'blockly/javascript';

javascriptGenerator['lexical_variable_get'] = function(block) {
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

javascriptGenerator['lexical_variable_set'] = function(block) {
  // Variable setter.
  return genBasicSetterCode(block, 'VAR');
};

javascriptGenerator['global_declaration'] = function(block) {
  // Global variable declaration
  return 'var ' + genBasicSetterCode(block, 'NAME');
};

javascriptGenerator['local_declaration_statement'] = function() {
  let code = '{\n  let ';
  for (let i=0; this.getFieldValue('VAR' + i); i++) {
    code += (Shared.usePrefixInCode ? 'local_' : '') +
        this.getFieldValue('VAR' + i);
    code += ' = ' + ( javascriptGenerator.valueToCode(this,
        'DECL' + i, javascriptGenerator.ORDER_NONE) || '0' );
    code += ', ';
  }
  // Get rid of the last comma
  code = code.slice(0, -2);
  code += ';\n';
  code += javascriptGenerator.statementToCode(this, 'STACK',
      javascriptGenerator.ORDER_NONE);
  code += '}\n';
  return code;
};


Blockly.JavaScript['local_declaration_expression'] = function() {
  let code = '(function() {\n  ';
  let hasVar = this.getFieldValue('VAR0')
  if(hasVar) {
    code += 'let '
    for (let i=0; this.getFieldValue('VAR' + i); i++) {
      code += (Shared.usePrefixInCode ? 'local_' : '') +
          this.getFieldValue('VAR' + i);
      code += ' = ' + ( Blockly.JavaScript.valueToCode(this,
          'DECL' + i, Blockly.JavaScript.ORDER_NONE) || '0' );
      code += ', ';
    }
    // Get rid of the last comma
    code = code.slice(0, -2);
    code += ';\n';
  }

  code += Blockly.JavaScript.statementToCode(this, 'STACK',
      Blockly.JavaScript.ORDER_NONE);
  code += '\n})()\n';
  return [code, Blockly.JavaScript.ORDER_NONE];
};
