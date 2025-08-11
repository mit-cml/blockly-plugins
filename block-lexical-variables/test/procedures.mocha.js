import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';

import '../src/msg';
import '../src/utilities';
import '../src/workspace';
import '../src/procedure_utils';
import '../src/fields/flydown';
import '../src/fields/field_flydown';
import '../src/fields/field_global_flydown';
import '../src/fields/field_nocheck_dropdown';
import '../src/fields/field_parameter_flydown';
import '../src/fields/field_procedurename';
import '../src/blocks/lexical-variables';
import '../src/blocks/controls';
import '../src/blocks/variable-get-set.js';
import '../src/procedure_database';
import '../src/blocks/procedures';
import '../src/generators/controls';
import '../src/generators/procedures';
import '../src/generators/lexical-variables';


import chai from 'chai';


/**
 * Utility function to check if a block contains another block by type or id.
 * @param {Blockly.Block} block - The block to search within.
 * @param {string} identifier - The type or id of the block to search for.
 * @param {boolean} isId - Whether to search by id (true) or type (false).
 * @returns {boolean} - True if the block contains the specified block, false otherwise.
 */
function containsBlocks(block, identifier, isId = true) {
  if (!block) return false;

  if (isId && block.id === identifier) return true;
  if (!isId && block.type === identifier) return true;

  const children = block.getChildren(true);
  for (const child of children) {
    if (containsBlocks(child, identifier, isId)) {
      return true;
    }
  }

  return false;
}

/**
 * Utility function to check if a procedure block has a stack field.
 * @param procedureBlock - The procedure block to check.
 * @param stackEnabled - Whether the stack field should be present (true) or not (false).
 */
function checkStackFieldExists(procedureBlock, stackEnabled = false) {
  const stackField = procedureBlock.getInput('STACK');
  if (stackEnabled) {
    chai.assert.isDefined(stackField, 'Procedure block should have a stack field');
  } else {
    chai.assert.isNull(stackField, 'Procedure block should not have a stack field');
  }
}

suite ('Procedures', function() {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
  });
  teardown(function () {
    delete this.workspace;
  })

  suite('procedures_defreturn', function() {
    test('Load procedure from old version (without stack_enable)', function() {
        const xml = Blockly.utils.xml.textToDom(
          '<xml>' +
          '  <block type="procedures_defreturn" id="p" x="310" y="213">' +
          '    <mutation>' +
          '      <arg name="x"></arg>' +
          '      <arg name="y"></arg>' +
          '    </mutation>' +
          '    <field name="NAME">do_something</field>' +
          '    <field name="VAR0">x</field>' +
          '    <field name="VAR1">y</field>' +
          '    <value name="RETURN">' +
          '      <block type="controls_do_then_return" id="a">' +
          '        <statement name="STM">' +
          '          <block type="simple_local_declaration_statement" id="b">' +
          '            <field name="VAR">name</field>' +
          '            <statement name="DO">' +
          '              <block type="lexical_variable_set" id="c">' +
          '                <field name="VAR">name</field>' +
          '                <value name="VALUE">' +
          '                  <block type="lexical_variable_get" id="d">' +
          '                    <field name="VAR">y</field>' +
          '                  </block>' +
          '                </value>' +
          '              </block>' +
          '            </statement>' +
          '          </block>' +
          '        </statement>' +
          '        <value name="VALUE">' +
          '          <block type="lexical_variable_get" id="f">' +
          '            <field name="VAR">x</field>' +
          '          </block>' +
          '        </value>' +
          '      </block>' +
          '    </value>' +
          '  </block>' +
          '</xml>'
        );

        Blockly.Xml.domToWorkspace(xml, this.workspace);
        const block = this.workspace.getBlockById('p');
        chai.assert.isDefined(block, 'Procedure block should be defined');
        chai.assert.equal(block.type, 'procedures_defreturn', 'Block type should be procedures_defreturn');

        const mutation = block.mutationToDom();
        chai.assert.isNotNull(mutation, 'Mutation should not be null');
        chai.assert.equal(mutation.getAttribute('stack_enabled'), 'false', 'stack_enabled should be false');

        const blockIds = ['a', 'b', 'c', 'd', 'f'];
        blockIds.forEach(id => {
          chai.assert.isTrue(containsBlocks(block, id), `Block with id ${id} should be contained`);
        });
    })

    test('Mutation button click should enable stack', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml>' +
        '  <block type="procedures_defreturn" id="p" x="310" y="213">' +
        '    <mutation stack_enabled="false">' +
        '      <arg name="x"></arg>' +
        '      <arg name="y"></arg>' +
        '    </mutation>' +
        '    <field name="NAME">do_something</field>' +
        '  </block>' +
        '</xml>'
      );

      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('p');
      chai.assert.isDefined(block, 'Procedure block should be defined');

      const mutation = block.mutationToDom();
      chai.assert.equal(mutation.getAttribute('stack_enabled'), 'false', 'stack_enabled should initially be false');
      checkStackFieldExists(block, false);

      block.domToMutation(Blockly.utils.xml.textToDom(
        '<mutation stack_enabled="true">' +
        '  <arg name="x"></arg>' +
        '  <arg name="y"></arg>' +
        '</mutation>'
      ));
      const updatedMutation = block.mutationToDom();
      chai.assert.equal(updatedMutation.getAttribute('stack_enabled'), 'true', 'stack_enabled should be true after toggle');
      checkStackFieldExists(block, true);
    });
  })
})