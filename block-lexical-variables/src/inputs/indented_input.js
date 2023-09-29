// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2023 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

import * as Blockly from 'blockly/core';

/**
 * The IndentedInput represents results of computations that run in a
 * statement-like rather than a value-lke context. In particular, it is useful
 * for representing function bodies and macros that compute values.
 */
export class IndentedInput extends Blockly.inputs.ValueInput {
  /**
   * Construct a new IndentedInput.
   * @param {string} name the name of the input
   * @param {Blockly.Block} block the block the input belongs to
   */
  constructor(name, block) {
    super(name, block);
    this.connection = this.makeConnection(Blockly.ConnectionType.INPUT_VALUE);
    this.type = Blockly.inputTypes.VALUE;
  }
}

Blockly.registry.register(Blockly.registry.Type.INPUT, 'indented_input',
    IndentedInput);
