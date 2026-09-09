/**
 * @fileoverview Tests for who may lock and unlock a note.
 *
 * The context menu's own preconditions cannot be reached headlessly — they
 * narrow on `instanceof Note`, and a Node test can only build a `NoteComment`
 * — so the rule they consult is tested here directly instead.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import {NoteComment, WorkspaceNotes} from '../src/index';
import {
  canToggleLock,
  clearLockPermission,
  setLockPermission,
} from '../src/ui/lock_permission';

suite('Lock permission', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
  });

  teardown(function () {
    clearLockPermission(this.workspace);
    this.workspace.dispose();
  });

  test('a workspace with no rule lets anyone lock', function () {
    const note = new NoteComment(this.workspace);
    assert.isTrue(canToggleLock(note));
  });

  test('a rule that refuses is honoured', function () {
    const note = new NoteComment(this.workspace);
    setLockPermission(this.workspace, () => false);
    assert.isFalse(canToggleLock(note));
  });

  test('the rule is asked about the note in front of it', function () {
    const plain = new NoteComment(this.workspace);
    const titled = new NoteComment(this.workspace);
    titled.setTitle('Brief');
    setLockPermission(this.workspace, (note) => !note.getTitle());
    assert.isTrue(canToggleLock(plain));
    assert.isFalse(canToggleLock(titled));
  });

  test('clearing a rule restores the permissive default', function () {
    const note = new NoteComment(this.workspace);
    setLockPermission(this.workspace, () => false);
    clearLockPermission(this.workspace);
    assert.isTrue(canToggleLock(note));
  });

  // The reason this is held per workspace rather than captured once at
  // registration, the way the palette is: a host running an authoring
  // workspace beside a restricted one must not have the first one's
  // permissions decide for both.
  test('a rule does not leak to another workspace', function () {
    const other = new Blockly.Workspace();
    try {
      setLockPermission(this.workspace, () => false);
      assert.isFalse(canToggleLock(new NoteComment(this.workspace)));
      assert.isTrue(canToggleLock(new NoteComment(other)));
    } finally {
      clearLockPermission(other);
      other.dispose();
    }
  });

  suite('through the plugin', function () {
    test('two instances keep their own rules', function () {
      const other = new Blockly.Workspace();
      const mine = new WorkspaceNotes(this.workspace, {
        contextMenu: false,
        canToggleLock: () => false,
      });
      const theirs = new WorkspaceNotes(other, {contextMenu: false});
      try {
        mine.init();
        theirs.init();
        assert.isFalse(canToggleLock(new NoteComment(this.workspace)));
        assert.isTrue(canToggleLock(new NoteComment(other)));
      } finally {
        mine.dispose();
        theirs.dispose();
        other.dispose();
      }
    });

    test('disposing forgets the rule', function () {
      const plugin = new WorkspaceNotes(this.workspace, {
        contextMenu: false,
        canToggleLock: () => false,
      });
      plugin.init();
      assert.isFalse(canToggleLock(new NoteComment(this.workspace)));
      plugin.dispose();
      assert.isTrue(canToggleLock(new NoteComment(this.workspace)));
    });
  });
});
