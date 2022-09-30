'use strict';

import * as Blockly from 'blockly';

/**
 * This code is copied from Blockly but the 'NAME' field is changed to
 * 'PROCNAME'.
 * @param {Blockly.Block} block The block to generate code for.
 * @return {string} The generated code.
 */
Blockly.JavaScript['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  const funcName = Blockly.JavaScript.nameDB_.getName(
      block.getFieldValue('PROCNAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  const args = [];
  const variables = block.arguments_;
  for (let i = 0; i < variables.length; i++) {
    args[i] = Blockly.JavaScript.valueToCode(block, 'ARG' + i,
        Blockly.JavaScript.ORDER_NONE) || 'null';
  }
  const code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript['procedures_ifreturn'] = function (block) {
  let retVal = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
  return '\nreturn ' + retVal + ';\n'
};