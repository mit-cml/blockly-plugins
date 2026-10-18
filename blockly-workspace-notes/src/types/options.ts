/**
 * @fileoverview What a host application passes in: the plugin's options bag,
 * and the palette entries it may supply.
 */

import type {LockPredicate} from '../ui/lock_permission';

/**
 * One entry in a note palette.
 *
 * `hue` is what the picker sorts and derives from; `fill` is the resolved hex
 * so the swatch does not have to recompute it.
 */
export interface PaletteEntry {
  name: string;
  hue: number;
  fill: string;
}

/**
 * Everything `WorkspaceNotes` accepts.
 */
export interface WorkspaceNotesOptions {
  palette?: PaletteEntry[];
  defaultSize?: {width: number; height: number};
  getAuthor?: () => string;
  canToggleLock?: LockPredicate;
  contextMenu?: boolean;
  skipSerializerRegistration?: boolean;
  emitLegacyComments?: boolean;
  xmlSupport?: boolean;
}
