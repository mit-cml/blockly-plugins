// Copyright © 2020 Massachusetts Institute of Technology. All rights reserved.

// This code is based on the code written by Beka Westberg (BeksOmega) for this pull request to App Inventor:
// https://github.com/mit-cml/appinventor-sources/pull/2171.  The code for that PR came from this repo/branch:
// https://github.com/BeksOmega/appinventor-sources/tree/tests/lexical_field

/**
 * @license
 * @fileoverview Field lexical variable behavior tests.
 */

import Blockly from 'blockly';
import '../../src/utilities.js';
import '../../src/workspace.js';
import '../../src/procedure_utils.js';
import '../../src/fields/flydown.js';
import '../../src/fields/field_flydown.js';
import '../../src/fields/field_global_flydown.js';
import '../../src/fields/field_nocheck_dropdown.js';
import {FieldLexicalVariable, LexicalVariable} from '../../src/fields/field_lexical_variable.js';
import '../../src/fields/field_parameter_flydown.js';
import '../../src/fields/field_procedurename.js';
import '../../src/blocks/lexical-variables.js';
import '../../src/blocks/controls.js';
import '../../src/procedure_database.js';
import '../../src/blocks/procedures.js';
import '../../src/generators/controls.js';
import '../../src/generators/procedures.js';
import '../../src/generators/lexical-variables.js';

import chai from 'chai';
import {NameSet} from "../../src/nameSet.js";

suite ('FieldLexical', function() {
  setup(function() {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);

    this.createBlock = function (type) {
      const block = this.workspace.newBlock(type);
      block.initSvg();
      block.render();
      return block;
    }
  });
  teardown(function() {
    delete this.createBlock;
    delete this.workspace;
  })

  suite('getGlobalNames', function() {
    test('Simple', function() {
      // Uses XML so that names don't overlap.
      const xml = Blockly.Xml.textToDom('<xml>' +
          '  <block type="global_declaration">' +
          '    <field name="NAME">global</field>' +
          '  </block>' +
          '  <block type="global_declaration">' +
          '    <field name="NAME">global</field>' +
          '  </block>' +
          '  <block type="global_declaration">' +
          '    <field name="NAME">global</field>' +
          '  </block>' +
          '</xml>');
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const vars = FieldLexicalVariable.getGlobalNames();
      chai.assert.sameOrderedMembers(vars, ['global', 'global2', 'global3']);
    });
    test('Top-Level Local', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
          '  <block type="global_declaration">' +
          '    <field name="NAME">global</field>' +
          '  </block>' +
          '  <block type="global_declaration">' +
          '    <field name="NAME">global</field>' +
          '  </block>' +
          '  <block type="global_declaration">' +
          '    <field name="NAME">global</field>' +
          '  </block>' +
          '  <block type="local_declaration_statement">' +
          '    <field name="VAR0">local</field>' +
          '  </block>' +
          '</xml>');
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const vars = FieldLexicalVariable.getGlobalNames();
      chai.assert.sameOrderedMembers(vars, ['global', 'global2', 'global3']);
    });
  });
  suite('getLexicalNamesInScope', function() {
    setup(function() {
      this.assertLexicalNames = function(xml, expectVars) {
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        const block = this.workspace.getBlockById('a');
        const actualVars = FieldLexicalVariable
            .getLexicalNamesInScope(block);
        chai.assert.sameDeepOrderedMembers(actualVars, expectVars);
      }
    })
    suite('Nesting', function() {
      test('Simple Nesting', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="name2"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">name2</field>' +
        '        <statement name="STACK">' +
        '          <block type="controls_if" id="a"/>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['name', 'name'], ['name2', 'name2']]);
      });
      test('Matching Nesting - No Dupes', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="name"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">name</field>' +
        '        <statement name="STACK">' +
        '          <block type="controls_if" id="a"/>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['name', 'name']]);

      });
      test('Weird Nesting 1', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <value name="DECL0">' +
        '      <block type="local_declaration_expression">' +
        '        <mutation>' +
        '          <localname name="name2"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">name2</field>' +
        '        <value name="RETURN">' +
        '          <block type="logic_boolean" id="a"/>' +
        '        </value>' +
        '      </block>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['name2', 'name2']]);
      });
      test('Weird Nesting 2', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="name2"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">name2</field>' +
        '        <value name="DECL0">' +
        '          <block type="logic_boolean" id="a"/>' +
        '        </value>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['name', 'name']]);
      })
    });
    suite('Procedures', function() {
      test('Stack Procedure', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="procedures_defnoreturn">' +
        '    <mutation>' +
        '      <arg name="x"></arg>' +
        '      <arg name="y"></arg>' +
        '    </mutation>' +
        '    <field name="NAME">procedure</field>' +
        '    <field name="VAR0">x</field>' +
        '    <field name="VAR1">y</field>' +
        '    <statement name="STACK">' +
        '      <block type="controls_if" id="a"/>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['x', 'x'], ['y', 'y']]);
      });
      test('Input Procedure', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="procedures_defreturn">' +
        '    <mutation>' +
        '      <arg name="x"></arg>' +
        '      <arg name="y"></arg>' +
        '    </mutation>' +
        '    <field name="NAME">procedure</field>' +
        '    <field name="VAR0">x</field>' +
        '    <field name="VAR1">y</field>' +
        '    <value name="RETURN">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['x', 'x'], ['y', 'y']]);
      });
    })
    suite('For Range', function() {
      test('From Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="controls_forRange">' +
        '    <field name="VAR">number</field>' +
        '    <value name="START">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, []);
      });
      test('To Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="controls_forRange">' +
        '    <field name="VAR">number</field>' +
        '    <value name="END">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, []);
      });
      test('By Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="controls_forRange">' +
        '    <field name="VAR">number</field>' +
        '    <value name="STEP">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, []);
      });
      test('Do Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="controls_forRange">' +
        '    <field name="VAR">number</field>' +
        '    <statement name="DO">' +
        '      <block type="controls_if" id="a"/>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['number', 'number']]);
      });
    })
    suite('For Each', function() {
      test('List Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="controls_forEach">' +
        '    <field name="VAR">item</field>' +
        '    <value name="LIST">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, []);
      });
      test('Do Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="controls_forEach">' +
        '    <field name="VAR">item</field>' +
        '    <value name="DO">' +
        '      <block type="controls_if" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['item', 'item']]);
      });
    });
    // suite('For Each Dict', function() {
    //   test('Item Input', function() {
    //     const xml = Blockly.Xml.textToDom('<xml>' +
    //     '  <block type="controls_for_each_dict">' +
    //     '    <field name="KEY">key</field>' +
    //     '    <field name="VALUE">value</field>' +
    //     '    <value name="DICT">' +
    //     '      <block type="logic_boolean" id="a"/>' +
    //     '    </value>' +
    //     '  </block>' +
    //     '</xml>');
    //     this.assertLexicalNames(xml, []);
    //   });
    //   test('Do Input', function() {
    //     const xml = Blockly.Xml.textToDom('<xml>' +
    //     '  <block type="controls_for_each_dict">' +
    //     '    <field name="KEY">key</field>' +
    //     '    <field name="VALUE">value</field>' +
    //     '    <statement name="DO">' +
    //     '      <block type="controls_if" id="a"/>' +
    //     '    </statement>' +
    //     '  </block>' +
    //     '</xml>');
    //     this.assertLexicalNames(xml, [['key', 'key'], ['value', 'value']]);
    //   });
    // });
    suite('Local Expression Declaration', function() {
      test('const Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_expression">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <value name="DECL0">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, []);
      });
      test('Expression Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_expression">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <value name="RETURN">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['name', 'name']]);
      });
    });
    suite('Local Statement Declaration', function() {
      test('const Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <value name="DECL0">' +
        '      <block type="logic_boolean" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, []);
      });
      test('Statement Input', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="name"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">name</field>' +
        '    <value name="STACK">' +
        '      <block type="controls_if" id="a"/>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertLexicalNames(xml, [['name', 'name']]);
      });
    })
  })
  suite('getNamesInScope', function() {
    setup(function() {
      this.assertNames = function(xml, expectedVars) {
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        const block = this.workspace.getBlockById('a');
        const actualVars = FieldLexicalVariable
            .getNamesInScope(block);
        chai.assert.sameDeepOrderedMembers(actualVars, expectedVars);
      }
    });
    teardown(function() {
      delete this.assertNames;
    })
    test('Globals First', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="global_declaration" y="-200">' +
      '    <field name="NAME">gName</field>' +
      '  </block>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="name"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">name</field>' +
      '    <value name="STACK">' +
      '      <block type="controls_if" id="a"/>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertNames(xml, [
        ['global gName', 'global gName'],
        ['name', 'name'],
      ]);
    });
    test('Vars Sorted 1', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="global_declaration" y="-200">' +
      '    <field name="NAME">gA</field>' +
      '  </block>' +
      '  <block type="global_declaration" y="-200">' +
      '    <field name="NAME">gB</field>' +
      '  </block>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="lA"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">lA</field>' +
      '    <value name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="lB"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">lB</field>' +
      '        <value name="STACK">' +
      '          <block type="controls_if" id="a"/>' +
      '        </value>' +
      '      </block>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertNames(xml, [
        ['global gA', 'global gA'],
        ['global gB', 'global gB'],
        ['lA', 'lA'],
        ['lB', 'lB'],
      ]);
    });
    test('Vars Sorted 2', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="global_declaration" y="-200">' +
      '    <field name="NAME">gB</field>' +
      '  </block>' +
      '  <block type="global_declaration" y="-200">' +
      '    <field name="NAME">gA</field>' +
      '  </block>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="lB"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">lB</field>' +
      '    <value name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="lA"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">lA</field>' +
      '        <value name="STACK">' +
      '          <block type="controls_if" id="a"/>' +
      '        </value>' +
      '      </block>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertNames(xml, [
        ['global gA', 'global gA'],
        ['global gB', 'global gB'],
        ['lA', 'lA'],
        ['lB', 'lB'],
      ]);
    });
    test('Global Prefix is Translated', function() {
      Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX = 'testPrefix';
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="global_declaration" y="-200">' +
      '    <field name="NAME">gName</field>' +
      '  </block>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="name"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">name</field>' +
      '    <value name="STACK">' +
      '      <block type="controls_if" id="a"/>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertNames(xml, [
        ['testPrefix gName', 'global gName'],
        ['name', 'name'],
      ]);
      Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX = 'global';
    });
  })
  suite('prefixSuffix', function() {
    test('No Suffix', function() {
      const prefixSuffix = FieldLexicalVariable.prefixSuffix('name');
      chai.assert.sameDeepOrderedMembers(prefixSuffix, ['name', '']);
    });
    test('Digit Suffix', function() {
      const prefixSuffix = FieldLexicalVariable.prefixSuffix('name1');
      chai.assert.sameDeepOrderedMembers(prefixSuffix, ['name', '1']);
    });
    test('Letter Following Digit', function() {
      const prefixSuffix = FieldLexicalVariable.prefixSuffix('name1a');
      chai.assert.sameDeepOrderedMembers(prefixSuffix, ['name1a', '']);
    });
  });
  suite('nameNotIn', function() {
    test('No Conflict', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['bar', 'cat', 'pupper']);
      chai.assert.equal(newName, 'foo');
    });
    test('Empty Not Used', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo1', 'foo2', 'foo3']);
      chai.assert.equal(newName, 'foo');
    });
    test('Empty & 0', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo', 'foo0']);
      chai.assert.equal(newName, 'foo2');
    });
    test('Empty & 1', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo', 'foo1']);
      chai.assert.equal(newName, 'foo2');
    });
    test('Empty & 2', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo', 'foo2']);
      chai.assert.equal(newName, 'foo3');
    });
    test('Empty, 2 & 4', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo', 'foo2', 'foo4']);
      chai.assert.equal(newName, 'foo3');
    });
    test('Empty, 2, 3 & 4', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo', 'foo2', 'foo3', 'foo4']);
      chai.assert.equal(newName, 'foo5');
    });
    test('Extra vars', function() {
      const newName = FieldLexicalVariable
          .nameNotIn('foo', ['foo', 'foo2', 'foo', 'foo4', 'bar3', 'cats']);
      chai.assert.equal(newName, 'foo3');
    });
  });
  suite('setValue', function() {
    test('Global Prefix Incorrect', function() {
      const field = new FieldLexicalVariable('notGlobal actualName');
      chai.assert.equal(field.getText(), 'global actualName');
    });
  });
  suite('checkIdentifier', function() {
    test('Spaces -> Underscores', function() {
      const result = LexicalVariable.checkIdentifier('test test');
      chai.assert.isTrue(result.isLegal);
      chai.assert.equal(result.transformed, 'test_test');
    });
    test('Trimming', function() {
      const result = LexicalVariable.checkIdentifier('   test   ');
      chai.assert.isTrue(result.isLegal);
      chai.assert.equal(result.transformed, 'test');
    });
    test('Trim to emtpy', function() {
      const result = LexicalVariable.checkIdentifier('   ');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '');
    })
    test('Chinese Character', function() {
      const result = LexicalVariable.checkIdentifier('修改数值');
      chai.assert.isTrue(result.isLegal);
      chai.assert.equal(result.transformed, '修改数值');
    });
    // TODO: I thought this was supposed to be illegal, but it works.
    test.skip('@', function() {
      const result = LexicalVariable.checkIdentifier('@test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '@test');
    });
    test('.', function() {
      const result = LexicalVariable.checkIdentifier('.test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '.test');
    });
    test('-', function() {
      const result = LexicalVariable.checkIdentifier('-test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '-test');
    });
    test('\\', function() {  // Checks single slash.
      const result = LexicalVariable.checkIdentifier('\\test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '\\test');
    });
    test('+', function() {
      const result = LexicalVariable.checkIdentifier('+test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '+test');
    });
    test('[', function() {
      const result = LexicalVariable.checkIdentifier('[test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, '[test');
    });
    test(']', function() {
      const result = LexicalVariable.checkIdentifier(']test');
      chai.assert.isFalse(result.isLegal);
      chai.assert.equal(result.transformed, ']test');
    });
  });
  suite('makeLegalIdentifier', function() {
    test('Legal', function() {
      const name = LexicalVariable.makeLegalIdentifier('test');
      chai.assert.equal(name, 'test');
    });
    test('Illegal, Empty', function() {
      const name = LexicalVariable.makeLegalIdentifier('   ');
      chai.assert.equal(name, '_');
    });
    // TODO: See TODO in file.
    test.skip('Just Illegal', function() {})
  })
  suite('referenceResult', function() {
    setup(function() {
      this.assertReference = function(xml, name, expectedIds, expectedCaptures) {
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        const block = this.workspace.getBlockById('root');
        const result = LexicalVariable
            .referenceResult(block, name, '', []);

        const actualIds = result[0].map((block) => { return block.id; });
        chai.assert.sameDeepMembers(actualIds, expectedIds);
        chai.assert.sameDeepMembers(result[1], expectedCaptures);
      }
    });
    teardown(function() {
      delete this.assertReference;
    })
    test('Lexical > For Range', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="a"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">a</field>' +
      '    <statement name="STACK">' +
      '      <block type="controls_forRange" id="root">' +
      '        <field name="VAR">b</field>' +
      '        <value name="START">' +
      '          <block type="lexical_variable_get" id="a">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '        <value name="END">' +
      '          <block type="lexical_variable_get" id="b">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '        <value name="STEP">' +
      '          <block type="lexical_variable_get" id="c">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '        <statement name="DO">' +
      '          <block type="lexical_variable_set" id="d">' +
      '            <field name="VAR">a</field>' +
      '            <value name="VALUE">' +
      '              <block type="lexical_variable_get" id="e">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      // TODO: Not sure why the capturables look the way they do. I expect 'b'
      //   To not be capturable at all.
      this.assertReference(xml, 'a', ['a', 'b', 'c', 'd', 'e'], ['b', 'b']);
    });
    test('Lexical > Lexical > For Range; Reference Outer', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="controls_forRange" id="root">' +
      '            <field name="VAR">b</field>' +
      '            <value name="START">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '            <value name="END">' +
      '              <block type="lexical_variable_get" id="b">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '            <value name="STEP">' +
      '              <block type="lexical_variable_get" id="c">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '            <statement name="DO">' +
      '              <block type="lexical_variable_set" id="d">' +
      '                <field name="VAR">out</field>' +
      '                <value name="VALUE">' +
      '                  <block type="lexical_variable_get" id="e">' +
      '                    <field name="VAR">out</field>' +
      '                  </block>' +
      '                </value>' +
      '              </block>' +
      '            </statement>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      // TODO: Ok why doesn't this one reference b then?
      this.assertReference(xml, 'a', [], ['out', 'out', 'out', 'out', 'out']);
    })
    test('Lexical > Lexical > For Range; No Reference', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="controls_forRange" id="root">' +
      '            <field name="VAR">b</field>' +
      '            <value name="START">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '            <value name="END">' +
      '              <block type="lexical_variable_get" id="b">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '            <value name="STEP">' +
      '              <block type="lexical_variable_get" id="c">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '            <statement name="DO">' +
      '              <block type="lexical_variable_set" id="d">' +
      '                <field name="VAR">a</field>' +
      '                <value name="VALUE">' +
      '                  <block type="lexical_variable_get" id="e">' +
      '                    <field name="VAR">a</field>' +
      '                  </block>' +
      '                </value>' +
      '              </block>' +
      '            </statement>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b', 'c', 'd', 'e'], ['b', 'b']);
    });
    test('Lexical > Foreach', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="a"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">a</field>' +
      '    <statement name="STACK">' +
      '      <block type="controls_forEach" id="root">' +
      '        <field name="VAR">b</field>' +
      '        <value name="LIST">' +
      '          <block type="lexical_variable_get" id="a">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '        <statement name="DO">' +
      '          <block type="lexical_variable_set" id="b">' +
      '            <field name="VAR">a</field>' +
      '            <value name="VALUE">' +
      '              <block type="lexical_variable_get" id="c">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b', 'c'], ['b', 'b']);
    });
    test('Lexical > Lexical > Foreach; Reference Outer', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="controls_forEach" id="root">' +
      '            <field name="VAR">b</field>' +
      '            <value name="LIST">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '            <statement name="DO">' +
      '              <block type="lexical_variable_set" id="d">' +
      '                <field name="VAR">out</field>' +
      '                <value name="VALUE">' +
      '                  <block type="lexical_variable_get" id="e">' +
      '                    <field name="VAR">out</field>' +
      '                  </block>' +
      '                </value>' +
      '              </block>' +
      '            </statement>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', [], ['out', 'out', 'out']);
    })
    test('Lexical > Lexical > Foreach; No Reference', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="controls_forEach" id="root">' +
      '            <field name="VAR">b</field>' +
      '            <value name="LIST">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '            <statement name="DO">' +
      '              <block type="lexical_variable_set" id="b">' +
      '                <field name="VAR">a</field>' +
      '                <value name="VALUE">' +
      '                  <block type="lexical_variable_get" id="c">' +
      '                    <field name="VAR">a</field>' +
      '                  </block>' +
      '                </value>' +
      '              </block>' +
      '            </statement>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b', 'c'], ['b', 'b']);
    });
    // test('Lexical > Foreach Dict', function() {
    //   const xml = Blockly.Xml.textToDom('<xml>' +
    //   '  <block type="local_declaration_statement">' +
    //   '    <mutation>' +
    //   '      <localname name="a"></localname>' +
    //   '    </mutation>' +
    //   '    <field name="VAR0">a</field>' +
    //   '    <statement name="STACK">' +
    //   '      <block type="controls_for_each_dict" id="root">' +
    //   '        <field name="KEY">key</field>' +
    //   '        <field name="VALUE">value</field>' +
    //   '        <value name="DICT">' +
    //   '          <block type="lexical_variable_get" id="a">' +
    //   '            <field name="VAR">a</field>' +
    //   '          </block>' +
    //   '        </value>' +
    //   '        <statement name="DO">' +
    //   '          <block type="lexical_variable_set" id="b">' +
    //   '            <field name="VAR">a</field>' +
    //   '            <value name="VALUE">' +
    //   '              <block type="lexical_variable_get" id="c">' +
    //   '                <field name="VAR">a</field>' +
    //   '              </block>' +
    //   '            </value>' +
    //   '          </block>' +
    //   '        </statement>' +
    //   '      </block>' +
    //   '    </statement>' +
    //   '  </block>' +
    //   '</xml>');
    //   this.assertReference(xml, 'a',
    //       ['a', 'b', 'c'], ['key', 'value', 'key', 'value']);
    // });
    // test('Lexical > Lexical > Foreach Dict; Reference Outer', function() {
    //   const xml = Blockly.Xml.textToDom('<xml>' +
    //   '  <block type="local_declaration_statement">' +
    //   '    <mutation>' +
    //   '      <localname name="out"></localname>' +
    //   '    </mutation>' +
    //   '    <field name="VAR0">out</field>' +
    //   '    <statement name="STACK">' +
    //   '      <block type="local_declaration_statement">' +
    //   '        <mutation>' +
    //   '          <localname name="a"></localname>' +
    //   '        </mutation>' +
    //   '        <field name="VAR0">a</field>' +
    //   '        <statement name="STACK">' +
    //   '          <block type="controls_for_each_dict" id="root">' +
    //   '            <field name="KEY">key</field>' +
    //   '            <field name="VALUE">value</field>' +
    //   '            <value name="DICT">' +
    //   '              <block type="lexical_variable_get" id="a">' +
    //   '                <field name="VAR">out</field>' +
    //   '              </block>' +
    //   '            </value>' +
    //   '            <statement name="DO">' +
    //   '              <block type="lexical_variable_set" id="d">' +
    //   '                <field name="VAR">out</field>' +
    //   '                <value name="VALUE">' +
    //   '                  <block type="lexical_variable_get" id="e">' +
    //   '                    <field name="VAR">out</field>' +
    //   '                  </block>' +
    //   '                </value>' +
    //   '              </block>' +
    //   '            </statement>' +
    //   '          </block>' +
    //   '        </statement>' +
    //   '      </block>' +
    //   '    </statement>' +
    //   '  </block>' +
    //   '</xml>');
    //   this.assertReference(xml, 'a', [], ['out', 'out', 'out']);
    // })
    // test('Lexical > Lexical > Foreach Dict; No Reference', function() {
    //   const xml = Blockly.Xml.textToDom('<xml>' +
    //   '  <block type="local_declaration_statement">' +
    //   '    <mutation>' +
    //   '      <localname name="out"></localname>' +
    //   '    </mutation>' +
    //   '    <field name="VAR0">out</field>' +
    //   '    <statement name="STACK">' +
    //   '      <block type="local_declaration_statement">' +
    //   '        <mutation>' +
    //   '          <localname name="a"></localname>' +
    //   '        </mutation>' +
    //   '        <field name="VAR0">a</field>' +
    //   '        <statement name="STACK">' +
    //   '          <block type="controls_for_each_dict" id="root">' +
    //   '            <field name="KEY">key</field>' +
    //   '            <field name="VALUE">value</field>' +
    //   '            <value name="DICT">' +
    //   '              <block type="lexical_variable_get" id="a">' +
    //   '                <field name="VAR">a</field>' +
    //   '              </block>' +
    //   '            </value>' +
    //   '            <statement name="DO">' +
    //   '              <block type="lexical_variable_set" id="b">' +
    //   '                <field name="VAR">a</field>' +
    //   '                <value name="VALUE">' +
    //   '                  <block type="lexical_variable_get" id="c">' +
    //   '                    <field name="VAR">a</field>' +
    //   '                  </block>' +
    //   '                </value>' +
    //   '              </block>' +
    //   '            </statement>' +
    //   '          </block>' +
    //   '        </statement>' +
    //   '      </block>' +
    //   '    </statement>' +
    //   '  </block>' +
    //   '</xml>');
    //   this.assertReference(xml, 'a',
    //       ['a', 'b', 'c'], ['key', 'value', 'key', 'value']);
    // });
    test('Lexical > Lexical Statement', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="a"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">a</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement" id="root">' +
      '        <mutation>' +
      '          <localname name="b"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">b</field>' +
      '        <value name="DECL0">' +
      '          <block type="lexical_variable_get" id="a">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '        <statement name="STACK">' +
      '          <block type="lexical_variable_set" id="b">' +
      '            <field name="VAR">a</field>' +
      '            <value name="VALUE">' +
      '              <block type="lexical_variable_get" id="c">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b', 'c'], ['b', 'b']);
    });
    test('Lexical > Lexical > Lexical Statement; Reference Outer', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="local_declaration_statement" id="root">' +
      '            <mutation>' +
      '              <localname name="b"></localname>' +
      '            </mutation>' +
      '            <field name="VAR0">b</field>' +
      '            <value name="DECL0">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '            <statement name="STACK">' +
      '              <block type="lexical_variable_set" id="d">' +
      '                <field name="VAR">out</field>' +
      '                <value name="VALUE">' +
      '                  <block type="lexical_variable_get" id="e">' +
      '                    <field name="VAR">out</field>' +
      '                  </block>' +
      '                </value>' +
      '              </block>' +
      '            </statement>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', [], ['out', 'out', 'out']);
    })
    test('Lexical > Lexical > Lexical Statement; No Reference', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="local_declaration_statement" id="root">' +
      '            <mutation>' +
      '              <localname name="b"></localname>' +
      '            </mutation>' +
      '            <field name="VAR0">b</field>' +
      '            <value name="DECL0">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '            <statement name="STACK">' +
      '              <block type="lexical_variable_set" id="b">' +
      '                <field name="VAR">a</field>' +
      '                <value name="VALUE">' +
      '                  <block type="lexical_variable_get" id="c">' +
      '                    <field name="VAR">a</field>' +
      '                  </block>' +
      '                </value>' +
      '              </block>' +
      '            </statement>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b', 'c'], ['b', 'b']);
    });
    test('Lexical > Lexical Expression', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_expression">' +
      '    <mutation>' +
      '      <localname name="a"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">a</field>' +
      '    <value name="RETURN">' +
      '      <block type="local_declaration_expression" id="root">' +
      '        <mutation>' +
      '          <localname name="b"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">b</field>' +
      '        <value name="DECL0">' +
      '          <block type="lexical_variable_get" id="a">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '        <value name="RETURN">' +
      '          <block type="lexical_variable_get" id="b">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '      </block>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b'], ['b']);
    });
    test('Lexical > Lexical > Lexical Expression; Reference Outer', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_expression">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <value name="RETURN">' +
      '      <block type="local_declaration_expression">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <value name="RETURN">' +
      '          <block type="local_declaration_expression" id="root">' +
      '            <mutation>' +
      '              <localname name="b"></localname>' +
      '            </mutation>' +
      '            <field name="VAR0">b</field>' +
      '            <value name="DECL0">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '            <value name="RETURN">' +
      '              <block type="lexical_variable_get" id="c">' +
      '                <field name="VAR">out</field>' +
      '              </block>' +
      '            </value>' +
      '          </block>' +
      '        </value>' +
      '      </block>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', [], ['out', 'out']);
    })
    test('Lexical > Lexical > Lexical Expression; No Reference', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_expression">' +
      '    <mutation>' +
      '      <localname name="out"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">out</field>' +
      '    <value name="RETURN">' +
      '      <block type="local_declaration_expression">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <value name="RETURN">' +
      '          <block type="local_declaration_expression" id="root">' +
      '            <mutation>' +
      '              <localname name="b"></localname>' +
      '            </mutation>' +
      '            <field name="VAR0">b</field>' +
      '            <value name="DECL0">' +
      '              <block type="lexical_variable_get" id="a">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '            <value name="RETURN">' +
      '              <block type="lexical_variable_get" id="b">' +
      '                <field name="VAR">a</field>' +
      '              </block>' +
      '            </value>' +
      '          </block>' +
      '        </value>' +
      '      </block>' +
      '    </value>' +
      '  </block>' +
      '</xml>');
      this.assertReference(xml, 'a', ['a', 'b'], ['b']);
    });
  });
  suite('Renaming', function() {
    setup(function() {
      this.getVarsFor = function(blockIds) {
        return blockIds.map((id) => {
          return this.workspace.getBlockById(id).getVars()[0];
        });
      }
    })
    teardown(function() {
      delete this.getVarsFor;
    })
    test('Rename Capturables', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="local_declaration_statement" id="rename">' +
      '    <mutation>' +
      '      <localname name="old"></localname>' +
      '    </mutation>' +
      '    <field name="VAR0">old</field>' +
      '    <statement name="STACK">' +
      '      <block type="local_declaration_statement" id="4">' +
      '        <mutation>' +
      '          <localname name="new"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">new</field>' +
      '        <statement name="STACK">' +
      '          <block type="lexical_variable_set" id="2">' +
      '            <field name="VAR">old</field>' +
      '            <value name="VALUE">' +
      '              <block type="lexical_variable_get" id="3">' +
      '                <field name="VAR">old</field>' +
      '              </block>' +
      '            </value>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('rename');
      // Ideally we would test using components, but that's not really possible.
      LexicalVariable.renameParamFromTo(block, 'old', 'new', true);

      let actualVars = this.getVarsFor(['2', '3']);
      chai.assert.sameMembers(actualVars, ['new', 'new']);

      actualVars = this.getVarsFor(['4'])
      chai.assert.sameMembers(actualVars, ['new2']);
    });
    suite.skip('Globals', function() {
      setup(function() {
        this.assertGlobalRename = function(xml, newName, ids, expected) {
          Blockly.Xml.domToWorkspace(xml, this.workspace);
          const block = this.workspace.getBlockById('rename');
          block.setFieldValue(newName, 'NAME');

          const expectedVars = ids.map(() => { return 'global ' + expected });
          const actualVars = this.getVarsFor(ids);
          chai.assert.sameMembers(actualVars, expectedVars);
        }
      });
      teardown(function() {
        delete this.assertGlobalRename;
      })
      test('Simple', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="global_declaration" id="rename">' +
        '    <field name="NAME">old</field>' +
        '  </block>' +
        '  <block type="lexical_variable_set" id="1">' +
        '    <field name="VAR">global old</field>' +
        '    <value name="VALUE">' +
        '      <block type="lexical_variable_get" id="2">' +
        '        <field name="VAR">global old</field>' +
        '      </block>' +
        '    </value>' +
        '  </block>' +
        '</xml>');
        this.assertGlobalRename(xml, 'new', ['1', '2'], 'new');
      });
      test('Nested', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="global_declaration" id="rename">' +
        '    <field name="NAME">old</field>' +
        '  </block>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <value name="DECL0">' +
        '      <block type="lexical_variable_get" id="1">' +
        '        <field name="VAR">global old</field>' +
        '      </block>' +
        '    </value>' +
        '    <statement name="STACK">' +
        '      <block type="lexical_variable_set" id="2">' +
        '        <field name="VAR">global old</field>' +
        '        <value name="VALUE">' +
        '          <block type="lexical_variable_get" id="3">' +
        '            <field name="VAR">global old</field>' +
        '          </block>' +
        '        </value>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertGlobalRename(xml, 'new', ['1', '2', '3'], 'new');
      });
      test('Collision', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="global_declaration" id="rename">' +
        '    <field name="NAME">old</field>' +
        '  </block>' +
        '  <block type="global_declaration">' +
        '    <field name="NAME">new</field>' +
        '  </block>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <value name="DECL0">' +
        '      <block type="lexical_variable_get" id="1">' +
        '        <field name="VAR">global old</field>' +
        '      </block>' +
        '    </value>' +
        '    <statement name="STACK">' +
        '      <block type="lexical_variable_set" id="2">' +
        '        <field name="VAR">global old</field>' +
        '        <value name="VALUE">' +
        '          <block type="lexical_variable_get" id="3">' +
        '            <field name="VAR">global old</field>' +
        '          </block>' +
        '        </value>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertGlobalRename(xml, 'new', ['1', '2', '3'], 'new2');
      });
    });
    suite('Nesting Locals', function() {
      setup(function() {
        this.assertLocalRename = function(xml, newName, ids, expected) {
          Blockly.Xml.domToWorkspace(xml, this.workspace);
          const block = this.workspace.getBlockById('rename');
          block.setFieldValue(newName, 'VAR0');

          const actualVars = this.getVarsFor(ids);
          const expectedVars = ids.map(() => { return expected });
          chai.assert.sameMembers(actualVars, expectedVars);
        }
      })
      test('Simple', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement" id="rename">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="other"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">other</field>' +
        '        <value name="DECL0">' +
        '          <block type="lexical_variable_get" id="1">' +
        '            <field name="VAR">old</field>' +
        '          </block>' +
        '        </value>' +
        '        <statement name="STACK">' +
        '          <block type="lexical_variable_set" id="2">' +
        '            <field name="VAR">old</field>' +
        '            <value name="VALUE">' +
        '              <block type="lexical_variable_get" id="3">' +
        '                <field name="VAR">old</field>' +
        '              </block>' +
        '            </value>' +
        '          </block>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLocalRename(xml, 'new', ['1', '2', '3'], 'new');
      });
      test('Some Renames in Scope', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement" id="rename">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        // Overlap.
        '          <localname name="old"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">old</field>' +
        '        <value name="DECL0">' +
        '          <block type="lexical_variable_get" id="1">' +
        '            <field name="VAR">old</field>' +
        '          </block>' +
        '        </value>' +
        '        <statement name="STACK">' +
        '          <block type="lexical_variable_set" id="2">' +
        '            <field name="VAR">old</field>' +
        '            <value name="VALUE">' +
        '              <block type="lexical_variable_get" id="3">' +
        '                <field name="VAR">old</field>' +
        '              </block>' +
        '            </value>' +
        '          </block>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLocalRename(xml, 'new', ['2', '3'], 'old');
        const block = this.workspace.getBlockById('1');
        chai.assert.equal(block.getVars(), 'new');
      });
      test('Rename on Nested', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <value name="DECL0">' +
        '      <block type="lexical_variable_get" id="4">' +
        '        <field name="VAR">old</field>' +
        '      </block>' +
        '    </value>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement" id="rename">' +
        '        <mutation>' +
        '          <localname name="old"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">old</field>' +
        '        <value name="DECL0">' +
        '          <block type="lexical_variable_get" id="1">' +
        '            <field name="VAR">old</field>' +
        '          </block>' +
        '        </value>' +
        '        <statement name="STACK">' +
        '          <block type="lexical_variable_set" id="2">' +
        '            <field name="VAR">old</field>' +
        '            <value name="VALUE">' +
        '              <block type="lexical_variable_get" id="3">' +
        '                <field name="VAR">old</field>' +
        '              </block>' +
        '            </value>' +
        '          </block>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLocalRename(xml, 'new', ['2', '3'], 'new');
        let block = this.workspace.getBlockById('4');
        chai.assert.equal(block.getVars(), 'old');
        block = this.workspace.getBlockById('1');
        chai.assert.equal(block.getVars(), 'old');
      });
      test('Overlap - Rename Outer - Allowed', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement" id="rename">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="new"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">new</field>' +
        '        <value name="DECL0">' +
        '          <block type="lexical_variable_get" id="1">' +
        '            <field name="VAR">old</field>' +
        '          </block>' +
        '        </value>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLocalRename(xml, 'new', ['1'], 'new');
      });
      test('Overlap - Rename Outer - Not Allowed', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement" id="rename">' +
        '    <mutation>' +
        '      <localname name="old"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">old</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement">' +
        '        <mutation>' +
        '          <localname name="new"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">new</field>' +
        '        <value name="DECL0">' +
        '          <block type="lexical_variable_get" id="1">' +
        '            <field name="VAR">old</field>' +
        '          </block>' +
        '        </value>' +
        '        <statement name="STACK">' +
        '          <block type="lexical_variable_set" id="2">' +
        '            <field name="VAR">old</field>' +
        '            <value name="VALUE">' +
        '              <block type="lexical_variable_get" id="3">' +
        '                <field name="VAR">old</field>' +
        '              </block>' +
        '            </value>' +
        '          </block>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLocalRename(xml, 'new', ['1', '2', '3'], 'new2');
      })
      test('Overlap - Rename Inner', function() {
        const xml = Blockly.Xml.textToDom('<xml>' +
        '  <block type="local_declaration_statement">' +
        '    <mutation>' +
        '      <localname name="new"></localname>' +
        '    </mutation>' +
        '    <field name="VAR0">new</field>' +
        '    <statement name="STACK">' +
        '      <block type="local_declaration_statement" id="rename">' +
        '        <mutation>' +
        '          <localname name="old"></localname>' +
        '        </mutation>' +
        '        <field name="VAR0">old</field>' +
        '        <value name="DECL0">' +
        '          <block type="lexical_variable_get" id="1">' +
        '            <field name="VAR">old</field>' +
        '          </block>' +
        '        </value>' +
        '        <statement name="STACK">' +
        '          <block type="lexical_variable_set" id="2">' +
        '            <field name="VAR">old</field>' +
        '            <value name="VALUE">' +
        '              <block type="lexical_variable_get" id="3">' +
        '                <field name="VAR">old</field>' +
        '              </block>' +
        '            </value>' +
        '          </block>' +
        '        </statement>' +
        '      </block>' +
        '    </statement>' +
        '  </block>' +
        '</xml>');
        this.assertLocalRename(xml, 'new', ['2', '3'], 'new');
        const block = this.workspace.getBlockById('1');
        chai.assert.equal(block.getVars(), 'old');
      })
    });
  });
  suite('updateMutation', function() {
    setup(function() {
      Blockly.Events.disable();
      this.oldDef = {};
      Object.assign(this.oldDef, Blockly.Blocks['component_event']);

      // Mock the component event block for testing.
      Blockly.Blocks['component_event'] = {
        init: function() {
          this.appendStatementInput('DO');
        },

        declaredVariables: function() {
          return ['test'];
        },

        getParameters: function() {
          return [{name: 'test'}];
        }
      }
    });
    teardown(function() {
      this.workspace.clear();
      Blockly.Blocks['component_event'] = this.oldDef;
      Blockly.Events.enable();
    });
    // test('Is Event Param', function() {
    //   // Component mutator is emitted for simplicity.
    //   const xml = Blockly.Xml.textToDom('<xml>' +
    //   '  <block type="component_event">' +
    //   '    <statement name="DO">' +
    //   '      <block type="lexical_variable_set" id="target">' +
    //   '        <field name="VAR">test</field>' +
    //   '      </block>' +
    //   '    </statement>' +
    //   '  </block>' +
    //   '</xml>');
    //   Blockly.Xml.domToWorkspace(xml, this.workspace);
    //   const block = this.workspace.getBlockById('target');
    //   // Calling setFieldValue triggers updateMutation.
    //   block.setFieldValue('test', 'VAR');
    //   chai.assert.equal(block.eventparam, 'test');
    // });
    test('References Global', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="component_event">' +
      '    <statement name="DO">' +
      '      <block type="lexical_variable_set" id="target">' +
      '        <field name="VAR">global test</field>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('target');
      block.setFieldValue('global test', 'VAR');
      chai.assert.equal(block.eventparam, null);
    });
    test('References Lexical', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="component_event">' +
      '    <statement name="DO">' +
      '      <block type="local_declaration_statement">' +
      '      <mutation>' +
      '        <localname name="test"></localname>' +
      '      </mutation>' +
      '      <statement name="STACK">' +
      '        <block type="lexical_variable_set" id="target">' +
      '          <field name="VAR">test</field>' +
      '        </block>' +
      '      </statement>'+
      '    </statement>' +
      '  </block>' +
      '</xml>');
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('target');
      block.setFieldValue('test', 'VAR');
      chai.assert.equal(block.eventparam, null);
    });
    test('No Parent', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="lexical_variable_set" id="target">' +
      '    <field name="VAR">test</field>' +
      '  </block>' +
      '</xml>');
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('target');
      block.eventparam = 'someValue';
      block.setFieldValue('test', 'VAR');
      chai.assert.equal(block.eventparam, 'someValue');
    });
  });
  suite('freeVariables', function() {
    setup(function() {
      Blockly.Events.disable();
      this.assertFree = function(xml, expectedFree) {
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        const block = this.workspace.getBlockById('target');
        const actualFree = LexicalVariable.freeVariables(block);
        //console.log(actualFree, expectedFree);
        chai.assert.deepEqual(actualFree, new NameSet(expectedFree));
      }
    })
    teardown(function() {
      Blockly.Events.enable();
      delete this.assertFree;
    })
    test('Directly Next', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <next>' +
      '      <block type="lexical_variable_set">' +
      '        <field name="VAR">a</field>' +
      '      </block>' +
      '    </next>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['a']);
    });
    test('Eventually Next', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <next>' +
      '      <block type="controls_if">' +
      '        <next>' +
      '          <block type="lexical_variable_set">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </next>' +
      '      </block>' +
      '    </next>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['a']);
    })
    test('Directly Inside', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="lexical_variable_set">' +
      '        <field name="VAR">a</field>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['a']);
    });
    test('Eventually Inside', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="controls_if">' +
      '        <statement name="DO0">' +
      '          <block type="lexical_variable_set">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['a']);
    })
    test('Free Inside Lexical', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="lexical_variable_set">' +
      '            <field name="VAR">b</field>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['b']);
    });
    test('Lexical In Scope', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="local_declaration_statement">' +
      '        <mutation>' +
      '          <localname name="a"></localname>' +
      '        </mutation>' +
      '        <field name="VAR0">a</field>' +
      '        <statement name="STACK">' +
      '          <block type="lexical_variable_set">' +
      '            <field name="VAR">a</field>' +
      '            <next>' +
      '              <block type="controls_if">' +
      '                <statement name="DO0">' +
      '                  <block type="lexical_variable_set">' +
      '                    <field name="VAR">b</field>' +
      '                  </block>' +
      '                </statement>' +
      '              </block>' +
      '            </next>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['b']);
    });
    test('Lexical Out of Scope', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
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
      '          <block type="lexical_variable_get">' +
      '            <field name="VAR">b</field>' +
      '          </block>' +
      '       </value>' +
      '       <statement name="STACK">' +
      '         <block type="lexical_variable_set">' +
      '           <field name="VAR">a</field>' +
      '         </block>' +
      '       </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['b']);
    });
    test('ForRange In Scope', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="controls_forRange">' +
      '        <field name="VAR">a</field>' +
      '        <value name="START">' +
      '          <block type="lexical_variable_get">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['a']);
    });
    test('ForRange Out of Scope', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="controls_forRange">' +
      '        <field name="VAR">a</field>' +
      '        <statement name="DO">' +
      '          <block type="lexical_variable_set">' +
      '            <field name="VAR">a</field>' +
      '            <next>' +
      '              <block type="lexical_variable_set">' +
      '                <field name="VAR">b</field>' +
      '              </block>' +
      '            </next>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['b']);
    });
    test('Foreach In Scope', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="controls_forEach">' +
      '        <field name="VAR">a</field>' +
      '        <value name="LIST">' +
      '          <block type="lexical_variable_get">' +
      '            <field name="VAR">a</field>' +
      '          </block>' +
      '        </value>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['a']);
    });
    test('Foreach Out of Scope', function() {
      const xml = Blockly.Xml.textToDom('<xml>' +
      '  <block type="controls_if" id="target">' +
      '    <statement name="DO0">' +
      '      <block type="controls_forEach">' +
      '        <field name="VAR">a</field>' +
      '        <statement name="DO">' +
      '          <block type="lexical_variable_set">' +
      '          <field name="VAR">a</field>' +
      '            <next>' +
      '              <block type="lexical_variable_set">' +
      '                <field name="VAR">b</field>' +
      '              </block>' +
      '            </next>' +
      '          </block>' +
      '        </statement>' +
      '      </block>' +
      '    </statement>' +
      '  </block>' +
      '</xml>');
      this.assertFree(xml, ['b']);
    })
    // test('Foreach Dict In Scope', function() {
    //   const xml = Blockly.Xml.textToDom('<xml>' +
    //   '  <block type="controls_if" id="target">' +
    //   '    <statement name="DO0">' +
    //   '      <block type="controls_for_each_dict">' +
    //   '        <field name="KEY">a</field>' +
    //   '        <field name="VALUE">b</field>' +
    //   '        <value name="DICT">' +
    //   '          <block type="lexical_variable_get">' +
    //   '            <field name="VAR">a</field>' +
    //   '          </block>' +
    //   '        </value>' +
    //   '      </block>' +
    //   '    </statement>' +
    //   '  </block>' +
    //   '</xml>');
    //   this.assertFree(xml, ['a']);
    // });
    // test('Foreach Dict Out of Scope', function() {
    //   const xml = Blockly.Xml.textToDom('<xml>' +
    //   '  <block type="controls_if" id="target">' +
    //   '    <statement name="DO0">' +
    //   '      <block type="controls_for_each_dict">' +
    //   '        <field name="KEY">a</field>' +
    //   '        <field name="VALUE">b</field>' +
    //   '        <statement name="DO">' +
    //   '          <block type="lexical_variable_set">' +
    //   '            <field name="VAR">a</field>' +
    //   '            <next>' +
    //   '              <block type="lexical_variable_set">' +
    //   '                <field name="VAR">b</field>' +
    //   '                <next>' +
    //   '                   <block type="lexical_variable_set">' +
    //   '                     <field name="VAR">c</field>' +
    //   '                   </block>' +
    //   '                 </next>' +
    //   '              </block>' +
    //   '            </next>' +
    //   '          </block>' +
    //   '        </statement>' +
    //   '      </block>' +
    //   '    </statement>' +
    //   '  </block>' +
    //   '</xml>');
    //   this.assertFree(xml, ['c']);
    // })
  })
});
