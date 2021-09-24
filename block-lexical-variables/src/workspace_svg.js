import * as Blockly from 'blockly';
import * as WarningHandler from './warningHandler';

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
 * Obtain the {@link Blockly.ProcedureDatabase} associated with the workspace.
 * @return {!Blockly.ProcedureDatabase}
 */
Blockly.WorkspaceSvg.prototype.getProcedureDatabase = function() {
  if (!this.procedureDb_) {
    this.procedureDb_ = new Blockly.ProcedureDatabase(this);
  }
  return this.procedureDb_;
};

/**
 * Get the topmost workspace in the workspace hierarchy.
 * @return {Blockly.WorkspaceSvg}
 */
Blockly.WorkspaceSvg.prototype.getTopWorkspace = function() {
  let parent = this;
  while (parent.targetWorkspace) {
    parent = parent.targetWorkspace;
  }
  return parent;
};

Blockly.WorkspaceSvg.prototype.hideChaff = function() {
  this.flydown_ && this.flydown_.hide();
};

Blockly.WorkspaceSvg.prototype.getWarningHandler = function() {
  return WarningHandler;
};
