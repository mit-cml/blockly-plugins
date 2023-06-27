import * as Blockly from 'blockly/core';
import * as WarningHandler from './warningHandler.js';
import {ProcedureDatabase} from './procedure_database.js';

// This ia a bit kludgey and we'll need a better way to make this play nice with
// apps that already define some of these things (e.g. App Inventor).  It's also
// kludgey in that we're defining methods on both Blockly.Workspace and Blockly.WorkspaceSvg.
// That's to cover the cases where we're not clear which class is actually defining the method.

/**
 * Shared flydown for parameters and variables.
 * @type {Flydown}
 * @private
 */
Blockly.Workspace.prototype.flydown_ = Blockly.Workspace.prototype.flydown_ || null;

Blockly.Workspace.prototype.getFlydown = Blockly.Workspace.prototype.getFlydown || function() {
  return this.flydown_;
};

/**
 * Obtain the {@link Blockly.ProcedureDatabase} associated with the workspace.
 * @return {!Blockly.ProcedureDatabase}
 */
Blockly.Workspace.prototype.getProcedureDatabase = Blockly.Workspace.prototype.getProcedureDatabase || function() {
  if (!this.procedureDb_) {
    this.procedureDb_ = new ProcedureDatabase(this);
  }
  return this.procedureDb_;
};

/**
 * Get the topmost workspace in the workspace hierarchy.
 * @return {Blockly.Workspace}
 */
Blockly.Workspace.prototype.getTopWorkspace = Blockly.Workspace.prototype.getTopWorkspace || function() {
  let parent = this;
  while (parent.targetWorkspace) {
    parent = parent.targetWorkspace;
  }
  return parent;
};

Blockly.Workspace.prototype.getWarningHandler = Blockly.Workspace.prototype.getWarningHandler || function() {
  return WarningHandler;
};

/**
 * Shared flydown for parameters and variables.
 * @type {Flydown}
 * @private
 */
Blockly.WorkspaceSvg.prototype.flydown_ = Blockly.WorkspaceSvg.prototype.flydown_ || null;

Blockly.WorkspaceSvg.prototype.getFlydown = Blockly.WorkspaceSvg.prototype.getFlydown || function() {
  return this.flydown_;
};

/**
 * Obtain the {@link Blockly.ProcedureDatabase} associated with the workspace.
 * @return {!Blockly.ProcedureDatabase}
 */
Blockly.WorkspaceSvg.prototype.getProcedureDatabase = Blockly.WorkspaceSvg.prototype.getProcedureDatabase || function() {
  if (!this.procedureDb_) {
    this.procedureDb_ = new ProcedureDatabase(this);
  }
  return this.procedureDb_;
};

/**
 * Get the topmost workspace in the workspace hierarchy.
 * @return {Blockly.WorkspaceSvg}
 */
Blockly.WorkspaceSvg.prototype.getTopWorkspace = Blockly.WorkspaceSvg.prototype.getTopWorkspace || function() {
  let parent = this;
  while (parent.targetWorkspace) {
    parent = parent.targetWorkspace;
  }
  return parent;
};

Blockly.WorkspaceSvg.prototype.getWarningHandler = Blockly.WorkspaceSvg.prototype.getWarningHandler || function() {
  return WarningHandler;
};
