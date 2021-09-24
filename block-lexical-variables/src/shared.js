import * as Blockly from 'blockly';
import './msg';

// TODO: Replace references to YAIL with generic language
/* [Added by paulmw in patch 15]
   There are three ways that you can change how lexical variables
   are handled:

   1. Show prefixes to users, and separate namespace in yail
   Blockly.showPrefixToUser = true;
   Blockly.usePrefixInYail = true;

   2. Show prefixes to users, lexical variables share namespace yail
   Blockly.showPrefixToUser = true;
   Blockly.usePrefixInYail = false;

   3. Hide prefixes from users, lexical variables share namespace yail
   //The default (as of 12/21/12)
   Blockly.showPrefixToUser = false;
   Blockly.usePrefixInYail = false;

   It is not possible to hide the prefix and have separate namespaces
   because Blockly does not allow to items in a list to have the same name
   (plus it would be confusing...)

*/

export const showPrefixToUser = false;
export const usePrefixInYail = false;

/** ****************************************************************************
 [lyn, 12/23-27/2012, patch 16]
 Prefix labels for parameters, locals, and index variables,
 Might want to experiment with different combintations of these. E.g.,
 maybe all non global parameters have prefix "local" or all have prefix "param".
 maybe index variables have prefix "index", or maybe instead they are treated as
 "param".
 */

/**
 * The global keyword. Users may be shown a translated keyword instead but this
 * is the internal token used to identify global variables.
 * @type {string}
 * @const
 */
// used internally to identify global variables; not translated
export const GLOBAL_KEYWORD = 'global';
// For names introduced by procedure/function declarations
export const procedureParameterPrefix = 'input';
// For names introduced by event handlers
export const handlerParameterPrefix = 'input';
// For names introduced by local variable declarations
export const localNamePrefix = 'local';
// For names introduced by for loops
export const loopParameterPrefix = 'item';
// For names introduced by for range loops
export const loopRangeParameterPrefix = 'counter';
// Separate prefix from name with this. E.g., space in "param x"
export const menuSeparator = ' ';

// Curried for convenient use in field_lexical_variable.js
// e.g., "param x" vs "x"
export const possiblyPrefixMenuNameWith = function(prefix) {
  return function(name) {
    return (showPrefixToUser ? (prefix + menuSeparator) : '') +
      name;
  };
};

export const prefixGlobalMenuName = function(name) {
  return Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX +
    menuSeparator + name;
};

// Return a list of (1) prefix (if it exists, "" if not) and (2) unprefixed name
export const unprefixName = function(name) {
  if (name.indexOf(
      Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX + menuSeparator) === 0) {
    // Globals always have prefix, regardless of flags. Handle these specially
    return [
      Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX,
      name.substring(Blockly.Msg.LANG_VARIABLES_GLOBAL_PREFIX.length +
        menuSeparator.length)];
  } else if (name.indexOf(GLOBAL_KEYWORD + menuSeparator) === 0) {
    return [GLOBAL_KEYWORD, name.substring(6 + menuSeparator.length)];
  } else if (!showPrefixToUser) {
    return ['', name];
  } else {
    const prefixes = [
      procedureParameterPrefix,
      handlerParameterPrefix,
      localNamePrefix,
      loopParameterPrefix,
      loopRangeParameterPrefix,
    ];
    for (let i=0; i < prefixes.length; i++) {
      if (name.indexOf(prefixes[i]) === 0) {
        // name begins with prefix
        return [
          prefixes[i],
          name.substring(prefixes[i].length + menuSeparator.length),
        ];
      }
    }
    // Really an error if get here ...
    return ['', name];
  }
};


