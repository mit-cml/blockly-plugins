/**
 * @fileoverview Serialization tests: round-tripping, the sparse JSON shape,
 * legacy files, migrations, and undo fidelity for note-specific fields.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import {
  DEFAULT_COLOUR,
  NOTE_SERIALIZER_NAME,
  SCHEMA_VERSION,
} from '../src/constants';
import {NoteComment, isNote} from '../src/note';
import {WorkspaceNotes} from '../src/index';
import {migrate, saveNote} from '../src/serializer';

/**
 * Blockly queues events and flushes them on a later macrotask, so the undo
 * stack is not populated synchronously. Await this before inspecting it.
 *
 * @returns {!Promise<void>} Resolves once the queue has drained.
 */
function flushEvents() {
  return new Promise((resolve) => setTimeout(resolve, 0)).then(
    () => new Promise((resolve) => setTimeout(resolve, 0)),
  );
}

suite('Note serialization', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    this.plugin = new WorkspaceNotes(this.workspace, {contextMenu: false});
    this.plugin.init();
  });

  teardown(function () {
    this.plugin.dispose();
    this.workspace.dispose();
  });

  /**
   * @param {!Blockly.Workspace} workspace The workspace to add the note to.
   * @param {!object} [overrides] Fields to set on the new note.
   * @returns {!NoteComment} A note on the test workspace.
   */
  function makeNote(workspace, overrides = {}) {
    const note = new NoteComment(workspace);
    if (overrides.text) note.setText(overrides.text);
    if (overrides.title) note.setTitle(overrides.title);
    if (overrides.colour) note.setColour(overrides.colour);
    if (overrides.zIndex) note.setZIndex(overrides.zIndex);
    if (overrides.pinned) note.setPinned(true);
    if (overrides.collapsed) note.setCollapsed(true);
    note.moveTo(
      new Blockly.utils.Coordinate(overrides.x ?? 0, overrides.y ?? 0),
    );
    note.setSize(
      new Blockly.utils.Size(overrides.width ?? 200, overrides.height ?? 120),
    );
    return note;
  }

  suite('save', function () {
    test('an empty workspace writes no notes key at all', function () {
      const state = Blockly.serialization.workspaces.save(this.workspace);
      assert.notProperty(state, NOTE_SERIALIZER_NAME);
    });

    test('notes are written under a versioned envelope', function () {
      makeNote(this.workspace, {text: 'hello'});
      const state = Blockly.serialization.workspaces.save(this.workspace);
      assert.equal(state[NOTE_SERIALIZER_NAME].version, SCHEMA_VERSION);
      assert.lengthOf(state[NOTE_SERIALIZER_NAME].notes, 1);
    });

    test('a default note omits every optional field', function () {
      const note = makeNote(this.workspace, {x: 10, y: 20});
      const saved = saveNote(note, {addCoordinates: true, saveIds: true});

      assert.deepEqual(
        {
          id: saved.id,
          x: saved.x,
          y: saved.y,
          width: saved.width,
          height: saved.height,
        },
        {id: note.id, x: 10, y: 20, width: 200, height: 120},
      );
      for (const key of [
        'text',
        'title',
        'colour',
        'collapsed',
        'pinned',
        'zIndex',
        'editable',
        'movable',
        'deletable',
      ]) {
        assert.notProperty(saved, key, `expected ${key} to be omitted`);
      }
    });

    test('non-default flags are written, defaults are not', function () {
      const note = makeNote(this.workspace, {
        title: 'TODO',
        colour: '#ffd6a5',
        collapsed: true,
        zIndex: 3,
      });
      note.setEditable(false);
      const saved = saveNote(note, {saveIds: true});

      assert.equal(saved.title, 'TODO');
      assert.equal(saved.colour, '#ffd6a5');
      assert.isTrue(saved.collapsed);
      assert.equal(saved.zIndex, 3);
      assert.isFalse(saved.editable);
      // `deletable` is still at its default, so it stays out of the file.
      assert.notProperty(saved, 'deletable');
    });

    test('a pinned note omits the movable flag it implies', function () {
      const note = makeNote(this.workspace, {pinned: true});
      const saved = saveNote(note, {saveIds: true});
      assert.isTrue(saved.pinned);
      assert.notProperty(saved, 'movable');
    });

    test('the default colour is treated as "no colour"', function () {
      const note = makeNote(this.workspace);
      note.setColour(DEFAULT_COLOUR);
      assert.notProperty(saveNote(note), 'colour');
    });
  });

  suite('no duplication', function () {
    test('notes are not also written under workspaceComments', function () {
      makeNote(this.workspace, {text: 'only once'});
      const state = Blockly.serialization.workspaces.save(this.workspace);
      assert.notProperty(
        state,
        'workspaceComments',
        'the built-in comment serializer must not write notes a second time',
      );
    });

    test('a save/load cycle does not multiply notes', function () {
      makeNote(this.workspace, {text: 'a'});
      makeNote(this.workspace, {text: 'b'});
      const state = Blockly.serialization.workspaces.save(this.workspace);

      const target = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(state, target);
        assert.lengthOf(target.getTopComments(false), 2);
        // And loading the same file again replaces rather than appends.
        Blockly.serialization.workspaces.load(state, target);
        assert.lengthOf(target.getTopComments(false), 2);
      } finally {
        target.dispose();
      }
    });
  });

  suite('round trip', function () {
    test('every field survives save, load and save again', function () {
      makeNote(this.workspace, {
        text: 'Check this loop',
        title: 'TODO',
        colour: '#c7e4ff',
        zIndex: 2,
        x: 40,
        y: 20,
        width: 300,
        height: 160,
      });
      makeNote(this.workspace, {
        text: 'Locked',
        pinned: true,
        collapsed: true,
        x: 400,
        y: 20,
      });

      const first = Blockly.serialization.workspaces.save(this.workspace);

      const target = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(first, target);
        const second = Blockly.serialization.workspaces.save(target);
        assert.deepEqual(second, first);
      } finally {
        target.dispose();
      }
    });

    test('loaded notes are notes, not plain comments', function () {
      makeNote(this.workspace, {title: 'T'});
      const state = Blockly.serialization.workspaces.save(this.workspace);

      const target = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(state, target);
        const [loaded] = target.getTopComments(false);
        assert.isTrue(isNote(loaded));
        assert.equal(loaded.getTitle(), 'T');
      } finally {
        target.dispose();
      }
    });

    test('metadata is restored verbatim rather than re-stamped', function () {
      const note = makeNote(this.workspace);
      note.restoreMeta({
        author: 'ada',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-02T00:00:00.000Z',
      });
      const state = Blockly.serialization.workspaces.save(this.workspace);

      const target = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(state, target);
        assert.deepEqual(target.getTopComments(false)[0].getMeta(), {
          author: 'ada',
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-02T00:00:00.000Z',
        });
      } finally {
        target.dispose();
      }
    });
  });

  suite('legacy files', function () {
    test('a workspaceComments-only file loads as notes', function () {
      Blockly.serialization.workspaces.load(
        {
          workspaceComments: [
            {id: 'legacy1', x: 5, y: 6, width: 100, height: 50, text: 'old'},
          ],
        },
        this.workspace,
      );

      const loaded = this.workspace.getCommentById('legacy1');
      assert.isTrue(isNote(loaded));
      assert.equal(loaded.getText(), 'old');
      assert.equal(loaded.getColour(), DEFAULT_COLOUR);
    });

    test('a legacy file is re-saved in the new format', function () {
      Blockly.serialization.workspaces.load(
        {workspaceComments: [{id: 'legacy1', width: 100, height: 50}]},
        this.workspace,
      );
      const state = Blockly.serialization.workspaces.save(this.workspace);
      assert.notProperty(state, 'workspaceComments');
      assert.lengthOf(state[NOTE_SERIALIZER_NAME].notes, 1);
    });

    test('a note already loaded wins over a duplicate legacy entry', function () {
      Blockly.serialization.workspaces.load(
        {
          workspaceNotes: {
            version: SCHEMA_VERSION,
            notes: [{id: 'dup', width: 100, height: 50, title: 'new'}],
          },
          workspaceComments: [{id: 'dup', width: 100, height: 50}],
        },
        this.workspace,
      );

      assert.lengthOf(this.workspace.getTopComments(false), 1);
      assert.equal(this.workspace.getCommentById('dup').getTitle(), 'new');
    });
  });

  suite('migrations', function () {
    test('a bare array is treated as the unversioned shape', function () {
      const migrated = migrate([{id: 'a', width: 1, height: 2}]);
      assert.equal(migrated.version, SCHEMA_VERSION);
      assert.lengthOf(migrated.notes, 1);
    });

    test('an explicit v0 envelope upgrades', function () {
      const migrated = migrate({version: 0, notes: [{id: 'a'}]});
      assert.equal(migrated.version, SCHEMA_VERSION);
      assert.lengthOf(migrated.notes, 1);
    });

    test('a current payload passes through unchanged', function () {
      const state = {version: SCHEMA_VERSION, notes: [{id: 'a'}]};
      assert.deepEqual(migrate(state), state);
    });

    test('a newer payload keeps its notes rather than throwing', function () {
      const migrated = migrate({version: 99, notes: [{id: 'a'}]});
      assert.equal(migrated.version, SCHEMA_VERSION);
      assert.lengthOf(migrated.notes, 1);
    });

    test('an unversioned array loads end to end', function () {
      Blockly.serialization.workspaces.load(
        {workspaceNotes: [{id: 'bare', width: 100, height: 50, title: 'B'}]},
        this.workspace,
      );
      assert.equal(this.workspace.getCommentById('bare').getTitle(), 'B');
    });
  });

  suite('clear', function () {
    test('loading disposes the notes already present', function () {
      makeNote(this.workspace, {text: 'gone'});
      Blockly.serialization.workspaces.load(
        {workspaceNotes: {version: SCHEMA_VERSION, notes: []}},
        this.workspace,
      );
      assert.isEmpty(this.workspace.getTopComments(false));
    });

    test('plain comments are cleared too, so they cannot accumulate', function () {
      new Blockly.comments.WorkspaceComment(this.workspace);
      Blockly.serialization.workspaces.load({}, this.workspace);
      assert.isEmpty(this.workspace.getTopComments(false));
    });
  });

  suite('undo', function () {
    test('undoing a delete restores the title and colour', async function () {
      const note = makeNote(this.workspace, {
        title: 'Important',
        colour: '#ffd6a5',
      });
      const id = note.id;
      await flushEvents();

      note.dispose();
      await flushEvents();
      assert.isNull(this.workspace.getCommentById(id));

      this.workspace.undo(false);
      await flushEvents();

      const restored = this.workspace.getCommentById(id);
      assert.isNotNull(restored, 'the note should come back');
      assert.equal(restored.getTitle(), 'Important');
      assert.equal(restored.getColour(), '#ffd6a5');
    });

    test('undoing a title change reverts it', async function () {
      const note = makeNote(this.workspace, {title: 'Before'});
      await flushEvents();

      note.setTitle('After');
      await flushEvents();
      assert.equal(note.getTitle(), 'After');

      // One event, so one undo. The inline title editor wraps exactly this
      // call in an event group, so renaming is a single step there too.
      this.workspace.undo(false);
      await flushEvents();
      assert.equal(note.getTitle(), 'Before');
    });

    test('undoing a colour change reverts it', async function () {
      const note = makeNote(this.workspace);
      await flushEvents();

      note.setColour('#c9efc2');
      await flushEvents();
      assert.equal(note.getColour(), '#c9efc2');

      this.workspace.undo(false);
      await flushEvents();
      assert.equal(note.getColour(), DEFAULT_COLOUR);

      this.workspace.redo();
      await flushEvents();
      assert.equal(note.getColour(), '#c9efc2');
    });

    test('a no-op change never reaches the undo stack', async function () {
      const note = makeNote(this.workspace, {title: 'Same'});
      await flushEvents();
      const depth = this.workspace.getUndoStack().length;

      note.setTitle('Same');
      await flushEvents();
      assert.equal(this.workspace.getUndoStack().length, depth);
    });

    test('loading a file does not fill the undo stack', async function () {
      const state = {
        workspaceNotes: {
          version: SCHEMA_VERSION,
          notes: [{id: 'a', width: 100, height: 50, title: 'A'}],
        },
      };
      this.workspace.clearUndo();
      Blockly.serialization.workspaces.load(state, this.workspace);
      await flushEvents();
      assert.isEmpty(this.workspace.getUndoStack());
    });
  });
});
