'use strict';

import * as Blockly from 'blockly/core';
import * as pkg from 'blockly/javascript';

if (pkg) {
// We might be loaded into an environment that doesn't have Blockly's JavaScript generator.
  const {javascriptGenerator, Order} = pkg;
  /**
   * This code is copied from Blockly but the 'var' keyword is replaced by 'let'
   * in the generated code.
   * @param {Blockly.Block} block The block to generate code for.
   * @param generator The generator that will be passed in.
   * @return {string} The generated code.
   */
  javascriptGenerator.forBlock['controls_for'] = function (block, generator) {
    // For loop.
    const variable0 = generator.nameDB_.getName(
        block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const argument0 = generator.valueToCode(block, 'FROM',
        Order.ASSIGNMENT) || '0';
    const argument1 = generator.valueToCode(block, 'TO',
        Order.ASSIGNMENT) || '0';
    const increment = generator.valueToCode(block, 'BY',
        Order.ASSIGNMENT) || '1';
    let branch = generator.statementToCode(block, 'DO');
    branch = generator.addLoopTrap(branch, block);
    let code;
    if (Blockly.utils.string.isNumber(argument0) && Blockly.utils.string.isNumber(argument1) &&
        Blockly.utils.string.isNumber(increment)) {
      // All arguments are simple numbers.
      const up = Number(argument0) <= Number(argument1);
      code = 'for (let ' + variable0 + ' = ' + argument0 + '; ' +
          variable0 + (up ? ' <= ' : ' >= ') + argument1 + '; ' +
          variable0;
      const step = Math.abs(Number(increment));
      if (step == 1) {
        code += up ? '++' : '--';
      } else {
        code += (up ? ' += ' : ' -= ') + step;
      }
      code += ') {\n' + branch + '}\n';
    } else {
      code = '';
      // Cache non-trivial values to variables to prevent repeated look-ups.
      let startVar = argument0;
      if (!argument0.match(/^\w+$/) && !Blockly.utils.string.isNumber(argument0)) {
        startVar = generator.nameDB_.getDistinctName(
            variable0 + '_start', Blockly.VARIABLE_CATEGORY_NAME);
        code += 'let ' + startVar + ' = ' + argument0 + ';\n';
      }
      let endVar = argument1;
      if (!argument1.match(/^\w+$/) && !Blockly.utils.string.isNumber(argument1)) {
        endVar = generator.nameDB_.getDistinctName(
            variable0 + '_end', Blockly.VARIABLE_CATEGORY_NAME);
        code += 'let ' + endVar + ' = ' + argument1 + ';\n';
      }
      // Determine loop direction at start, in case one of the bounds
      // changes during loop execution.
      const incVar = generator.nameDB_.getDistinctName(
          variable0 + '_inc', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'let ' + incVar + ' = ';
      if (Blockly.utils.string.isNumber(increment)) {
        code += Math.abs(increment) + ';\n';
      } else {
        code += 'Math.abs(' + increment + ');\n';
      }
      code += 'if (' + startVar + ' > ' + endVar + ') {\n';
      code += generator.INDENT + incVar + ' = -' + incVar + ';\n';
      code += '}\n';
      code += 'for (' + variable0 + ' = ' + startVar + '; ' +
          incVar + ' >= 0 ? ' +
          variable0 + ' <= ' + endVar + ' : ' +
          variable0 + ' >= ' + endVar + '; ' +
          variable0 + ' += ' + incVar + ') {\n' +
          branch + '}\n';
    }
    return code;
  };
// controls_forRange and controls_for are aliases.  This is to make the
// controls_statement_flow block work correctly for controls_forRange.
  javascriptGenerator.forBlock['controls_forRange'] = javascriptGenerator.forBlock['controls_for'];

  /**
   * This code is copied from Blockly but the 'var' keyword is replaced by 'let'
   * or 'const' (as appropriate) in the generated code.
   * @param {Blockly.Block} block The block to generate code for.
   * @param generator The generator that will be passed in.
   * @return {string} The generated code.
   */
  javascriptGenerator.forBlock['controls_forEach'] = function (block, generator) {
    // For each loop.
    const variable0 = generator.nameDB_.getName(
        block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const argument0 = generator.valueToCode(block, 'LIST',
        Order.ASSIGNMENT) || '[]';
    let branch = generator.statementToCode(block, 'DO');
    branch = generator.addLoopTrap(branch, block);
    let code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    let listVar = argument0;
    if (!argument0.match(/^\w+$/)) {
      listVar = generator.nameDB_.getDistinctName(
          variable0 + '_list', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'const ' + listVar + ' = ' + argument0 + ';\n';
    }
    const indexVar = generator.nameDB_.getDistinctName(
        variable0 + '_index', Blockly.VARIABLE_CATEGORY_NAME);
    branch = generator.INDENT + 'const ' + variable0 + ' = ' +
        listVar + '[' + indexVar + '];\n' + branch;
    code += 'for (let ' + indexVar + ' in ' + listVar + ') {\n' + branch + '}\n';
    return code;
  };
}
