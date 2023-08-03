// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @fileoverview Block utilities for Blockly, modified for App Inventor
 * @author mckinney@mit.edu (Andrew F. McKinney)
 * @author hal@mit.edu (Hal Abelson)
 * @author fraser@google.com (Neil Fraser)
 * Due to the frequency of long strings, the 80-column wrap rule need not apply
 * to language files.
 */

'use strict';

import Blockly from 'blockly';

/**
 * Checks that the given otherConnection is compatible with an InstantInTime
 * connection. If the workspace is currently loading (eg the blocks are not
 * yet rendered) this always returns true for backwards compatibility.
 * @param {!Blockly.Connection} myConn The parent connection.
 * @param {!Blockly.Connection} otherConn The child connection.
 */
export const InstantInTime = function (myConn, otherConn) {
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
        'output': ['Number', 'String', 'Key']
    },
    'text': {
        'input': ['String'],
        'output': ['Number', 'String', 'Key']
    },
    'boolean': {
        'input': ['Boolean'],
        'output': ['Boolean', 'String']
    },
    'list': {
        'input': ['Array'],
        'output': ['Array', 'String']
    },
    'component': {
        'input': ['COMPONENT'],
        'output': ['COMPONENT', 'Key']
    },
    'InstantInTime': {
        'input': ['InstantInTime', InstantInTime],
        'output': ['InstantInTime', InstantInTime],
    },
    'any': {
        'input': null,
        'output': null
    },
    'dictionary': {
        'input': ['Dictionary'],
        'output': ['Dictionary', 'String', 'Array']
    },
    'pair': {
        'input': ['Pair'],
        'output': ['Pair', 'String', 'Array']
    },
    'key': {
        'input': ['Key'],
        'output': ['String', 'Key']
    },
    'enum': {
        'input': null,
        'output': ['Key']
    }
};

export const OUTPUT = 'output';
export const INPUT = 'input';

/**
 * Gets the equivalent Blockly type for a given Yail type.
 * @param {string} yail The Yail type.
 * @param {!string} inputOrOutput Either Utilities.OUTPUT or Utilities.INPUT.
 * @param {Array<string>=} opt_currentType A type array to append, or null.
 */
export const YailTypeToBlocklyType = function(yail, inputOrOutput) {
    if (yail.indexOf('Enum') != -1) {
        return yail;
    }

    var type = Blockly.Blocks.Utilities
        .YailTypeToBlocklyTypeMap[yail][inputOrOutput];
    if (type === undefined) {
        throw new Error("Unknown Yail type: " + yail + " -- YailTypeToBlocklyType");
    }
    return type;
};

/**
 * Returns the blockly type associated with the given helper key, or null if
 * there is not one.
 * @param {!HelperKey} helperKey The helper key to find the equivalent blockly
 *     type of.
 * @param {!Blockly.Block} block The block which we will apply the type to. Used
 *     to access the component database etc.
 * @return {*} Something to add to the components array, or null/undefined.
 */
export const helperKeyToBlocklyType = function(helperKey, block) {
    if (!helperKey) {
        return null;
    }
    var utils = Blockly.Blocks.Utilities;
    switch (helperKey.type) {
        case "OPTION_LIST":
            return utils.optionListKeyToBlocklyType(helperKey.key, block);
        case "ASSET":
            return utils.assetKeyToBlocklyType(helperKey.key, block);
    }
    return null;
}

/**
 * Returns the blockly type associated with the given option list helper key.
 * @param {HelperKey} key The key to find the equivalent blockly type of.
 * @param {!Blockly.Block} block The block which we will apply the type to. Used
 *     to access the component database etc.
 * @return {!string} The correct string representation of the type.
 */
export const optionListKeyToBlocklyType = function(key, block) {
    var optionList = block.getTopWorkspace().getComponentDatabase()
        .getOptionList(key);
    return optionList.className + 'Enum';
}

/**
 * Returns a filter array associated with the given key. This can be added to
 * the connections type check. It causes any asset blocks attached to that
 * connection to filter their dropdowns.
 * @param {number=} key The key associated with a filter.
 * @param {!Blockly.Block} block The block to apply the filter to.
 * @return {Array<!string>=} An array of filters for use in filtering an
 *     attached assets block.
 */
export const assetKeyToBlocklyType = function(key, block) {
    return block.getTopWorkspace().getComponentDatabase().getFilter(key);
}


// Blockly doesn't wrap tooltips, so these can get too wide.  We'll create our own tooltip setter
// that wraps to length 60.

export const setTooltip = function(block, tooltip) {
    block.setTooltip(wrapSentence(tooltip, 60));
};

// Wrap a string by splitting at spaces. Permit long chunks if there
// are no spaces.

export const wrapSentence = function(str, len) {
    str = str.trim();
    if (str.length < len) return str;
    var place = (str.lastIndexOf(" ", len));
    if (place == -1) {
        return str.substring(0, len).trim() + wrapSentence(str.substring(len), len);
    } else {
        return str.substring(0, place).trim() + "\n" +
            wrapSentence(str.substring(place), len);
    }
};

// Change the text of collapsed blocks on rename
// Recurse to fix collapsed parents

export const MAX_COLLAPSE = 4;

// unicode multiplication symbol
export const times_symbol = '\u00D7';

/**
 * Regular expression for floating point numbers.
 *
 * @type {!RegExp}
 * @const
 */
export const NUMBER_REGEX =
    new RegExp("^([-+]?[0-9]+)?(\\.[0-9]+)?([eE][-+]?[0-9]+)?$|" +
        "^[-+]?[0-9]+(\\.[0-9]*)?([eE][-+]?[0-9]+)?$");
