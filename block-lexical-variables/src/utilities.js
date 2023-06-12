/**
 * @fileoverview Block utilities for Blockly, modified for App Inventor.
 * @author mckinney@mit.edu (Andrew F. McKinney)
 * @author hal@mit.edu (Hal Abelson)
 * @author fraser@google.com (Neil Fraser)
 * Due to the frequency of long strings, the 80-column wrap rule need not apply
 * to language files.
 */

'use strict';

import * as Blockly from 'blockly/core';
import './msg.js';

/**
 * Checks that the given otherConnection is compatible with an InstantInTime
 * connection. If the workspace is currently loading (eg the blocks are not
 * yet rendered) this always returns true for backwards compatibility.
 * @param {!Blockly.Connection} myConn The parent connection.
 * @param {!Blockly.Connection} otherConn The child connection.
 *
 * @return {boolean}
 */
export const InstantInTime = function(myConn, otherConn) {
  if (!myConn.sourceBlock_.rendered ||
      !otherConn.sourceBlock_.rendered) {
    if (otherConn.check_ && !otherConn.check_.includes('InstantInTime')) {
      otherConn.sourceBlock_.badBlock();
    }
    return true;
  }
  return !otherConn.check_ || otherConn.check_.includes('InstantInTime');
};


// Convert Yail types to Blockly types
// Yail types are represented by strings: number, text, list, any, ...
// Blockly types are represented by objects: Number, String, ...
// and by the string "COMPONENT"
// The Yail type 'any' is repsented by Javascript null, to match
// Blockly's convention
export const YailTypeToBlocklyTypeMap = {
  'number': {
    'input': ['Number'],
    'output': ['Number', 'String', 'Key'],
  },
  'text': {
    'input': ['String'],
    'output': ['Number', 'String', 'Key'],
  },
  'boolean': {
    'input': ['Boolean'],
    'output': ['Boolean', 'String'],
  },
  'list': {
    'input': ['Array'],
    'output': ['Array', 'String'],
  },
  'component': {
    'input': ['COMPONENT'],
    'output': ['COMPONENT', 'Key'],
  },
  'InstantInTime': {
    'input': ['InstantInTime', InstantInTime],
    'output': ['InstantInTime', InstantInTime],
  },
  'any': {
    'input': null,
    'output': null,
  },
  'dictionary': {
    'input': ['Dictionary'],
    'output': ['Dictionary', 'String', 'Array'],
  },
  'pair': {
    'input': ['Pair'],
    'output': ['Pair', 'String', 'Array'],
  },
  'key': {
    'input': ['Key'],
    'output': ['String', 'Key'],
  },
};

export const OUTPUT = 'output';
export const INPUT = 'input';

/**
 * Gets the equivalent Blockly type for a given Yail type.
 * @param {string} yail The Yail type.
 * @param {!string} inputOrOutput Either Utilities.OUTPUT or Utilities.INPUT.
 * @param {Array<string>=} opt_currentType A type array to append, or null.
 *
 * @return {string}
 */
export const yailTypeToBlocklyType = function(yail, inputOrOutput) {
  const type = YailTypeToBlocklyTypeMap[yail][inputOrOutput];
  if (type === undefined) {
    throw new Error('Unknown Yail type: ' + yail + ' -- YailTypeToBlocklyType');
  }
  return type;
};


// Blockly doesn't wrap tooltips, so these can get too wide.  We'll create our
// own tooltip setter that wraps to length 60.

export const setTooltip = function(block, tooltip) {
  block.setTooltip(wrapSentence(tooltip, 60));
};

// Wrap a string by splitting at spaces. Permit long chunks if there
// are no spaces.

export const wrapSentence = function(str, len) {
  str = str.trim();
  if (str.length < len) return str;
  const place = (str.lastIndexOf(' ', len));
  if (place == -1) {
    return str.substring(0, len).trim() +
        wrapSentence(str.substring(len), len);
  } else {
    return str.substring(0, place).trim() + '\n' +
        wrapSentence(str.substring(place), len);
  }
};

/**
 * Returns an array containing just the element children of the given element.
 * @param {Element} element The element whose element children we want.
 * @return {!(Array<!Element>|NodeList<!Element>)} An array or array-like list
 *     of just the element children of the given element.
 */
export const getChildren = function(element) {
  'use strict';
  // We check if the children attribute is supported for child elements
  // since IE8 misuses the attribute by also including comments.
  if (element.children !== undefined) {
    return element.children;
  }
  // Fall back to manually filtering the element's child nodes.
  return Array.prototype.filter.call(element.childNodes, function(node) {
    return node.nodeType == Blockly.utils.dom.NodeType.ELEMENT_NODE;
  });
};

