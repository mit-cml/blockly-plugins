/**
 * @fileoverview XML serialization tests.
 *
 * Unlike the rendered chrome, `Blockly.Xml` works headlessly — `core-node.js`
 * injects jsdom precisely so XML handling works in Node — so the whole format
 * is covered here.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import {
  DEFAULT_COLOUR,
  NoteComment,
  WorkspaceNotes,
  domToNoteState,
  isNote,
  noteToDom,
} from '../src/index';

/**
 * @param {!Element} dom An `<xml>` element.
 * @returns {!Array<!Element>} Its top-level `<comment>` children.
 */
function comments(dom) {
  return Array.from(dom.childNodes).filter(
    (node) => node.nodeName.toLowerCase() === 'comment',
  );
}

suite('Note XML serialization', function () {
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
   * @param {!Blockly.Workspace} workspace The workspace to add to.
   * @param {!object} [overrides] Fields to set on the note.
   * @returns {!NoteComment} The new note.
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

  suite('writing', function () {
    test('note fields are written as attributes on <comment>', function () {
      makeNote(this.workspace, {
        text: 'body',
        title: 'TODO',
        colour: '#ffd6a5',
        zIndex: 3,
        x: 40,
        y: 20,
      });

      const [elem] = comments(Blockly.Xml.workspaceToDom(this.workspace));
      assert.equal(elem.getAttribute('title'), 'TODO');
      assert.equal(elem.getAttribute('colour'), '#ffd6a5');
      assert.equal(elem.getAttribute('z'), '3');
      assert.equal(elem.textContent, 'body');
    });

    test("core's own attributes are left untouched", function () {
      makeNote(this.workspace, {x: 40, y: 20, width: 250, height: 130});
      const [elem] = comments(Blockly.Xml.workspaceToDom(this.workspace));
      assert.equal(elem.getAttribute('x'), '40');
      assert.equal(elem.getAttribute('y'), '20');
      assert.equal(elem.getAttribute('w'), '250');
      assert.equal(elem.getAttribute('h'), '130');
      assert.isNotNull(elem.getAttribute('id'));
    });

    test('a plain note writes no note-specific attributes', function () {
      makeNote(this.workspace);
      const [elem] = comments(Blockly.Xml.workspaceToDom(this.workspace));
      for (const name of ['title', 'colour', 'pinned', 'z']) {
        assert.isNull(
          elem.getAttribute(name),
          `expected ${name} to be omitted`,
        );
      }
    });

    test('skipId omits the id, as it does for a plain comment', function () {
      makeNote(this.workspace, {title: 'T'});
      const [elem] = comments(Blockly.Xml.workspaceToDom(this.workspace, true));
      assert.isNull(elem.getAttribute('id'));
      assert.equal(elem.getAttribute('title'), 'T');
    });

    test('attributes line up when several notes are saved', function () {
      makeNote(this.workspace, {title: 'first', colour: '#ffd6a5'});
      makeNote(this.workspace, {title: 'second', colour: '#c7e4ff'});
      makeNote(this.workspace, {title: 'third'});

      const elems = comments(Blockly.Xml.workspaceToDom(this.workspace));
      assert.deepEqual(
        elems.map((e) => e.getAttribute('title')),
        ['first', 'second', 'third'],
      );
      assert.deepEqual(
        elems.map((e) => e.getAttribute('colour')),
        ['#ffd6a5', '#c7e4ff', null],
      );
    });

    test('metadata is written', function () {
      const note = makeNote(this.workspace);
      note.restoreMeta({
        author: 'ada',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-02T00:00:00.000Z',
      });
      const [elem] = comments(Blockly.Xml.workspaceToDom(this.workspace));
      assert.equal(elem.getAttribute('author'), 'ada');
      assert.equal(elem.getAttribute('created'), '2020-01-01T00:00:00.000Z');
      assert.equal(elem.getAttribute('updated'), '2020-01-02T00:00:00.000Z');
    });
  });

  suite('reading', function () {
    test('a decorated <comment> loads as a note', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="n1" x="40" y="20" w="250" h="130" ' +
          'title="TODO" colour="#ffd6a5" z="2">body</comment></xml>',
      );
      Blockly.Xml.domToWorkspace(dom, this.workspace);

      const note = this.workspace.getCommentById('n1');
      assert.isTrue(isNote(note), 'should be a note, not a plain comment');
      assert.equal(note.getTitle(), 'TODO');
      assert.equal(note.getColour(), '#ffd6a5');
      assert.equal(note.getZIndex(), 2);
      assert.equal(note.getText(), 'body');
      assert.equal(note.getSize().width, 250);
    });

    test('a pinned note comes back locked', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="n1" x="0" y="0" w="200" h="100" ' +
          'pinned="true"></comment></xml>',
      );
      Blockly.Xml.domToWorkspace(dom, this.workspace);
      const note = this.workspace.getCommentById('n1');
      assert.isTrue(note.isPinned());
      assert.isFalse(note.isOwnMovable());
    });

    test('a plain old <comment> still loads, with defaults', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="old" x="5" y="6" w="100" h="50">legacy' +
          '</comment></xml>',
      );
      Blockly.Xml.domToWorkspace(dom, this.workspace);

      const note = this.workspace.getCommentById('old');
      assert.isTrue(isNote(note));
      assert.equal(note.getText(), 'legacy');
      assert.equal(note.getColour(), DEFAULT_COLOUR);
      assert.equal(note.getTitle(), '');
    });

    test('blocks alongside comments still load, and are returned', function () {
      Blockly.defineBlocksWithJsonArray([
        {type: 'xml_test_block', message0: 'test'},
      ]);
      try {
        const dom = Blockly.utils.xml.textToDom(
          '<xml><comment id="n1" x="0" y="0" w="100" h="50" title="T"/>' +
            '<block type="xml_test_block" id="b1" x="10" y="10"/></xml>',
        );
        const ids = Blockly.Xml.domToWorkspace(dom, this.workspace);
        assert.deepEqual(ids, ['b1']);
        assert.equal(this.workspace.getCommentById('n1').getTitle(), 'T');
        assert.isNotNull(this.workspace.getBlockById('b1'));
      } finally {
        delete Blockly.Blocks['xml_test_block'];
      }
    });

    test('the caller’s DOM is not mutated', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="n1" x="0" y="0" w="100" h="50" title="T"/></xml>',
      );
      Blockly.Xml.domToWorkspace(dom, this.workspace);
      assert.lengthOf(
        comments(dom),
        1,
        'the comment element must survive so the DOM can be loaded again',
      );

      // And loading the same DOM a second time still works.
      const second = new Blockly.Workspace();
      try {
        Blockly.Xml.domToWorkspace(dom, second);
        assert.equal(second.getCommentById('n1').getTitle(), 'T');
      } finally {
        second.dispose();
      }
    });

    test('appendDomToWorkspace also produces notes', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="n1" x="0" y="0" w="100" h="50" ' +
          'title="Appended"/></xml>',
      );
      // Blockly reaches domToWorkspace through a module-local binding here,
      // so this only works because the entry point is wrapped separately.
      Blockly.Xml.appendDomToWorkspace(dom, this.workspace);
      assert.equal(this.workspace.getCommentById('n1').getTitle(), 'Appended');
    });
  });

  suite('round trip', function () {
    test('every field survives a save and load', function () {
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

      const first = Blockly.Xml.domToText(
        Blockly.Xml.workspaceToDom(this.workspace),
      );

      const target = new Blockly.Workspace();
      const plugin = new WorkspaceNotes(target, {contextMenu: false});
      plugin.init();
      try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(first), target);
        const second = Blockly.Xml.domToText(
          Blockly.Xml.workspaceToDom(target),
        );
        assert.equal(second, first);
      } finally {
        plugin.dispose();
        target.dispose();
      }
    });

    test('XML and JSON agree on the same workspace', function () {
      makeNote(this.workspace, {
        text: 'body',
        title: 'TODO',
        colour: '#ffd6a5',
        zIndex: 4,
        x: 12,
        y: 34,
        width: 210,
        height: 140,
      });

      const viaJson = new Blockly.Workspace();
      const viaXml = new Blockly.Workspace();
      const jsonPlugin = new WorkspaceNotes(viaJson, {contextMenu: false});
      const xmlPlugin = new WorkspaceNotes(viaXml, {contextMenu: false});
      jsonPlugin.init();
      xmlPlugin.init();
      try {
        Blockly.serialization.workspaces.load(
          Blockly.serialization.workspaces.save(this.workspace),
          viaJson,
        );
        Blockly.Xml.domToWorkspace(
          Blockly.Xml.workspaceToDom(this.workspace),
          viaXml,
        );

        const describe = (ws) =>
          ws.getTopComments(false).map((n) => ({
            title: n.getTitle(),
            colour: n.getColour(),
            zIndex: n.getZIndex(),
            text: n.getText(),
            pinned: n.isPinned(),
            xy: n.getRelativeToSurfaceXY(),
            size: n.getSize(),
          }));

        assert.deepEqual(describe(viaXml), describe(viaJson));
      } finally {
        jsonPlugin.dispose();
        xmlPlugin.dispose();
        viaJson.dispose();
        viaXml.dispose();
      }
    });

    test('a note stays readable by plain Blockly', function () {
      makeNote(this.workspace, {
        text: 'body',
        title: 'TODO',
        colour: '#ffd6a5',
        x: 40,
        y: 20,
        width: 250,
        height: 130,
      });
      const xml = Blockly.Xml.workspaceToDom(this.workspace);

      // Drop the plugin, so Blockly's own loader handles the same document.
      this.plugin.dispose();
      const target = new Blockly.Workspace();
      try {
        Blockly.Xml.domToWorkspace(xml, target);
        const [comment] = target.getTopComments(false);
        assert.isFalse(isNote(comment), 'plain Blockly makes a plain comment');
        assert.equal(comment.getText(), 'body');
        assert.equal(comment.getSize().width, 250);
      } finally {
        target.dispose();
        this.plugin.init();
      }
    });
  });

  suite('helpers', function () {
    test('domToNoteState reads every attribute', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="n1" x="1" y="2" w="3" h="4" collapsed="true" ' +
          'editable="false" movable="false" deletable="false" title="T" ' +
          'colour="#ffd6a5" pinned="true" z="7" author="ada" ' +
          'created="c" updated="u">body</comment></xml>',
      );
      const [elem] = comments(dom);
      assert.deepEqual(domToNoteState(elem), {
        id: 'n1',
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        text: 'body',
        collapsed: true,
        editable: false,
        movable: false,
        deletable: false,
        title: 'T',
        colour: '#ffd6a5',
        pinned: true,
        zIndex: 7,
        meta: {author: 'ada', createdAt: 'c', updatedAt: 'u'},
      });
    });

    test('malformed geometry is skipped, not stored as NaN', function () {
      const dom = Blockly.utils.xml.textToDom(
        '<xml><comment id="n1" x="oops" y="2" w="" h="4"/></xml>',
      );
      const state = domToNoteState(comments(dom)[0]);
      assert.notProperty(state, 'x');
      assert.notProperty(state, 'y');
      assert.notProperty(state, 'width');
      assert.notProperty(state, 'height');
    });

    test('noteToDom and domToNoteState are inverses', function () {
      const note = makeNote(this.workspace, {
        text: 'body',
        title: 'T',
        colour: '#ffd6a5',
        zIndex: 5,
        x: 11,
        y: 22,
      });
      const state = domToNoteState(noteToDom(note));
      assert.equal(state.title, 'T');
      assert.equal(state.colour, '#ffd6a5');
      assert.equal(state.zIndex, 5);
      assert.equal(state.x, 11);
      assert.equal(state.y, 22);
      assert.equal(state.text, 'body');
    });
  });

  suite('teardown', function () {
    test('dispose restores Blockly’s own XML functions', function () {
      const patched = Blockly.Xml.workspaceToDom;
      this.plugin.dispose();
      try {
        assert.notEqual(Blockly.Xml.workspaceToDom, patched);
        makeNote(this.workspace, {title: 'ignored'});
        const [elem] = comments(Blockly.Xml.workspaceToDom(this.workspace));
        assert.isNull(elem.getAttribute('title'));
      } finally {
        this.plugin.init();
      }
    });
  });
});
