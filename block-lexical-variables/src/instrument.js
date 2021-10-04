// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Visual blocks editor for MIT App Inventor
 * Instrumentation (timing and statistics) for core blockly functionality
 * that's useful for figuring out where time is being spent.
 * Lyn used this in conjunction with Chrome profiling to speed up
 * loading, dragging, and expanding collapsed blocks in large projecsts.
 *
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

'use strict';

// TODO: Maybe just delete this file and delete all the instrumentation
// booleans since they all are set to true by default.

/** Is instrumentation turned on? */
// isOn = true;
export let isOn = false; // [lyn, 04/08/14] Turn off for production

/**
 * Turn instrumentation on/off.
 * @param bool
 */
export const setOn = function(bool) {
  isOn = bool;
};

/** The following are global flags to control rendering.
 * The default settings give the best performance.
 * Other settings can be use to show slowdowns for different choices/algorithms.
 */

/**
 * [lyn, 04/01/14] Should we use the Blockly.Block.isRenderingOn flag?
 * Default value = true.
 */
export const useIsRenderingOn = true;

/**
 * [lyn, 04/01/14] Should we avoid workspace render in Blockly.Block.onMouseUp_?
 * Default value = true.
 */
export const avoidRenderWorkspaceInMouseUp = true;

/** [lyn, 04/01/14] Global flag to control rendering algorithm,
 * Used to show that renderDown() is better than render() in many situations.
 * Default value = true.
 */
export const useRenderDown = true;

/** [lyn, 04/01/14] Should we avoid renderDown on subblocks of collapsed blocks
 * Default value = true.
 */
export const avoidRenderDownOnCollapsedSubblocks = true;

/** [lyn, 04/01/14] Use Neil's fix to Blockly.Block.getHeightWidth, which
 * sidesteps the inexplicable quadratic problem with getHeightWidth.
 * Default value = true.
 */
export const useNeilGetHeightWidthFix = true;

/** [lyn, 04/01/14] Use my fix to Blockly.Workspace.prototype.getAllBlocks,
 *  which avoids quadratic behavior in Neil's original version.
 */
export const useLynGetAllBlocksFix = true;

/** [lyn, 04/01/14] Use my fix to Blockly.FieldLexicalVariable.getGlobalNames,
 *  which just looks at top blocks in workspace, and not all blocks.
 */
export const useLynGetGlobalNamesFix = true;

/** [lyn, 04/01/14] In
 * Blockly.WarningHandler.checkAllBlocksForWarningsAndErrors,
 * compute Blockly.FieldLexicalVariable.getGlobalNames only once and cache it
 * so that it needn't be computed again.
 */
export const useLynCacheGlobalNames = true;

/** [lyn, 04/05/14] Stats to track improvements in slow removal */
export const stats = {};

export const statNames = [
  'totalTime',
  'topBlockCount',
  'blockCount',
  'domToBlockCalls',
  'domToBlockTime',
  'domToBlockInnerCalls',
  'domToWorkspaceCalls',
  'domToWorkspaceTime',
  'workspaceRenderCalls',
  'workspaceRenderTime',
  'renderCalls',
  // Hard to track without double counting because of its recursive nature. Use
  // renderHereTime instead.
  // "renderTime",
  'renderDownCalls',
  'renderDownTime',
  'renderHereCalls',
  'renderHereTime',
  'getHeightWidthCalls',
  'getHeightWidthTime',
  'getTopBlocksCalls',
  'getTopBlocksTime',
  'getAllBlocksCalls',
  'getAllBlocksTime',
  'getAllBlocksAllocationCalls',
  'getAllBlocksAllocationSpace',
  'checkAllBlocksForWarningsAndErrorsCalls',
  'checkAllBlocksForWarningsAndErrorsTime',
  'scrollBarResizeCalls',
  'scrollBarResizeTime',
  'trashCanPositionCalls',
  'trashCanPositionTime',
  'expandCollapsedCalls',
  'expandCollapsedTime',
];

export const initializeStats = function(name) {
  if (isOn) {
    console.log('Initializing stats for ' + name);
    const names = statNames;
    const stats = stats;
    for (let i = 0, name; name = names[i]; i++) {
      stats[name] = 0;
    }
  }
};

export const displayStats = function(name) {
  if (isOn) {
    const names = statNames;
    const stats = stats;
    console.log('Displaying stats for ' + name + ':');
    console.log('  Instrument.useRenderDown=' +
        useRenderDown);
    console.log('  Instrument.useIsRenderingOn=' +
        useIsRenderingOn);
    console.log('  Instrument.avoidRenderWorkspaceInMouseUp=' +
        avoidRenderWorkspaceInMouseUp);
    console.log('  Instrument.avoidRenderDownOnCollapsedSubblocks=' +
        avoidRenderDownOnCollapsedSubblocks);
    console.log('  Instrument.useNeilGetHeightWidthFix=' +
        useNeilGetHeightWidthFix);
    console.log('  Instrument.useLynGetAllBlocksFix=' +
        useLynGetAllBlocksFix);
    console.log('  Instrument.useLynGetGlobalNamesFix=' +
        useLynGetGlobalNamesFix);
    console.log('  Instrument.useLynCacheGlobalNames=' +
        useLynCacheGlobalNames);
    for (let i = 0, name; name = names[i]; i++) {
      console.log('  ' + name + '=' + stats[name]);
    }
  }
};

export const timer = function(thunk, callback) {
  if (isOn) {
    const start = new Date().getTime();
    const result = thunk();
    const stop = new Date().getTime();
    return callback(result, stop - start);
  } else {
    const result = thunk();
    return callback(result, 0);
  }
};
