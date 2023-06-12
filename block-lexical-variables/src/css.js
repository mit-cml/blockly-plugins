'use strict';

import * as Blockly from 'blockly/core';

/**
 * Array making up the extra CSS content for added Blockly fields.
 */
const EXTRA_CSS = `
  .blocklyFieldParameter>rect {
    fill: rgb(222, 143, 108);
    fill-opacity: 1.0;
    stroke-width: 2;
    stroke: rgb(231, 175, 150);
  }
  .blocklyFieldParameter>text {
    stroke-width: 1;
    fill: #000;
  }
  .blocklyFieldParameter:hover>rect {
    stroke-width: 2;
    stroke: rgb(231,175,150);
    fill: rgb(231,175,150);
    fill-opacity: 1.0;
  }
  /*
   * [lyn, 10/08/13] Control flydown with the getter/setter blocks.
   */
  .blocklyFieldParameterFlydown {
    fill: rgb(231,175,150);
    fill-opacity: 0.8;
  }
  /*
   * [lyn, 10/08/13] Control parameter fields with flydown procedure
   * caller block.
   */
  .blocklyFieldProcedure>rect {
    fill: rgb(215,203,218);
    fill-opacity: 1.0;
    stroke-width: 0;
    stroke: #000;
  }
  .blocklyFieldProcedure>text {
    fill: #000;
  }
  .blocklyFieldProcedure:hover>rect {
    stroke-width: 2;
    stroke: #fff;
    fill: rgb(215,203,218);
    fill-opacity: 1.0;
  }
  /*
   * [lyn, 10/08/13] Control flydown with the procedure caller block.
   */
  .blocklyFieldProcedureFlydown {
    fill: rgb(215,203,218);
    fill-opacity: 0.8;
  }
`;

/**
 * Register our extra CSS with Blockly.
 */
export function registerCss() {
  Blockly.Css.register(EXTRA_CSS);
}
