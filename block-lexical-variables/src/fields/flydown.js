// -*- mode: java; c-basic-offset: 2; -*-
// Copyright © 2013-2016 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Flydown is an abstract class for a flyout-like dropdown
 *     containing blocks. Unlike a regular flyout, for simplicity it does not
 *     support scrolling. Any non-abstract subclass must provide a
 *     flydownBlocksXML_ () method that returns an XML element whose children
 *     are blocks that should appear in the flyout.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */
'use strict';

import * as Blockly from 'blockly/core';
import {FieldFlydown} from './field_flydown.js';

/**
 * Class for a flydown.
 * @constructor
 * @param workspaceOptions
 */
export class Flydown extends Blockly.VerticalFlyout {
  constructor(workspaceOptions) {
    super(workspaceOptions);
    this.dragAngleRange_ = 360;
  }
};

/**
 * Previous CSS class for this flydown.
 * @type {string}
 */
Flydown.prototype.previousCSSClassName_ = '';

/**
 * Override flyout factor to be smaller for flydowns.
 * @type {number}
 * @const
 */
Flydown.prototype.VERTICAL_SEPARATION_FACTOR = 1;

/**
 * Creates the flydown's DOM.  Only needs to be called once.  Overrides the
 * flyout createDom method.
 * @param {!String} cssClassName The name of the CSS class for this flydown.
 * @return {!Element} The flydown's SVG group.
 */
Flydown.prototype.createDom = function(cssClassName) {
  /*
  <g>
    <path class={cssClassName}/>
    <g></g>
  </g>
  */
  this.previousCSSClassName_ = cssClassName; // Remember class name for later
  this.svgGroup_ =
      Blockly.utils.dom.createSvgElement('g', {'class': cssClassName}, null);
  this.svgBackground_ =
      Blockly.utils.dom.createSvgElement('path', {}, this.svgGroup_);
  this.svgGroup_.appendChild(this.workspace_.createDom());
  return this.svgGroup_;
};

/**
 * Set the CSS class of the flydown SVG group. Need to remove previous class if
 * there is one.
 * @param {!String} newCSSClassName The name of the new CSS class replacing the
 *     old one.
 */
Flydown.prototype.setCSSClass = function(newCSSClassName) {
  if (newCSSClassName !== this.previousCSSClassName_) {
    Blockly.utils.dom.removeClass(this.svgGroup_, this.previousCSSClassName_);
    Blockly.utils.dom.addClass(this.svgGroup_, newCSSClassName);
    this.previousCSSClassName_ = newCSSClassName;
  }
};

/**
 * Initializes the Flydown.
 * @param {!Blockly.Workspace} workspace The workspace in which to create new
 *     blocks.
 */
Flydown.prototype.init = function(workspace) {
  // Flydowns have no scrollbar
  Blockly.Flyout.prototype.init.call(this, workspace, false);
  this.workspace_.setTheme(workspace.getTheme());
  workspace.getComponentManager().addCapability(this.id,
      Blockly.ComponentManager.Capability.AUTOHIDEABLE);
};

/**
 * Override the flyout position method to do nothing instead.
 * @private
 */
Flydown.prototype.position = function() {
  return;
};

/**
 * Show and populate the flydown.
 * @param {!Array|string} xmlList List of blocks to show.
 * @param {!num} x X-position of upper-left corner of flydown.
 * @param {!num} y Y-position of upper-left corner of flydown.
 */
Flydown.prototype.showAt = function(xmlList, x, y) {
  Blockly.Events.disable();
  try {
    // invoke flyout method, which adds blocks to flydown
    // and calculates width and height.
    this.show(xmlList);
  } finally {
    Blockly.Events.enable();
  }
  // this.svgGroup_.setAttribute('transform', 'translate(' + x + ',' + y +
  // ')');
  // Calculate path around flydown blocks. Based on code in flyout position_
  // method.

  // Start at bottom of top left arc and proceed clockwise
  // Flydown outline shape is symmetric about vertical axis, so no need to
  // differentiate LTR and RTL paths.
  const margin = this.CORNER_RADIUS * this.workspace_.scale;
  const edgeWidth = this.width_ - 2 * margin;
  const edgeHeight = this.height_ - 2 * margin;
  const path = ['M 0,' + margin];
  path.push('a', margin, margin, 0, 0, 1, margin, -margin); // upper left arc
  path.push('h', edgeWidth); // top edge
  path.push('a', margin, margin, 0, 0, 1, margin, margin); // upper right arc
  path.push('v', edgeHeight); // right edge
  path.push('a', margin, margin, 0, 0, 1, -margin, margin); // bottom right arc
  path.push('h', -edgeWidth); // bottom edge, drawn backwards
  path.push('a', margin, margin, 0, 0, 1, -margin, -margin); // bottom left arc
  path.push('z'); // complete path by drawing left edge
  this.svgBackground_.setAttribute('d', path.join(' '));
  this.svgGroup_.setAttribute('transform', 'translate(' + x + ', ' + y + ')');
};

/**
 * Compute width and height of Flydown.  Position button under each block.
 * Overrides the reflow method of flyout
 * For RTL: Lay out the blocks right-aligned.
 */
Flydown.prototype.reflow = function() {
  this.workspace_.scale = this.targetWorkspace.scale;
  const scale = this.workspace_.scale;
  let flydownWidth = 0;
  let flydownHeight = 0;
  const margin = this.CORNER_RADIUS * scale;
  const blocks = this.workspace_.getTopBlocks(false);
  for (let i = 0, block; block = blocks[i]; i++) {
    const blockHW = block.getHeightWidth();
    flydownWidth = Math.max(flydownWidth, blockHW.width * scale);
    flydownHeight += blockHW.height * scale;
  }
  flydownWidth += 2 * margin + this.tabWidth_ * scale; // tabWidth is width of
  // a plug
  const rendererConstants = this.workspace_.getRenderer().getConstants();
  const startHatHeight = rendererConstants.ADD_START_HATS ?
      rendererConstants.START_HAT_HEIGHT : 0;
  flydownHeight += 3 * margin +
      margin * this.VERTICAL_SEPARATION_FACTOR * (blocks.length) +
      startHatHeight * scale / 2.0;
  if (this.width_ != flydownWidth) {
    for (let j = 0, block; block = blocks[j]; j++) {
      const blockHW = block.getHeightWidth();
      const blockXY = block.getRelativeToSurfaceXY();
      if (this.RTL) {
        // With the FlydownWidth known, right-align the blocks.
        const dx = flydownWidth - margin - scale * (this.tabWidth_ - blockXY.x);
        block.moveBy(dx, 0);
        blockXY.x += dx;
      }
      if (block.flyoutRect_) {
        block.flyoutRect_.setAttribute('width', blockHW.width);
        block.flyoutRect_.setAttribute('height', blockHW.height);
        block.flyoutRect_.setAttribute('x',
            this.RTL ? blockXY.x - blockHW.width : blockXY.x);
        block.flyoutRect_.setAttribute('y', blockXY.y);
      }
    }
    // Record the width for us in showAt method
    this.width_ = flydownWidth;
    this.height_ = flydownHeight;
  }
};

Flydown.prototype.onMouseMove_ = function(e) {
  // override Blockly's flyout behavior for moving the flyout.
  return;
};

/**
 * Copy a block from the flyout to the workspace and position it correctly.
 * @param {!Blockly.Block} originBlock The flyout block to copy..
 * @return {!Blockly.Block} The new block in the main workspace.
 * @private
 */
Flydown.prototype.placeNewBlock_ = function(originBlock) {
  const targetWorkspace = this.targetWorkspace;
  const svgRootOld = originBlock.getSvgRoot();
  if (!svgRootOld) {
    throw Error('originBlock is not rendered.');
  }
  // Figure out where the original block is on the screen, relative to the upper
  // left corner of the main workspace.
  let scale = this.workspace_.scale;
  // const margin = this.CORNER_RADIUS * scale;
  const xyOld = this.workspace_.getSvgXY(svgRootOld);
  // var scrollX = this.svgGroup_.getScreenCTM().e + margin;
  const scrollX = xyOld.x;
  xyOld.x += scrollX / targetWorkspace.scale - scrollX;
  // var scrollY = this.svgGroup_.getScreenCTM().f + margin;
  const scrollY = xyOld.y;
  scale = targetWorkspace.scale;
  xyOld.y += scrollY / scale - scrollY;

  // Create the new block by cloning the block in the flyout (via XML).
  const xml = Blockly.Xml.blockToDom(originBlock);
  const block = Blockly.Xml.domToBlock(xml, targetWorkspace);
  const svgRootNew = block.getSvgRoot();
  if (!svgRootNew) {
    throw Error('block is not rendered.');
  }
  // Figure out where the new block got placed on the screen, relative to the
  // upper left corner of the workspace.  This may not be the same as the
  // original block because the flyout's origin may not be the same as the
  // main workspace's origin.
  const xyNew = targetWorkspace.getSvgXY(svgRootNew);
  // Scale the scroll (getSvgXY did not do this).
  xyNew.x +=
      targetWorkspace.scrollX / targetWorkspace.scale - targetWorkspace.scrollX;
  xyNew.y +=
      targetWorkspace.scrollY / targetWorkspace.scale - targetWorkspace.scrollY;
  // If the flyout is collapsible and the workspace can't be scrolled.
  if (targetWorkspace.toolbox_ && !targetWorkspace.scrollbar) {
    xyNew.x += targetWorkspace.toolbox_.getWidth() / targetWorkspace.scale;
    xyNew.y += targetWorkspace.toolbox_.getHeight() / targetWorkspace.scale;
  }

  // Move the new block to where the old block is.
  block.moveBy(xyOld.x - xyNew.x, xyOld.y - xyNew.y);
  return block;
};

Flydown.prototype.shouldHide = true;

Flydown.prototype.hide = function() {
  if (this.shouldHide) {
    Blockly.Flyout.prototype.hide.call(this);
    FieldFlydown.openFieldFlydown_ = null;
  }
  this.shouldHide = true;
};

Flydown.prototype.autoHide = function() {
  this.hide();
};

// Note: nothing additional beyond flyout disposal needs to be done to dispose
// of a flydown.
