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

suite ('VariableGetSet', function() {
  setup(function() {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
  });
  teardown(function() {
    delete this.workspace;
  })

  suite('disable getter and setter if input is invalid', function() {
    setup(function() {
      this.assertBlockEnabled = function(xml, enabled, blockId = 'a') {
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        const block = this.workspace.getBlockById(blockId);
        block.rendered = true;
        block.onchange(() => {})
        chai.assert.equal(block.isEnabled(), enabled);
      }
    })

    test('should be disabled if variable doesn\'t exits', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_defnoreturn" id="procdef" x="165" y="-2391">' +
        '    <field name="NAME">do_something</field>' +
        '    <statement name="STACK">' +
        '      <block type="lexical_variable_set" id="a">' +
        '        <field name="VAR">global name</field>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>'
      );

      this.assertBlockEnabled(xml, false)
    })

    test('shouldn\'t be disabled if variable does exits', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="global_declaration" id="i/93m6|[C[h%qwFGxncO" x="141" y="-2266">' +
        '    <field name="NAME">name</field>' +
        '  </block>' +
        '  <block type="procedures_defnoreturn" id="@C.I~=@6)@mhE-+1}Xu^" x="148" y="-2191">' +
        '    <field name="NAME">do_something</field>' +
        '    <statement name="STACK">' +
        '      <block type="lexical_variable_set" id="a">' +
        '        <field name="VAR">global name</field>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>'
      );

      this.assertBlockEnabled(xml, true)
    })

    test('should be disabled for lexical out of scope', function() {
      const xml = Blockly.utils.xml.textToDom('<xml>' +
        '  <block type="controls_if" id="target">' +
        '    <statement name="DO0">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="a"></localname>' +
        '          <localname name="b"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">a</field>' +
        '        <field name="VAR1">b</field>' +
        '        <value name="DECL1">' +
        '          <block type="lexical_variable_get" id="a">' +
        '            <field name="VAR">b</field>' +
        '          </block>' +
        '       </value>' +
        '       <statement name="STACK">' +
        '         <block type="lexical_variable_set" id="b">' +
        '           <field name="VAR">a</field>' +
        '         </block>' +
        '       </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
      this.assertBlockEnabled(xml, false)
      this.assertBlockEnabled(xml, true, 'b')
    })
  })
})

