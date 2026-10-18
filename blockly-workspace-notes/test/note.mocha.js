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

import {DEFAULT_COLOUR, NoteChange, NoteComment, isNote} from '../src/index';
import {nextZIndex, previousZIndex} from '../src/model/stacking';
import {NOTE_BRAND} from '../src/constants/brand';

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
      assert.isFalse(note.isLocked());
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

  suite('metadata', function () {
    test('a body edit is recorded as a change', function () {
      const note = new NoteComment(this.workspace);
      const before = note.getMeta().updatedAt;
      note.restoreMeta({updatedAt: '2000-01-01T00:00:00.000Z'});

      note.setText('written just now');

      assert.notEqual(
        note.getMeta().updatedAt,
        '2000-01-01T00:00:00.000Z',
        'writing in a note should count as changing it',
      );
      assert.isString(before);
    });

    test('setting the same text again changes nothing', function () {
      const note = new NoteComment(this.workspace);
      note.setText('same');
      note.restoreMeta({updatedAt: '2000-01-01T00:00:00.000Z'});

      note.setText('same');

      assert.equal(note.getMeta().updatedAt, '2000-01-01T00:00:00.000Z');
    });

    test('restoring metadata does not stamp a new time', function () {
      const note = new NoteComment(this.workspace);
      note.restoreMeta({
        author: 'ada',
        createdAt: '2020-05-05T00:00:00.000Z',
        updatedAt: '2020-05-05T00:00:00.000Z',
      });

      assert.equal(note.getMeta().author, 'ada');
      assert.equal(note.getMeta().updatedAt, '2020-05-05T00:00:00.000Z');
    });
  });

  suite('pinning', function () {
    test('pinning holds the note in place', function () {
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

  // `isNote` reads this mark instead of testing instanceof, and the mixin's
  // `as new (...) => ...` cast means the brand reaches no .d.ts at all - so
  // nothing type-checks that it is still there. Were it dropped, `isNote`
  // would return false for everything and the serializer would write an empty
  // payload without throwing.
  suite('the note brand', function () {
    test('every note carries it', function () {
      assert.isTrue(new NoteComment(this.workspace)[NOTE_BRAND]);
      assert.isFalse(isNote({title: 'not a note'}));
      assert.isFalse(isNote(null));
    });

    test('it stays a prototype accessor, not an own field', function () {
      const note = new NoteComment(this.workspace);
      assert.notProperty(
        Object.getOwnPropertyDescriptors(note),
        NOTE_BRAND,
        'an own field would be enumerable, and would land after super()',
      );
      const mixin = Object.getPrototypeOf(NoteComment.prototype);
      const descriptor = Object.getOwnPropertyDescriptor(mixin, NOTE_BRAND);
      assert.isFunction(descriptor?.get, 'the brand must be a getter');
    });
  });

  suite('locking', function () {
    test('locking makes the note read-only and undeletable', function () {
      const note = new NoteComment(this.workspace);
      assert.isTrue(note.isOwnEditable());
      assert.isTrue(note.isOwnDeletable());
      note.setLocked(true);
      assert.isTrue(note.isLocked());
      assert.isFalse(note.isOwnEditable());
      assert.isFalse(note.isOwnDeletable());
    });

    test('unlocking restores both', function () {
      const note = new NoteComment(this.workspace);
      note.setLocked(true);
      note.setLocked(false);
      assert.isFalse(note.isLocked());
      assert.isTrue(note.isOwnEditable());
      assert.isTrue(note.isOwnDeletable());
    });

    // Locking owns editable and deletable, pinning owns movable, and neither
    // writes the other's. Without this the two can silently merge, and
    // unpinning a locked note would hand its movement back.
    test('locking never touches movability', function () {
      const note = new NoteComment(this.workspace);
      note.setLocked(true);
      assert.isTrue(note.isOwnMovable());
      note.setLocked(false);
      assert.isTrue(note.isOwnMovable());
    });

    test('locking and pinning compose', function () {
      const note = new NoteComment(this.workspace);
      note.setPinned(true);
      note.setLocked(true);
      assert.isFalse(note.isOwnMovable());
      assert.isFalse(note.isOwnEditable());
      assert.isFalse(note.isOwnDeletable());

      note.setLocked(false);
      assert.isTrue(note.isPinned());
      assert.isFalse(note.isOwnMovable());
      assert.isTrue(note.isOwnEditable());
      assert.isTrue(note.isOwnDeletable());
    });

    test('saveNoteState carries the flag', function () {
      const note = new NoteComment(this.workspace);
      note.setLocked(true);
      assert.isTrue(note.saveNoteState().locked);
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
        locked: true,
        zIndex: 3,
        meta: {author: 'x', createdAt: 'a', updatedAt: 'b'},
      });
      assert.equal(this.note.getTitle(), 'All');
      assert.equal(this.note.getColour(), '#c7e4ff');
      assert.isTrue(this.note.isPinned());
      assert.isTrue(this.note.isLocked());
      assert.equal(this.note.getZIndex(), 3);
      assert.equal(this.note.getMeta().author, 'x');
    });

    // A state object written before locking existed has no `locked` key at
    // all. It has to read as false, not undefined, or it survives into
    // saveNoteState and the change comparison stops seeing a real lock.
    test("'*' without a locked key reads as unlocked", function () {
      this.note.setLocked(true);
      this.note.applyNoteProperty('*', {
        title: '',
        colour: DEFAULT_COLOUR,
        pinned: false,
        zIndex: 0,
        meta: {author: '', createdAt: 'a', updatedAt: 'b'},
      });
      assert.isFalse(this.note.isLocked());
      assert.isFalse(this.note.saveNoteState().locked);
    });

    test("'*' with null is a no-op, so a delete snapshot replays", function () {
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
