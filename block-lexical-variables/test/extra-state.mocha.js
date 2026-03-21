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

suite('saveExtraState / loadExtraState', function() {
  setup(function() {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
  });
  teardown(function() {
    this.workspace.dispose();
  });

  suite('procedures_callnoreturn', function() {
    test('round-trip with params', function() {
      // Create a caller block via XML with mutation
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_callnoreturn" id="caller">' +
        '    <mutation name="myProc">' +
        '      <arg name="x"></arg>' +
        '      <arg name="y"></arg>' +
        '    </mutation>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('caller');

      const state = block.saveExtraState();
      chai.assert.equal(state['name'], 'myProc');
      chai.assert.deepEqual(state['params'], ['x', 'y']);

      // Load into a fresh block
      const block2 = this.workspace.newBlock('procedures_callnoreturn');
      block2.loadExtraState(state);
      chai.assert.equal(block2.getFieldValue('PROCNAME'), 'myProc');
      chai.assert.deepEqual(block2.arguments_, ['x', 'y']);
    });

    test('loadExtraState from flyout JSON format', function() {
      // Simulate what Blockly 12 flyoutCategory produces
      const block = this.workspace.newBlock('procedures_callnoreturn');
      block.loadExtraState({name: 'doSomething', params: ['a', 'b']});

      chai.assert.equal(block.getFieldValue('PROCNAME'), 'doSomething');
      chai.assert.deepEqual(block.arguments_, ['a', 'b']);
    });

    test('loadExtraState with no params', function() {
      const block = this.workspace.newBlock('procedures_callnoreturn');
      block.loadExtraState({name: 'noArgs'});

      chai.assert.equal(block.getFieldValue('PROCNAME'), 'noArgs');
      chai.assert.deepEqual(block.arguments_, []);
    });

    test('loadExtraState does not mutate input state', function() {
      const state = {name: 'proc', params: ['x', 'y']};
      const originalParams = state.params.slice();

      const block = this.workspace.newBlock('procedures_callnoreturn');
      block.loadExtraState(state);

      chai.assert.deepEqual(state.params, originalParams);
    });
  });

  suite('procedures_callreturn', function() {
    test('round-trip with params', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_callreturn" id="caller">' +
        '    <mutation name="getVal">' +
        '      <arg name="n"></arg>' +
        '    </mutation>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('caller');

      const state = block.saveExtraState();
      chai.assert.equal(state['name'], 'getVal');
      chai.assert.deepEqual(state['params'], ['n']);

      const block2 = this.workspace.newBlock('procedures_callreturn');
      block2.loadExtraState(state);
      chai.assert.equal(block2.getFieldValue('PROCNAME'), 'getVal');
      chai.assert.deepEqual(block2.arguments_, ['n']);
    });
  });

  suite('procedures_defnoreturn', function() {
    test('round-trip with params', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_defnoreturn" id="def">' +
        '    <mutation>' +
        '      <arg name="a"></arg>' +
        '      <arg name="b"></arg>' +
        '    </mutation>' +
        '    <field name="NAME">myFunc</field>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('def');

      const state = block.saveExtraState();
      chai.assert.deepEqual(state['params'], ['a', 'b']);
      chai.assert.isUndefined(state['verticalParameters']);
    });

    test('round-trip with vertical parameters', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_defnoreturn" id="def">' +
        '    <mutation vertical_parameters="true">' +
        '      <arg name="x"></arg>' +
        '    </mutation>' +
        '    <field name="NAME">myFunc</field>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('def');

      const state = block.saveExtraState();
      chai.assert.deepEqual(state['params'], ['x']);
      chai.assert.isTrue(state['verticalParameters']);

      const block2 = this.workspace.newBlock('procedures_defnoreturn');
      block2.loadExtraState(state);
      chai.assert.deepEqual(block2.arguments_, ['x']);
      chai.assert.isFalse(block2.horizontalParameters);
    });

    test('round-trip with no params', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_defnoreturn" id="def">' +
        '    <field name="NAME">empty</field>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('def');

      const state = block.saveExtraState();
      chai.assert.isUndefined(state['params']);

      const block2 = this.workspace.newBlock('procedures_defnoreturn');
      block2.loadExtraState(state);
      chai.assert.deepEqual(block2.arguments_, []);
    });

    test('loadExtraState does not mutate input state', function() {
      const state = {params: ['a', 'b']};
      const originalParams = state.params.slice();

      const block = this.workspace.newBlock('procedures_defnoreturn');
      block.loadExtraState(state);

      chai.assert.deepEqual(state.params, originalParams);
    });
  });

  suite('procedures_defreturn', function() {
    test('round-trip with params', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="procedures_defreturn" id="def">' +
        '    <mutation>' +
        '      <arg name="n"></arg>' +
        '    </mutation>' +
        '    <field name="NAME">getVal</field>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('def');

      const state = block.saveExtraState();
      chai.assert.deepEqual(state['params'], ['n']);

      const block2 = this.workspace.newBlock('procedures_defreturn');
      block2.loadExtraState(state);
      chai.assert.deepEqual(block2.arguments_, ['n']);
    });
  });

  suite('local_declaration_statement', function() {
    test('round-trip with names', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="local_declaration_statement" id="local">' +
        '    <mutation>' +
        '      <localname name="a"></localname>' +
        '      <localname name="b"></localname>' +
        '    </mutation>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('local');

      const state = block.saveExtraState();
      chai.assert.deepEqual(state['localNames'], ['a', 'b']);

      const block2 = this.workspace.newBlock('local_declaration_statement');
      block2.loadExtraState(state);
      chai.assert.deepEqual(block2.localNames_, ['a', 'b']);
    });

    test('loadExtraState with empty state preserves default', function() {
      const block = this.workspace.newBlock('local_declaration_statement');
      const defaultNames = block.localNames_.slice();

      block.loadExtraState({});
      chai.assert.deepEqual(block.localNames_, defaultNames);
    });

    test('loadExtraState does not mutate input state', function() {
      const state = {localNames: ['x', 'y']};
      const originalNames = state.localNames.slice();

      const block = this.workspace.newBlock('local_declaration_statement');
      block.loadExtraState(state);

      chai.assert.deepEqual(state.localNames, originalNames);
    });
  });

  suite('local_declaration_expression', function() {
    test('round-trip with names', function() {
      const xml = Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '  <block type="local_declaration_expression" id="local">' +
        '    <mutation>' +
        '      <localname name="c"></localname>' +
        '    </mutation>' +
        '  </block>' +
        '</xml>'
      );
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      const block = this.workspace.getBlockById('local');

      const state = block.saveExtraState();
      chai.assert.deepEqual(state['localNames'], ['c']);

      const block2 = this.workspace.newBlock('local_declaration_expression');
      block2.loadExtraState(state);
      chai.assert.deepEqual(block2.localNames_, ['c']);
    });
  });
});
