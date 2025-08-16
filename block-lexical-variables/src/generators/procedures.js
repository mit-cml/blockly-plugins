'use strict';

import * as Blockly from 'blockly/core';
import * as pkg from 'blockly/javascript';

if (pkg) {
// We might be loaded into an environment that doesn't have Blockly's JavaScript generator.
  const {javascriptGenerator, Order} = pkg;
  /**
   * This code is copied from Blockly but the 'NAME' field is changed to
   * 'PROCNAME'.
   * @param {Blockly.Block} block The block to generate code for.
   * @param generator The generator that will be passed in.
   * @return {(string|*)[]} The generated code.
   */
  javascriptGenerator.forBlock['procedures_callreturn'] = function (block, generator) {
    // Call a procedure with a return value.
    const funcName = generator.nameDB_.getName(
        block.getFieldValue('PROCNAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    const args = [];
    const variables = block.arguments_;
    for (let i = 0; i < variables.length; i++) {
      args[i] = generator.valueToCode(block, 'ARG' + i,
          Order.NONE) || 'null';
    }
    const code = funcName + '(' + args.join(', ') + ')';
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['procedures_early_return'] = function (block, generator) {
      const returnValue = generator.valueToCode(block, 'RETURN_VALUE', Order.NONE) || 'null';
      return `return ${returnValue};\n`;
  }
}
