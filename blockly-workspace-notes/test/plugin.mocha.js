/**
 * @fileoverview Lifecycle tests: what `init` replaces, and whether `dispose`
 * gives all of it back.
 *
 * The registries have their own coverage in the suites that use them. What is
 * checked here is the state that is *not* a registry — the statics and
 * instance properties the plugin writes on core — because nothing else would
 * notice if one of them were left behind.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import {WorkspaceNotes} from '../src/index';

suite('Plugin lifecycle', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
  });

  teardown(function () {
    this.workspace.dispose();
  });

  suite('defaultCommentSize', function () {
    test('init applies the configured default size', function () {
      const plugin = new WorkspaceNotes(this.workspace, {
        contextMenu: false,
        defaultSize: {width: 300, height: 200},
      });
      plugin.init();
      try {
        const size = Blockly.comments.CommentView.defaultCommentSize;
        assert.equal(size.width, 300);
        assert.equal(size.height, 200);
      } finally {
        plugin.dispose();
      }
    });

    test('dispose puts core’s own default back', function () {
      const original = Blockly.comments.CommentView.defaultCommentSize;

      const plugin = new WorkspaceNotes(this.workspace, {contextMenu: false});
      plugin.init();
      assert.notEqual(
        Blockly.comments.CommentView.defaultCommentSize,
        original,
        'init should have replaced the default',
      );

      plugin.dispose();
      assert.strictEqual(
        Blockly.comments.CommentView.defaultCommentSize,
        original,
        'a disposed plugin must not leave core resized',
      );
    });

    test('a live plugin keeps its size when another is disposed', function () {
      // The size is a static shared by every workspace on the page, so the
      // swap is reference-counted: disposing one plugin must not resize the
      // notes of another that is still running.
      const original = Blockly.comments.CommentView.defaultCommentSize;

      const first = new WorkspaceNotes(this.workspace, {
        contextMenu: false,
        defaultSize: {width: 300, height: 200},
      });
      const other = new Blockly.Workspace();
      const second = new WorkspaceNotes(other, {
        contextMenu: false,
        defaultSize: {width: 400, height: 250},
      });

      first.init();
      second.init();
      try {
        first.dispose();
        const size = Blockly.comments.CommentView.defaultCommentSize;
        assert.equal(size.width, 300, 'the live plugin still needs a size');
        assert.equal(size.height, 200);

        second.dispose();
        assert.strictEqual(
          Blockly.comments.CommentView.defaultCommentSize,
          original,
          'the last one out restores core',
        );
      } finally {
        other.dispose();
      }
    });

    test('disposing twice does not restore over a live plugin', function () {
      const first = new WorkspaceNotes(this.workspace, {contextMenu: false});
      first.init();
      first.dispose();

      const second = new WorkspaceNotes(this.workspace, {
        contextMenu: false,
        defaultSize: {width: 400, height: 250},
      });
      second.init();
      try {
        first.dispose();
        const size = Blockly.comments.CommentView.defaultCommentSize;
        assert.equal(size.width, 400);
        assert.equal(size.height, 250);
      } finally {
        second.dispose();
      }
    });
  });

  suite('newComment', function () {
    test('dispose restores the workspace’s own factory', function () {
      const original = this.workspace.newComment;

      const plugin = new WorkspaceNotes(this.workspace, {contextMenu: false});
      plugin.init();
      assert.notEqual(this.workspace.newComment, original);

      plugin.dispose();
      assert.strictEqual(this.workspace.newComment, original);
    });
  });
});
