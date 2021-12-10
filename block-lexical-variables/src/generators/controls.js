'use strict';

import * as Blockly from 'blockly';

/**
 * This code is copied from Blockly but the 'var' keyword is replaced by 'let'
 * in the generated code.
 * @param {Blockly.Block} block The block to generate code for.
 * @return {string} The generated code.
 */
Blockly.JavaScript['controls_for'] = function(block) {
  // For loop.
  const variable0 = Blockly.JavaScript.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  const argument0 = Blockly.JavaScript.valueToCode(block, 'START',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  const argument1 = Blockly.JavaScript.valueToCode(block, 'END',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  const increment = Blockly.JavaScript.valueToCode(block, 'STEP',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '1';
  let branch = Blockly.JavaScript.statementToCode(block, 'DO');
  branch = Blockly.JavaScript.addLoopTrap(branch, block);
  let code;
  if (Blockly.isNumber(argument0) && Blockly.isNumber(argument1) &&
      Blockly.isNumber(increment)) {
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
    if (!argument0.match(/^\w+$/) && !Blockly.isNumber(argument0)) {
      startVar = Blockly.JavaScript.nameDB_.getDistinctName(
          variable0 + '_start', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'let ' + startVar + ' = ' + argument0 + ';\n';
    }
    let endVar = argument1;
    if (!argument1.match(/^\w+$/) && !Blockly.isNumber(argument1)) {
      endVar = Blockly.JavaScript.nameDB_.getDistinctName(
          variable0 + '_end', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'let ' + endVar + ' = ' + argument1 + ';\n';
    }
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    const incVar = Blockly.JavaScript.nameDB_.getDistinctName(
        variable0 + '_inc', Blockly.VARIABLE_CATEGORY_NAME);
    code += 'let ' + incVar + ' = ';
    if (Blockly.isNumber(increment)) {
      code += Math.abs(increment) + ';\n';
    } else {
      code += 'Math.abs(' + increment + ');\n';
    }
    code += 'if (' + startVar + ' > ' + endVar + ') {\n';
    code += Blockly.JavaScript.INDENT + incVar + ' = -' + incVar + ';\n';
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
Blockly.JavaScript['controls_forRange'] = Blockly.JavaScript['controls_for'];

/**
 * This code is copied from Blockly but the 'var' keyword is replaced by 'let'
 * or 'const' (as appropriate) in the generated code.
 * @param {Blockly.Block} block The block to generate code for.
 * @return {string} The generated code.
 */
Blockly.JavaScript['controls_forEach'] = function(block) {
  // For each loop.
  const variable0 = Blockly.JavaScript.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  const argument0 = Blockly.JavaScript.valueToCode(block, 'LIST',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '[]';
  let branch = Blockly.JavaScript.statementToCode(block, 'DO');
  branch = Blockly.JavaScript.addLoopTrap(branch, block);
  let code = '';
  // Cache non-trivial values to variables to prevent repeated look-ups.
  let listVar = argument0;
  if (!argument0.match(/^\w+$/)) {
    listVar = Blockly.JavaScript.nameDB_.getDistinctName(
        variable0 + '_list', Blockly.VARIABLE_CATEGORY_NAME);
    code += 'const ' + listVar + ' = ' + argument0 + ';\n';
  }
  const indexVar = Blockly.JavaScript.nameDB_.getDistinctName(
      variable0 + '_index', Blockly.VARIABLE_CATEGORY_NAME);
  branch = Blockly.JavaScript.INDENT + 'const ' + variable0 + ' = ' +
      listVar + '[' + indexVar + '];\n' + branch;
  code += 'for (let ' + indexVar + ' in ' + listVar + ') {\n' + branch + '}\n';
  return code;
};

