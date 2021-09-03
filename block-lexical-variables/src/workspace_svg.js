import * as Blockly from 'blockly/core';

/**
 * Shared flydown for parameters and variables.
 * @type {Blockly.Flydown}
 * @private
 */
Blockly.WorkspaceSvg.prototype.flydown_ = null;

Blockly.WorkspaceSvg.prototype.getFlydown = function() {
  return this.flydown_;
};

/**
 * Get the topmost workspace in the workspace hierarchy.
 * @returns {Blockly.WorkspaceSvg}
 */
Blockly.WorkspaceSvg.prototype.getTopWorkspace = function() {
  var parent = this;
  while (parent.targetWorkspace) {
    parent = parent.targetWorkspace;
  }
  return parent;
};

Blockly.WorkspaceSvg.prototype.hideChaff = function() {
  this.flydown_ && this.flydown_.hide();
};
