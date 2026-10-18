/**
 * @fileoverview Reading translatable strings out of Blockly's message table.
 */

import * as Blockly from 'blockly/core';

/**
 * Reads a Blockly message with a fallback, since `blockly/core` on its own
 * ships no message table.
 *
 * Every string this plugin shows goes through here, so a host that wants to
 * translate one only has to set the matching key on `Blockly.Msg`.
 *
 * @param key The message key.
 * @param fallback The text to use when the key is unset.
 * @returns The message.
 */
export function msg(key: string, fallback: string): string {
  return Blockly.Msg[key] || fallback;
}
