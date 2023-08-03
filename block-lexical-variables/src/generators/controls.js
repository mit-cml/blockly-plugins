'use strict';

import Blockly from 'blockly';
import pkg from 'blockly/javascript.js';

if (pkg) {
// We might be loaded into an environment that doesn't have Blockly's JavaScript generator.
  const {javascriptGenerator} = pkg;
  /**
   * This code is copied from Blockly but the 'var' keyword is replaced by 'let'
   * in the generated code.
   * @param {Blockly.Block} block The block to generate code for.
   * @return {string} The generated code.
   */
  javascriptGenerator['controls_for'] = function (block) {
    // For loop.
    const variable0 = javascriptGenerator.nameDB_.getName(
        block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const argument0 = javascriptGenerator.valueToCode(block, 'START',
        javascriptGenerator.ORDER_ASSIGNMENT) || '0';
    const argument1 = javascriptGenerator.valueToCode(block, 'END',
        javascriptGenerator.ORDER_ASSIGNMENT) || '0';
    const increment = javascriptGenerator.valueToCode(block, 'STEP',
        javascriptGenerator.ORDER_ASSIGNMENT) || '1';
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    branch = javascriptGenerator.addLoopTrap(branch, block);
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
        startVar = javascriptGenerator.nameDB_.getDistinctName(
            variable0 + '_start', Blockly.VARIABLE_CATEGORY_NAME);
        code += 'let ' + startVar + ' = ' + argument0 + ';\n';
      }
      let endVar = argument1;
      if (!argument1.match(/^\w+$/) && !Blockly.utils.string.isNumber(argument1)) {
        endVar = javascriptGenerator.nameDB_.getDistinctName(
            variable0 + '_end', Blockly.VARIABLE_CATEGORY_NAME);
        code += 'let ' + endVar + ' = ' + argument1 + ';\n';
      }
      // Determine loop direction at start, in case one of the bounds
      // changes during loop execution.
      const incVar = javascriptGenerator.nameDB_.getDistinctName(
          variable0 + '_inc', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'let ' + incVar + ' = ';
      if (Blockly.utils.string.isNumber(increment)) {
        code += Math.abs(increment) + ';\n';
      } else {
        code += 'Math.abs(' + increment + ');\n';
      }
      code += 'if (' + startVar + ' > ' + endVar + ') {\n';
      code += javascriptGenerator.INDENT + incVar + ' = -' + incVar + ';\n';
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
  javascriptGenerator['controls_forRange'] = javascriptGenerator['controls_for'];

  /**
   * This code is copied from Blockly but the 'var' keyword is replaced by 'let'
   * or 'const' (as appropriate) in the generated code.
   * @param {Blockly.Block} block The block to generate code for.
   * @return {string} The generated code.
   */
  javascriptGenerator['controls_forEach'] = function (block) {
    // For each loop.
    const variable0 = javascriptGenerator.nameDB_.getName(
        block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const argument0 = javascriptGenerator.valueToCode(block, 'LIST',
        javascriptGenerator.ORDER_ASSIGNMENT) || '[]';
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    branch = javascriptGenerator.addLoopTrap(branch, block);
    let code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    let listVar = argument0;
    if (!argument0.match(/^\w+$/)) {
      listVar = javascriptGenerator.nameDB_.getDistinctName(
          variable0 + '_list', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'const ' + listVar + ' = ' + argument0 + ';\n';
    }
    const indexVar = javascriptGenerator.nameDB_.getDistinctName(
        variable0 + '_index', Blockly.VARIABLE_CATEGORY_NAME);
    branch = javascriptGenerator.INDENT + 'const ' + variable0 + ' = ' +
        listVar + '[' + indexVar + '];\n' + branch;
    code += 'for (let ' + indexVar + ' in ' + listVar + ') {\n' + branch + '}\n';
    return code;
  };
}
