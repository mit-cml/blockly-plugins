// Copyright © 2026 Massachusetts Institute of Technology. All rights reserved.

/**
 * @license
 * @fileoverview Tests for the touch-screen gestures of FieldFlydown: one tap
 * opens the flydown, a second tap within DOUBLE_TAP_TIMEOUT opens the editor
 * when the field is editable. Mouse and pen keep hover-to-open / click-to-edit.
 */

import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';

import '../src/msg';
import '../src/utilities';
import '../src/workspace';
import '../src/procedure_utils';
import '../src/fields/flydown';
import {FieldFlydown} from '../src/fields/field_flydown';
import '../src/fields/field_global_flydown';
import '../src/fields/field_nocheck_dropdown';
import '../src/fields/field_lexical_variable';
import {FieldParameterFlydown} from '../src/fields/field_parameter_flydown';
import '../src/fields/field_procedurename';
import '../src/blocks/lexical-variables';
import '../src/blocks/controls';
import '../src/blocks/variable-get-set.js';
import '../src/procedure_database';
import '../src/blocks/procedures';

import chai from 'chai';
import sinon from 'sinon';

const assert = chai.assert;

/** A stand-in for the pointerup event Blockly.Field.showEditor passes on. */
function pointer(pointerType) {
  return {pointerType, stopPropagation() {}};
}

suite('FieldFlydown touch gestures', function() {
  setup(function() {
    // The plugin schedules the hover flydown with window.setTimeout; the node
    // test bundle has no window, so alias it to the (faked) globals.
    this.hadWindow = 'window' in globalThis;
    if (!this.hadWindow) globalThis.window = globalThis;
    this.clock = sinon.useFakeTimers(
        {now: 1000000, toFake: ['setTimeout', 'clearTimeout', 'Date']});

    // A headless workspace is enough: showFlydown_ (SVG geometry) is stubbed,
    // and the two WorkspaceSvg methods the field touches are stood in for.
    this.workspace = new Blockly.Workspace();
    this.workspace.isDragging = () => false;
    this.workspace.hideChaff = sinon.spy();
    Blockly.common.setMainWorkspace(this.workspace);

    FieldFlydown.showPid_ = 0;
    FieldFlydown.lastTapField_ = null;
    FieldFlydown.lastTapTime_ = 0;

    // Editable field: the NAME of a global declaration (FieldGlobalFlydown).
    this.globalBlock = this.workspace.newBlock('global_declaration');
    this.editable = this.globalBlock.getField('NAME');
    assert.instanceOf(this.editable, FieldFlydown);
    assert.isTrue(this.editable.EDITABLE);

    // Non-editable field: a parameter flydown constructed with isEditable=false
    // (what event-parameter fields use).
    this.paramBlock = this.workspace.newBlock('text');
    this.readOnly = new FieldParameterFlydown('x', false);
    this.paramBlock.appendDummyInput().appendField(this.readOnly, 'P');
    assert.isFalse(this.readOnly.EDITABLE);

    this.showFlydown = {
      editable: sinon.stub(this.editable, 'showFlydown_'),
      readOnly: sinon.stub(this.readOnly, 'showFlydown_'),
    };
    this.editor = sinon.stub(Blockly.FieldTextInput.prototype, 'showEditor_');
  });

  teardown(function() {
    this.editor.restore();
    this.clock.restore();
    this.workspace.dispose();
    if (!this.hadWindow) delete globalThis.window;
    FieldFlydown.showPid_ = 0;
    FieldFlydown.lastTapField_ = null;
    FieldFlydown.lastTapTime_ = 0;
  });

  suite('touch', function() {
    test('a single tap opens the flydown, not the editor', function() {
      this.editable.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.editable.calledOnce);
      assert.isTrue(this.editor.notCalled);
      assert.strictEqual(FieldFlydown.lastTapField_, this.editable);
    });

    test('a second tap within the timeout opens the editor on an editable ' +
        'field', function() {
      const first = pointer('touch');
      const second = pointer('touch');
      this.editable.showEditor_(first);
      this.clock.tick(FieldFlydown.DOUBLE_TAP_TIMEOUT - 100);
      this.editable.showEditor_(second);
      assert.isTrue(this.editor.calledOnce);
      assert.strictEqual(this.editor.firstCall.args[0], second);
      assert.isTrue(this.showFlydown.editable.calledOnce,
          'only the first tap opens the flydown');
      assert.isTrue(this.workspace.hideChaff.called);
      assert.isNull(FieldFlydown.lastTapField_);
      assert.strictEqual(FieldFlydown.lastTapTime_, 0);
    });

    test('two taps further apart than the timeout are two single taps',
        function() {
      this.editable.showEditor_(pointer('touch'));
      this.clock.tick(FieldFlydown.DOUBLE_TAP_TIMEOUT + 1);
      this.editable.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.editable.calledTwice);
      assert.isTrue(this.editor.notCalled);
      assert.strictEqual(FieldFlydown.lastTapField_, this.editable);
    });

    test('a second tap on a non-editable field does nothing', function() {
      this.readOnly.showEditor_(pointer('touch'));
      this.clock.tick(100);
      this.readOnly.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.readOnly.calledOnce,
          'only the first tap opens the flydown');
      assert.isTrue(this.editor.notCalled);
      assert.isNull(FieldFlydown.lastTapField_);
    });

    test('a third tap on a non-editable field starts a new single-tap cycle',
        function() {
      this.readOnly.showEditor_(pointer('touch'));
      this.clock.tick(100);
      this.readOnly.showEditor_(pointer('touch'));
      this.clock.tick(100);
      this.readOnly.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.readOnly.calledTwice);
      assert.isTrue(this.editor.notCalled);
    });

    test('tapping a different field within the timeout is a single tap on it',
        function() {
      this.editable.showEditor_(pointer('touch'));
      this.clock.tick(100);
      this.readOnly.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.editable.calledOnce);
      assert.isTrue(this.showFlydown.readOnly.calledOnce);
      assert.isTrue(this.editor.notCalled);
      assert.strictEqual(FieldFlydown.lastTapField_, this.readOnly);
    });

    test('a tap does not open the flydown while the workspace is dragging',
        function() {
      this.workspace.isDragging = () => true;
      this.editable.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.editable.notCalled);
      assert.isTrue(this.editor.notCalled);
    });

    test('a tap on a field inside a flyout falls back to click behaviour',
        function() {
      this.globalBlock.isInFlyout = true;
      this.paramBlock.isInFlyout = true;
      this.editable.showEditor_(pointer('touch'));
      this.readOnly.showEditor_(pointer('touch'));
      assert.isTrue(this.showFlydown.editable.notCalled);
      assert.isTrue(this.showFlydown.readOnly.notCalled);
      assert.isTrue(this.editor.calledOnce,
          'editable field still opens the editor');
    });

    test('a tap cancels a pending hover timer', function() {
      FieldFlydown.showPid_ = window.setTimeout(() => {}, FieldFlydown.timeout);
      this.editable.showEditor_(pointer('touch'));
      assert.strictEqual(FieldFlydown.showPid_, 0);
      assert.isTrue(this.showFlydown.editable.calledOnce);
    });

    test('disposing the tapped field clears the tap state', function() {
      this.editable.showEditor_(pointer('touch'));
      assert.strictEqual(FieldFlydown.lastTapField_, this.editable);
      this.globalBlock.dispose();
      assert.isNull(FieldFlydown.lastTapField_);
      assert.strictEqual(FieldFlydown.lastTapTime_, 0);
    });
  });

  suite('mouse and pen keep the legacy behaviour', function() {
    ['mouse', 'pen', undefined].forEach(function(pointerType) {
      const label = pointerType || 'no pointerType';

      test(`${label}: click edits an editable field, never opens the flydown`,
          function() {
        const e = pointer(pointerType);
        this.editable.showEditor_(e);
        assert.isTrue(this.editor.calledOnce);
        assert.strictEqual(this.editor.firstCall.args[0], e);
        assert.isTrue(this.showFlydown.editable.notCalled);
        assert.isNull(FieldFlydown.lastTapField_);
      });

      test(`${label}: click on a non-editable field does nothing`, function() {
        this.readOnly.showEditor_(pointer(pointerType));
        assert.isTrue(this.editor.notCalled);
        assert.isTrue(this.showFlydown.readOnly.notCalled);
      });
    });

    test('a click cancels a pending hover timer before editing',
        function() {
      FieldFlydown.showPid_ = window.setTimeout(() => {}, FieldFlydown.timeout);
      this.editable.showEditor_(pointer('mouse'));
      assert.strictEqual(FieldFlydown.showPid_, 0);
      assert.isTrue(this.workspace.hideChaff.calledOnce);
      assert.isTrue(this.editor.calledOnce);
    });
  });

  suite('hover timer', function() {
    test('mouse hover arms the timer and shows the flydown after the timeout',
        function() {
      this.editable.onMouseOver_(pointer('mouse'));
      assert.notStrictEqual(FieldFlydown.showPid_, 0);
      this.clock.tick(FieldFlydown.timeout);
      assert.isTrue(this.showFlydown.editable.calledOnce);
      assert.strictEqual(FieldFlydown.showPid_, 0);
    });

    test('pen hover behaves like mouse hover', function() {
      this.editable.onMouseOver_(pointer('pen'));
      assert.notStrictEqual(FieldFlydown.showPid_, 0);
      this.clock.tick(FieldFlydown.timeout);
      assert.isTrue(this.showFlydown.editable.calledOnce);
    });

    test('touch never arms the hover timer', function() {
      this.editable.onMouseOver_(pointer('touch'));
      assert.strictEqual(FieldFlydown.showPid_, 0);
      this.clock.tick(FieldFlydown.timeout * 2);
      assert.isTrue(this.showFlydown.editable.notCalled);
    });

    test('leaving before the timeout cancels the flydown', function() {
      this.editable.onMouseOver_(pointer('mouse'));
      this.clock.tick(FieldFlydown.timeout - 1);
      this.editable.onMouseOut_(pointer('mouse'));
      this.clock.tick(FieldFlydown.timeout);
      assert.isTrue(this.showFlydown.editable.notCalled);
      assert.strictEqual(FieldFlydown.showPid_, 0);
    });

    test('the hover timer does not show the flydown while the inline editor ' +
        'is open', function() {
      this.editable.htmlInput_ = {};
      this.editable.onMouseOver_(pointer('mouse'));
      this.clock.tick(FieldFlydown.timeout);
      assert.isTrue(this.showFlydown.editable.notCalled);
      delete this.editable.htmlInput_;
    });
  });
});
