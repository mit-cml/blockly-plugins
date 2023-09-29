// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2023 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

import * as Blockly from 'blockly/core';
import {IndentedInput} from '../inputs/indented_input.js';

/**
 * The IndentedInputMeasurable provides the dimensions of the
 * indented input in the rendering pipeline.
 */
class IndentedInputMeasurable extends
  Blockly.blockRendering.ExternalValueInput {
  /**
   * Creates a new IndentedInputMeasurable for the given input assuming the
   * given renderer constants.
   * @param {Blockly.blockRendering.ConstantProvider} constants
   *     the parent renderer's constant pool
   * @param {IndentedInput} input the input measured by this measurable
   */
  constructor(constants, input) {
    super(constants, input);
    if (!this.connectedBlock) {
      this.height = this.constants_.EMPTY_STATEMENT_INPUT_HEIGHT;
    } else {
      this.height = this.connectedBlockHeight;
    }
  }
}

/**
 * An extension of the Geras highlighter to support indented inputs.
 */
export class GerasHighlighter extends Blockly.geras.Highlighter {
  /**
   * Constructs a new Geras highlighter.
   * @param {Blockly.blockRendering.RenderInfo} info the render info state
   */
  constructor(info) {
    super(info);
  }

  /**
   * Renders the indented input present at the specified row.
   * @param {Blockly.blockRendering.Row} row the row being drawn
   */
  drawIndentedInput(row) {
    const input = row.getLastInput();
    if (this.RTL_) {
      const belowTabHeight = row.height - input.connectionHeight -
        input.connectionOffsetY;

      this.steps_ +=
        Blockly.utils.svgPaths.moveTo(
            input.xPos + this.highlightOffset + input.connectionWidth - 1,
            row.yPos) +
        Blockly.utils.svgPaths.lineOnAxis('v', input.connectionOffsetY) +
        this.puzzleTabPaths_.pathDown(this.RTL_) +
        Blockly.utils.svgPaths.lineOnAxis('v', belowTabHeight);
    } else {
      this.steps_ +=
        Blockly.utils.svgPaths.moveTo(input.xPos + input.connectionWidth,
            row.yPos + input.connectionOffsetY) +
        this.puzzleTabPaths_.pathDown(this.RTL_) +
        Blockly.utils.svgPaths.moveTo(input.xPos + input.connectionWidth + 1,
            row.yPos + input.height);
    }
  }
}

/**
 * GerasDrawer is an extension of the Geras Drawer object to handle indented
 * inputs.
 */
export class GerasDrawer extends Blockly.geras.Drawer {
  /**
   * Creates a new Drawer for the block with the given render info.
   * @param {Blockly.BlockSvg} block The block to render.
   * @param {Blockly.blockRendering.RenderInfo} info An object containing all
   *     information needed to render this block.
   */
  constructor(block, info) {
    super(block, info);
    this.highlighter_ = new GerasHighlighter(info);
  }

  /**
   * Create the outline of the block. This is a single continuous path.
   */
  drawOutline_() {
    this.drawTop_();
    for (let r = 1; r < this.info_.rows.length - 1; r++) {
      const row = this.info_.rows[r];
      if (row.getLastInput() instanceof IndentedInputMeasurable) {
        this.drawIndentedInput_(row);
      } else if (row.hasJaggedEdge) {
        this.drawJaggedEdge_(row);
      } else if (row.hasStatement) {
        this.drawStatementInput_(row);
      } else if (row.hasExternalInput) {
        this.drawValueInput_(row);
      } else {
        this.drawRightSideRow_(row);
      }
    }
    this.drawBottom_();
    this.drawLeft_();
  }

  /**
   * Draws an indented input in the block.
   * @param {Blockly.blockRendering.Row} row the row being drawn
   * @private
   */
  drawIndentedInput_(row) {
    const input = row.getLastInput();
    this.positionIndentedValueConnection_(row);
    (/** @type {GerasHighlighter} */ this.highlighter_).drawIndentedInput(row);

    const pathDown = (typeof input.shape.pathDown == 'function') ?
      input.shape.pathDown(input.height) :
      input.shape.pathDown;

    this.outlinePath_ +=
      Blockly.utils.svgPaths.lineOnAxis('H',
          input.xPos + input.connectionWidth) +
      Blockly.utils.svgPaths.lineOnAxis('v', input.connectionOffsetY) +
      pathDown +
      Blockly.utils.svgPaths.lineOnAxis('v',
          row.height - input.connectionHeight - input.connectionOffsetY) +
      Blockly.utils.svgPaths.lineOnAxis('H', input.xPos + input.width);
  }

  positionIndentedValueConnection_ = function(row) {
    const input = row.getLastInput();
    if (input.connectionModel) {
      let connX = row.xPos + row.statementEdge + row.constants_.TAB_WIDTH;
      if (this.info_.RTL) {
        connX *= -1;
      }
      input.connectionModel.setOffsetInBlock(connX,
          row.yPos + input.connectionOffsetY);
    }
  };
}

/**
 * An extension of the Blockly Geras RenderInfo object that understands
 * indented inputs.
 */
export class GerasRenderInfo extends Blockly.geras.RenderInfo {
  /**
   * Adds a measurable for the given input to the active row.
   * @param {Blockly.Input} input the current input being processed
   * @param {Blockly.blockRendering.Row} activeRow the active row
   */
  addInput_(input, activeRow) {
    if (input instanceof IndentedInput) {
      activeRow.elements.push(
          new IndentedInputMeasurable(this.constants_, input)
      );
      activeRow.hasStatement = true;
    } else {
      super.addInput_(input, activeRow);
    }
  }
}

/**
 * The GerasRenderer class provides an extension of the built-in
 * Blockly Geras renderer to support indented inputs in the style of
 * MIT App Inventor.
 */
export class GerasRenderer extends Blockly.geras.Renderer {
  /**
   * @inheritDoc
   * @param {Blockly.BlockSvg} block the block to be rendered
   * @returns {Blockly.geras.RenderInfo} render info object
   * @private
   */
  makeRenderInfo_(block) {
    return new GerasRenderInfo(this, block);
  }

  /**
   * Make a custom Drawer for the GerasRenderer.
   * @param {Blockly.BlockSvg} block a BlockSvg to be drawn
   * @param {Blockly.blockRendering.RenderInfo} info
   *     rendering info for the block
   * @returns {GerasDrawer} the Drawer for the block
   */
  makeDrawer_(block, info) {
    return new GerasDrawer(block, info);
  }
}
