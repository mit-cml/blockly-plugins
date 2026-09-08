/**
 * @fileoverview Model tests for notes.
 *
 * These run headlessly: `blockly/core` resolves to `core-node.js` in Node,
 * which provides jsdom only for XML handling, so `Blockly.inject` — and
 * therefore any rendered note — is unavailable. NoteComment carries the same
 * state as its rendered sibling, which is exactly what these cover.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import {DEFAULT_COLOUR} from '../src/constants';
import {NoteChange} from '../src/events';
import {NoteComment, isNote, nextZIndex, previousZIndex} from '../src/note';

suite('Note model', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
  });

  teardown(function () {
    this.workspace.dispose();
  });

  suite('defaults', function () {
    test('a new note has no title and the default colour', function () {
      const note = new NoteComment(this.workspace);
      assert.equal(note.getTitle(), '');
      assert.equal(note.getColour(), DEFAULT_COLOUR);
      assert.isFalse(note.isPinned());
      assert.equal(note.getZIndex(), 0);
    });

    test('a new note stamps its metadata', function () {
      const note = new NoteComment(this.workspace);
      const meta = note.getMeta();
      assert.equal(meta.author, '');
      assert.isNotEmpty(meta.createdAt);
      assert.equal(meta.updatedAt, meta.createdAt);
    });

    test('it registers as a top comment like any other', function () {
      const note = new NoteComment(this.workspace);
      assert.deepEqual(this.workspace.getTopComments(false), [note]);
      assert.equal(this.workspace.getCommentById(note.id), note);
    });
  });

  suite('accessors', function () {
    setup(function () {
      this.note = new NoteComment(this.workspace);
    });

    test('setTitle round-trips', function () {
      this.note.setTitle('Refactor');
      assert.equal(this.note.getTitle(), 'Refactor');
    });

    test('setColour normalizes through Blockly colour parsing', function () {
      this.note.setColour('#ffd6a5');
      assert.equal(this.note.getColour(), '#ffd6a5');
    });

    test('an unparseable colour falls back to the default', function () {
      this.note.setColour('not-a-colour');
      assert.equal(this.note.getColour(), DEFAULT_COLOUR);
    });

    test('setZIndex coerces to a number', function () {
      this.note.setZIndex('4');
      assert.strictEqual(this.note.getZIndex(), 4);
    });

    test('editing bumps updatedAt but not createdAt', function () {
      const before = this.note.getMeta();
      // Timestamps have millisecond resolution, so force a distinct one.
      this.note.getNoteState().meta.updatedAt = '1970-01-01T00:00:00.000Z';
      this.note.setTitle('Changed');
      const after = this.note.getMeta();
      assert.equal(after.createdAt, before.createdAt);
      assert.notEqual(after.updatedAt, '1970-01-01T00:00:00.000Z');
    });

    test('restoreMeta does not bump updatedAt', function () {
      this.note.restoreMeta({
        author: 'ada',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-02T00:00:00.000Z',
      });
      assert.deepEqual(this.note.getMeta(), {
        author: 'ada',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-02T00:00:00.000Z',
      });
    });
  });

  suite('pinning', function () {
    test('pinning locks the note in place', function () {
      const note = new NoteComment(this.workspace);
      assert.isTrue(note.isOwnMovable());
      note.setPinned(true);
      assert.isTrue(note.isPinned());
      assert.isFalse(note.isOwnMovable());
    });

    test('unpinning releases it again', function () {
      const note = new NoteComment(this.workspace);
      note.setPinned(true);
      note.setPinned(false);
      assert.isFalse(note.isPinned());
      assert.isTrue(note.isOwnMovable());
    });
  });

  suite('stacking helpers', function () {
    test('nextZIndex is one past the highest in use', function () {
      assert.equal(nextZIndex(this.workspace), 1);
      const note = new NoteComment(this.workspace);
      note.setZIndex(7);
      assert.equal(nextZIndex(this.workspace), 8);
    });

    test('previousZIndex is one below the lowest in use', function () {
      const note = new NoteComment(this.workspace);
      note.setZIndex(-2);
      assert.equal(previousZIndex(this.workspace), -3);
    });
  });

  suite('applyNoteProperty', function () {
    setup(function () {
      this.note = new NoteComment(this.workspace);
    });

    test("'*' applies a whole state object", function () {
      this.note.applyNoteProperty('*', {
        title: 'All',
        colour: '#c7e4ff',
        pinned: true,
        zIndex: 3,
        meta: {author: 'x', createdAt: 'a', updatedAt: 'b'},
      });
      assert.equal(this.note.getTitle(), 'All');
      assert.equal(this.note.getColour(), '#c7e4ff');
      assert.isTrue(this.note.isPinned());
      assert.equal(this.note.getZIndex(), 3);
      assert.equal(this.note.getMeta().author, 'x');
    });

    test("'*' with null is a no-op, so a delete snapshot replays safely", function () {
      this.note.setTitle('Keep me');
      this.note.applyNoteProperty('*', null);
      assert.equal(this.note.getTitle(), 'Keep me');
    });

    test('it does not fire an event, unlike the setters', function () {
      const fired = [];
      this.workspace.addChangeListener((e) => fired.push(e));
      this.note.applyNoteProperty('title', 'Silent');
      assert.isEmpty(fired.filter((e) => e instanceof NoteChange));
    });
  });

  suite('isNote', function () {
    test('recognizes notes and rejects plain comments', function () {
      assert.isTrue(isNote(new NoteComment(this.workspace)));
      assert.isFalse(
        isNote(new Blockly.comments.WorkspaceComment(this.workspace)),
      );
      assert.isFalse(isNote(null));
    });
  });
});
