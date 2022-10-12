/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const chai = require('chai');
const Blockly = require('blockly/node');
const {testHelpers} = require('@blockly/dev-tools');

require('../src/index');

const assert = chai.assert;

const {CodeGenerationTestSuite, runCodeGenerationTestSuites,
  runSerializationTestSuite, SerializationTestCase} = testHelpers;

suite('BlockTemplate', function() {
  /**
   * Asserts that the block has the expected inputs and fields.
   * @param {!Blockly.Block} block The block to check.
   */
  function assertBlockStructure(block) {
    // TODO add relevant parameters and implement.
  }

  setup(function() {
    this.workspace = new Blockly.Workspace();
  });

  teardown(function() {
    this.workspace.dispose();
  });

  suite('Creation', function() {
    // TODO Add basic test for creation of block using newBlock call.
    // const block = this.workspace.newBlock('block_type');
    // assertBlockStructure(block);
  });

  suite('Code generation', function() {
    const trivialCreateBlock = (workspace) => {
      // TODO implement.
      // return workspace.newBlock('block_type');
    };

    /**
     * Test suites for code generation tests.
     * @type {Array<CodeGenerationTestSuite>}
     */
    const testSuites = [
      // TODO Remove unsupported languages.
      // TODO Update expectedCode for all test cases.
      // TODO Add additional useful testCases.
      {title: 'Dart', generator: Blockly.Dart,
        testCases: [
          {title: 'Trivial', expectedCode: 'TODO',
            createBlock: trivialCreateBlock},
        ]},
      {title: 'JavaScript', generator: Blockly.JavaScript,
        testCases: [

          {title: 'Trivial', expectedCode: 'TODO',
            createBlock: trivialCreateBlock},
        ]},
      {title: 'Lua', generator: Blockly.Lua,
        testCases: [
          {title: 'Trivial', expectedCode: 'TODO',
            createBlock: trivialCreateBlock},
        ]},
      {title: 'PHP', generator: Blockly.php,
        testCases: [
          {title: 'Trivial', expectedCode: 'TODO',
            createBlock: trivialCreateBlock},
        ]},
      {title: 'Python', generator: Blockly.Python,
        testCases: [
          {title: 'Trivial', expectedCode: 'TODO',
            createBlock: trivialCreateBlock},
        ]},
    ];
    runCodeGenerationTestSuites(testSuites);
  });


  /**
   * Test cases for serialization tests.
   * @type {Array<SerializationTestCase>}
   */
  const testCases = [
    // TODO update xml and expectedXml.
    {title: 'Empty XML', xml: '<block type="block_type"/>',
      expectedXml:
          '<block xmlns="https://developers.google.com/blockly/xml" ' +
          'type="block_type" id="1"></block>',
      assertBlockStructure:
          (block) => {
            // TODO implement.
            // assertBlockStructure(block);
          },
    },
    // TODO add additional test cases.
  ];
  runSerializationTestSuite(testCases);

  // TODO add any other relevant tests
});
