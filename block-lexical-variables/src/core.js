// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2024 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

'use strict';

import {registerCss} from '../src/css.js';
import './utilities.js';
import './workspace.js';
import './inputs/indented_input.js';
import './procedure_utils.js';
import {Flydown} from './fields/flydown.js';
import {FieldFlydown} from "./fields/field_flydown.js";
import {FieldGlobalFlydown} from "./fields/field_global_flydown.js";
import './fields/field_nocheck_dropdown.js';
import {FieldLexicalVariable, LexicalVariable} from './fields/field_lexical_variable.js';
import {FieldParameterFlydown} from './fields/field_parameter_flydown.js';
import {FieldProcedureName} from './fields/field_procedurename.js';
import {FieldNoCheckDropdown} from './fields/field_nocheck_dropdown.js';
import {NameSet} from './nameSet.js';
import * as Shared from './shared.js';
import {Substitution} from './substitution.js';
import './procedure_database.js';
import * as Blockly from 'blockly/core';
import {GerasRenderer} from './renderers/geras.js';
import {lexicalVariableScopeMixin} from './mixins.js'

export class LexicalVariablesPlugin {

    /**
     * @param workspace
     */
    static init(workspace) {
        // TODO(ewpatton): We need to make sure this is reentrant.
        const rendererName = workspace.getRenderer().getClassName();
        const themeName = workspace.getTheme().getClassName();
        const selector = `.${rendererName}.${themeName}`;
        registerCss(selector);

        // TODO: Might need the next line
        // Blockly.DropDownDiv.createDom();
        const flydown = new Flydown(
            new Blockly.Options({
                scrollbars: false,
                rtl: workspace.RTL,
                renderer: workspace.options.renderer,
                rendererOverrides: workspace.options.rendererOverrides,
                parentWorkspace: workspace,
            })
        );
        // ***** [lyn, 10/05/2013] NEED TO WORRY ABOUT MULTIPLE BLOCKLIES! *****
        workspace.flydown_ = flydown;
        Blockly.utils.dom.insertAfter(flydown.createDom('g'),
            workspace.svgBubbleCanvas_);
        flydown.init(workspace);
        flydown.autoClose = true; // Flydown closes after selecting a block
    }

    static Flydown = Flydown;
    static FieldFlydown = FieldFlydown;
    static FieldGlobalFlydown = FieldGlobalFlydown;
    static FieldParameterFlydown = FieldParameterFlydown;
    static lexicalVariableScopeMixin= lexicalVariableScopeMixin;
    static LexicalVariable = LexicalVariable;
    static FieldLexicalVariable = FieldLexicalVariable;
    static FieldProcedureName = FieldProcedureName;
    static FieldNoCheckDropdown = FieldNoCheckDropdown;
    static NameSet = NameSet;
    static Shared = Shared;
    static Substitution = Substitution;
}

Blockly.blockRendering.register('geras2_renderer', GerasRenderer);
