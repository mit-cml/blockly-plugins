// -*- mode: java; c-basic-offset: 2; -*-
// Copyright © 2013-2022 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Component blocks for Blockly, modified for MIT App Inventor.
 * @author mckinney@mit.edu (Andrew F. McKinney)
 * @author sharon@google.com (Sharon Perl)
 * @author ewpatton@mit.edu (Evan W. Patton)
 */

'use strict';

import Blockly from 'blockly';
import * as BlockUtilities from './utilities.js';

const components = {};
const ComponentBlock = {};

/*
 * All component blocks have category=='Component'. In addition to the standard blocks fields,
 * All regular component blocks have a field instanceName whose value is the name of their
 * component. For example, the blocks representing a Button1.Click event has
 * instanceName=='Button1'. All generic component blocks have a field typeName whose value is
 * the name of their component type.
 */

/**
 * Block Colors Hues (See blockly.js for Saturation and Value - fixed for
 * all blocks)
 */
ComponentBlock.COLOUR_EVENT = Blockly.CONTROL_CATEGORY_HUE;
ComponentBlock.COLOUR_METHOD = Blockly.PROCEDURE_CATEGORY_HUE;
ComponentBlock.COLOUR_GET = '#439970';  // [67, 153, 112]
ComponentBlock.COLOUR_SET = '#266643';  // [38, 102, 67]
ComponentBlock.COLOUR_COMPONENT = '#439970';  // [67, 153, 112]

ComponentBlock.COMPONENT_SELECTOR = "COMPONENT_SELECTOR";
ComponentBlock.COMPONENT_TYPE_SELECTOR = "COMPONENT_TYPE_SELECTOR";

/**
 * Add a menu option to the context menu for {@code block} to swap between
 * the generic and specific versions of the block.
 *
 * @param {Blockly.BlockSvg} block the block to manipulate
 * @param {Array.<{enabled,text,callback}>} options the menu options
 */
ComponentBlock.addGenericOption = function(block, options) {
    if ((block.type === 'component_event' && block.isGeneric) || block.typeName === 'Form') {
        return;  // Cannot make a generic component_event specific for now...
    }

    /**
     * Helper function used to make component blocks generic.
     *
     * @param {Blockly.BlockSvg} block  the block to be made generic
     * @param {(!Element|boolean)=} opt_replacementDom  DOM tree for a replacement block to use in the
     * substitution, false if no substitution should be made, or undefined if the substitution should
     * be inferred.
     */
    function makeGeneric(block, opt_replacementDom) {
        const instanceName = block.instanceName;
        const mutation = block.mutationToDom();
        const oldMutation = Blockly.Xml.domToText(mutation);
        mutation.setAttribute('is_generic', 'true');
        mutation.removeAttribute('instance_name');
        const newMutation = Blockly.Xml.domToText(mutation);
        block.domToMutation(mutation);
        block.initSvg();  // block shape may have changed
        block.render();
        Blockly.Events.fire(new Blockly.Events.Change(
            block, 'mutation', null, oldMutation, newMutation));
        if (block.type === 'component_event') opt_replacementDom = false;
        if (opt_replacementDom !== false) {
            if (opt_replacementDom === undefined) {
                const compBlockXml = '<xml><block type="component_component_block">' +
                    '<mutation component_type="' + block.typeName + '" instance_name="' + instanceName + '"></mutation>' +
                    '<field name="COMPONENT_SELECTOR">' + instanceName + '</field>' +
                    '</block></xml>';
                opt_replacementDom = Blockly.Xml.textToDom(compBlockXml).firstElementChild;
            }
            const replacement = Blockly.Xml.domToBlock(opt_replacementDom, block.workspace);
            replacement.initSvg();
            block.getInput('COMPONENT').connection.connect(replacement.outputConnection);
        }
        const group = Blockly.Events.getGroup();
        setTimeout(function() {
            Blockly.Events.setGroup(group);
            // noinspection JSAccessibilityCheck
            block.bumpNeighbours_();
            Blockly.Events.setGroup(false);
        }, Blockly.BUMP_DELAY);
    }

    const item = {enabled: false};
    if (block.isGeneric) {
        const compBlock = block.getInputTargetBlock('COMPONENT');
        item.enabled = compBlock && compBlock.type === 'component_component_block';
        item.text = Blockly.BlocklyEditor.makeMenuItemWithHelp(Blockly.Msg.UNGENERICIZE_BLOCK,
            '/reference/other/any-component-blocks.html');
        item.callback = function () {
            try {
                Blockly.Events.setGroup(true);
                const instanceName = compBlock.instanceName;
                compBlock.dispose(true);
                const mutation = block.mutationToDom();
                const oldMutation = Blockly.Xml.domToText(mutation);
                mutation.setAttribute('instance_name', instanceName);
                mutation.setAttribute('is_generic', 'false');
                const newMutation = Blockly.Xml.domToText(mutation);
                block.domToMutation(mutation);
                block.initSvg();  // block shape may have changed
                block.render();
                Blockly.Events.fire(new Blockly.Events.Change(
                    block, 'mutation', null, oldMutation, newMutation));
                const group = Blockly.Events.getGroup();
                setTimeout(function () {
                    Blockly.Events.setGroup(group);
                    // noinspection JSAccessibilityCheck
                    block.bumpNeighbours_();
                    Blockly.Events.setGroup(false);
                }, Blockly.BUMP_DELAY);
            } finally {
                Blockly.Events.setGroup(false);
            }
        };
    } else if (block.type === 'component_event') {
        item.enabled = true;
        item.text = Blockly.BlocklyEditor.makeMenuItemWithHelp(Blockly.Msg.GENERICIZE_BLOCK,
            '/reference/other/any-component-blocks.html');
        item.callback = function() {
            try {
                Blockly.Events.setGroup(true);
                const instanceName = block.instanceName;
                const intlName = block.workspace.getComponentDatabase()
                    .getInternationalizedParameterName('component');

                // Aggregate variables in scope
                const namesInScope = {};
                let maxNum = 0;
                const regex = new RegExp('^' + intlName + '([0-9]+)$');
                const varDeclsWithIntlName = [];
                block.walk(function(block) {
                    if (block.type === 'local_declaration_statement' ||
                        block.type === 'local_declaration_expression') {
                        const localNames = block.getVars();
                        localNames.forEach(function(varname) {
                            namesInScope[varname] = true;
                            const match = varname.match(regex);
                            if (match) {
                                maxNum = Math.max(maxNum, parseInt(match[1]));
                            }
                            if (varname === intlName) {
                                varDeclsWithIntlName.push(block);
                            }
                        });
                    }
                });

                // Rename local variable definition of i18n(component) to prevent
                // variable capture
                if (intlName in namesInScope) {
                    varDeclsWithIntlName.forEach(function(block) {
                        Blockly.LexicalVariable.renameParamFromTo(block, intlName, intlName + (maxNum + 1).toString(), true);
                    });
                }

                // Make generic the block and any descendants of the same component instance
                const varBlockXml = '<xml><block type="lexical_variable_get">' +
                    '<mutation><eventparam name="component"></eventparam></mutation>' +
                    '<field name="VAR">' + intlName + '</field></block></xml>';
                const varBlockDom = Blockly.Xml.textToDom(varBlockXml).firstElementChild;
                makeGeneric(block);  // Do this first so 'component' is defined.
                block.walk(function(block) {
                    if ((block.type === 'component_method' || block.type === 'component_set_get') &&
                        block.instanceName === instanceName) {
                        makeGeneric(/** @type Blockly.BlockSvg */ block, varBlockDom);
                    }
                });
            } finally {
                Blockly.Events.setGroup(false);
            }
        };
    } else {
        item.enabled = true;
        item.text = Blockly.BlocklyEditor.makeMenuItemWithHelp(Blockly.Msg.GENERICIZE_BLOCK,
            '/reference/other/any-component-blocks.html');
        item.callback = function() {
            try {
                Blockly.Events.setGroup(true);
                makeGeneric(block);
            } finally {
                Blockly.Events.setGroup(false);
            }
        };
    }
    options.splice(options.length - 1, 0, item);
};

/**
 * Marks the passed block as a badBlock() and disables it if the data associated
 * with the block is not defined, or the data is marked as deprecated.
 * @param {Blockly.BlockSvg} block The block to check for deprecation.
 * @param {EventDescriptor|MethodDescriptor|PropertyDescriptor} data The data
 *     associated with the block which is possibly deprecated.
 */
ComponentBlock.checkDeprecated = function(block, data) {
    if (data && data.deprecated && block.workspace == Blockly.mainWorkspace) {
        block.setDisabled(true);
    }
}

/**
 * Create an event block of the given type for a component with the given
 * instance name. eventType is one of the "events" objects in a typeJsonString
 * passed to Blockly.Component.add.
 * @lends {Blockly.BlockSvg}
 * @lends {Blockly.Block}
 */
Blockly.Blocks.component_event = {
    category : 'Component',
    blockType : 'event',

    init: function() {
        this.componentDropDown = ComponentBlock.createComponentDropDown(this);
    },

    mutationToDom : function() {

        const container = document.createElement('mutation');
        container.setAttribute('component_type', this.typeName);
        container.setAttribute('is_generic', this.isGeneric ? "true" : "false");
        if (!this.isGeneric) {
            container.setAttribute('instance_name', this.instanceName);//instance name not needed
        }

        container.setAttribute('event_name', this.eventName);
        if (!this.horizontalParameters) {
            container.setAttribute('vertical_parameters', "true"); // Only store an element for vertical
                                                                   // The absence of this attribute means horizontal.
        }

        // Note that this.parameterNames only contains parameter names that have
        // overridden the default event parameter names specified in the component
        // DB
        for (let i = 0; i < this.parameterNames.length; i++) {
            container.setAttribute('param_name' + i, this.parameterNames[i]);
        }

        return container;
    },

    domToMutation : function(xmlElement) {
        const oldRendered = this.rendered;
        this.rendered = false;
        let oldDo = null;
        for (var i = 0, input; input = this.inputList[i]; i++) {
            if (input.connection) {
                if (input.name === 'DO') {
                    oldDo = input.connection.targetBlock();
                }
                const block = input.connection.targetBlock();
                if (block) {
                    block.unplug();
                }
            }
            input.dispose();
        }
        this.inputList.length = 0;

        this.typeName = xmlElement.getAttribute('component_type');
        this.eventName = xmlElement.getAttribute('event_name');
        this.isGeneric = xmlElement.getAttribute('is_generic') == 'true';
        if (!this.isGeneric) {
            this.instanceName = xmlElement.getAttribute('instance_name');//instance name not needed
        } else {
            delete this.instanceName;
        }

        // this.parameterNames will be set to a list of names that will override the
        // default names specified in the component DB. Note that some parameter
        // names may be overridden while others may remain their defaults
        this.parameterNames = [];
        const numParams = this.getDefaultParameters_().length;
        for (var i = 0; i < numParams; i++) {
            const paramName = xmlElement.getAttribute('param_name' + i);
            // For now, we only allow explicit parameter names starting at the beginning
            // of the parameter list.  Some day we may allow an arbitrary subset of the
            // event params to be explicitly specified.
            if (!paramName) break;
            this.parameterNames.push(paramName);
        }

        // Orient parameters horizontally by default
        const horizParams = xmlElement.getAttribute('vertical_parameters') !== "true";

        this.setColour(ComponentBlock.COLOUR_EVENT);

        let localizedEventName;
        const eventType = this.getEventTypeObject();
        const componentDb = this.getTopWorkspace().getComponentDatabase();
        if (eventType) {
            localizedEventName = componentDb.getInternationalizedEventName(eventType.name);
        }
        else {
            localizedEventName = componentDb.getInternationalizedEventName(this.eventName);
        }

        if (!this.isGeneric) {
            this.appendDummyInput('WHENTITLE').appendField(Blockly.Msg.LANG_COMPONENT_BLOCK_TITLE_WHEN)
                .appendField(this.componentDropDown, ComponentBlock.COMPONENT_SELECTOR)
                .appendField('.' + localizedEventName);
            this.componentDropDown.setValue(this.instanceName);
        } else {
            this.appendDummyInput('WHENTITLE').appendField(Blockly.Msg.LANG_COMPONENT_BLOCK_GENERIC_EVENT_TITLE
                + componentDb.getInternationalizedComponentType(this.typeName) + '.' + localizedEventName);
        }
        this.setParameterOrientation(horizParams);
        let tooltipDescription;
        if (eventType) {
            tooltipDescription = componentDb.getInternationalizedEventDescription(this.getTypeName(), eventType.name,
                eventType.description);
        }
        else {
            tooltipDescription = componentDb.getInternationalizedEventDescription(this.getTypeName(), this.eventName);
        }
        this.setTooltip(tooltipDescription);
        this.setPreviousStatement(false, null);
        this.setNextStatement(false, null);

        if (oldDo) {
            this.getInput('DO').connection.connect(oldDo.previousConnection);
        }

        for (var i = 0, input; input = this.inputList[i]; i++) {
            input.init();
        }

        // Set as badBlock if it doesn't exist.
        this.verify();
        // Disable it if it does exist and is deprecated.
        ComponentBlock.checkDeprecated(this, eventType);

        this.rendered = oldRendered;
    },

    getTypeName: function() {
        return this.typeName === 'Form' ? 'Screen' : this.typeName;
    },
    // [lyn, 10/24/13] Allow switching between horizontal and vertical display of arguments
    // Also must create flydown params and DO input if they don't exist.

    // TODO: consider using top.BlocklyPanel... instead of window.parent.BlocklyPanel

    setParameterOrientation: function(isHorizontal) {
        let params = this.getParameters();
        if (!params)  {
            params = [];
        }
        const componentDb = this.getTopWorkspace().getComponentDatabase();
        const oldDoInput = this.getInput("DO");
        if (!oldDoInput || (isHorizontal !== this.horizontalParameters && params.length > 0)) {
            this.horizontalParameters = isHorizontal;

            let bodyConnection = null, i, param, newDoInput;
            if (oldDoInput) {
                bodyConnection = oldDoInput.connection.targetConnection; // Remember any body connection
            }
            if (this.horizontalParameters) { // Replace vertical by horizontal parameters

                if (oldDoInput) {
                    // Remove inputs after title ...
                    for (i = 0; i < params.length; i++) {
                        this.removeInput('VAR' + i); // vertical parameters
                    }
                    this.removeInput('DO');
                }

                // ... and insert new ones:
                if (params.length > 0) {
                    const paramInput = this.appendDummyInput('PARAMETERS')
                        .appendField(" ")
                        .setAlign(Blockly.ALIGN_LEFT);
                    for (i = 0; param = params[i]; i++) {
                        var field = new Blockly.FieldEventFlydown(
                            param, componentDb, Blockly.FieldFlydown.DISPLAY_BELOW);
                        paramInput.appendField(field, 'VAR' + i)
                            .appendField(" ");
                    }
                }

                newDoInput = this.appendStatementInput("DO")
                    .appendField(Blockly.Msg.LANG_COMPONENT_BLOCK_TITLE_DO); // Hey, I like your new do!
                if (bodyConnection) {
                    newDoInput.connection.connect(bodyConnection);
                }

            } else { // Replace horizontal by vertical parameters

                if (oldDoInput) {
                    // Remove inputs after title ...
                    this.removeInput('PARAMETERS'); // horizontal parameters
                    this.removeInput('DO');
                }

                // ... and insert new ones:

                // Vertically aligned parameters
                for (i = 0; param = params[i]; i++) {
                    var field = new Blockly.FieldEventFlydown(param, componentDb);
                    this.appendDummyInput('VAR' + i)
                        .appendField(field, 'VAR' + i)
                        .setAlign(Blockly.ALIGN_RIGHT);
                }
                newDoInput = this.appendStatementInput("DO")
                    .appendField(Blockly.Msg.LANG_COMPONENT_BLOCK_TITLE_DO);
                if (bodyConnection) {
                    newDoInput.connection.connect(bodyConnection);
                }
            }
            if (Blockly.Events.isEnabled()) {
                // Trigger a Blockly UI change event
                Blockly.Events.fire(new Blockly.Events.Ui(this, 'parameter_orientation',
                    (!this.horizontalParameters).toString(), this.horizontalParameters.toString()))
            }
        }
    },
    // Return a list of parameter names
    getParameters: function () {
        /** @type {EventDescriptor} */
        const defaultParameters = this.getDefaultParameters_();
        const explicitParameterNames = this.getExplicitParameterNames_();
        const params = [];
        for (let i = 0; i < defaultParameters.length; i++) {
            const paramName = explicitParameterNames[i] || defaultParameters[i].name;
            params.push({name: paramName, type: defaultParameters[i].type});
        }
        return params;
    },
    getDefaultParameters_: function () {
        const eventType = this.getEventTypeObject();
        if (this.isGeneric) {
            return [
                {name:'component', type:'component'},
                {name:'notAlreadyHandled', type: 'boolean'}
            ].concat((eventType && eventType.parameters) || []);
        }
        return eventType && eventType.parameters;
    },
    getExplicitParameterNames_: function () {
        return this.parameterNames;
    },
    // Renames the block's instanceName and type (set in BlocklyBlock constructor), and revises its title
    rename : function(oldname, newname) {
        if (this.instanceName == oldname) {
            this.instanceName = newname;
            this.componentDropDown.setValue(this.instanceName);
            return true;
        }
        return false;
    },
    renameVar: function(oldName, newName) {
        let i = 0, param = 'VAR' + i, input;
        for (
            ; input = this.getFieldValue(param)
            ; i++, param = 'VAR' + i) {
            if (Blockly.Names.equals(oldName, input)) {
                this.setFieldValue(param, newName);
            }
        }
    },
    helpUrl : function() {
        let url = ComponentBlock.EVENTS_HELPURLS[this.getTypeName()];
        if (url && url[0] == '/') {
            const parts = url.split('#');
            parts[1] = this.getTypeName() + '.' + this.eventName;
            url = parts.join('#');
        }
        return url;
    },

    getVars: function() {
        const varList = [];
        let i = 0, input;
        for (; input = this.getFieldValue('VAR' + i); i++) {
            varList.push(input);
        }
        return varList;
    },

    getVarString: function() {
        let varString = "";
        let i = 0, param;
        for (; param = this.getFieldValue('VAR' + i); i++) {
            // [lyn, 10/13/13] get current name from block, not from underlying event (may have changed)
            if(i != 0){
                varString += " ";
            }
            varString += param;
        }
        return varString;
    },

    declaredNames: function() { // [lyn, 10/13/13] Interface with Blockly.LexicalVariable.renameParam
        const names = [];
        let i = 0, param;
        for (; param = this.getField('VAR' + i); i++) {
            names.push(param.getText());
            if (param.eventparam && param.eventparam != param.getText()) {
                names.push(param.eventparam);
            }
        }
        return names;
    },

    declaredVariables: function() {
        const names = [];
        let i = 0, param;
        for (; param = this.getField('VAR' + i); i++) {
            names.push(param.getText());
        }
        return names;
    },

    blocksInScope: function() { // [lyn, 10/13/13] Interface with Blockly.LexicalVariable.renameParam
        const doBlock = this.getInputTargetBlock('DO');
        if (doBlock) {
            return [doBlock];
        } else {
            return [];
        }
    },

    /**
     * Get the underlying event descriptor for the block.
     * @returns {EventDescriptor}
     */
    getEventTypeObject : function() {
        return this.getTopWorkspace().getComponentDatabase().getEventForType(this.typeName, this.eventName);
    },

    typeblock : function(){
        const componentDb = Blockly.mainWorkspace.getComponentDatabase();
        const tb = [];
        const types = {};

        componentDb.forEachInstance(function(instance) {
            types[instance.typeName] = true;
            componentDb.forEventInType(instance.typeName, function(_, eventName) {
                tb.push({
                    translatedName: Blockly.Msg.LANG_COMPONENT_BLOCK_TITLE_WHEN + instance.name + '.' +
                        componentDb.getInternationalizedEventName(eventName),
                    mutatorAttributes: {
                        component_type: instance.typeName,
                        instance_name: instance.name,
                        event_name: eventName
                    }
                });
            });
        });

        delete types['Form'];

        Object.keys(types).forEach(function(typeName) {
            componentDb.forEventInType(typeName, function(_, eventName) {
                tb.push({
                    translatedName: Blockly.Msg.LANG_COMPONENT_BLOCK_GENERIC_EVENT_TITLE +
                        componentDb.getInternationalizedComponentType(typeName) +  '.' +
                        componentDb.getInternationalizedEventName(eventName),
                    mutatorAttributes: {
                        component_type: typeName,
                        is_generic: true,
                        event_name: eventName
                    }
                });
            });
        });

        return tb;
    },
    customContextMenu: function (options) {
        Blockly.FieldParameterFlydown.addHorizontalVerticalOption(this, options);
        ComponentBlock.addGenericOption(this, options);
        Blockly.BlocklyEditor.addPngExportOption(this, options);
        Blockly.BlocklyEditor.addGenerateYailOption(this, options);
    },

    // check if the block corresponds to an event inside componentTypes[typeName].eventDictionary
    verify : function () {

        const validate = function () {
            // check component type
            const componentDb = this.getTopWorkspace().getComponentDatabase();
            const componentType = componentDb.getType(this.typeName);
            if (!componentType) {
                return false; // component does NOT exist! should not happen!
            }
            const eventDictionary = componentType.eventDictionary;
            /** @type {EventDescriptor} */
            const event = eventDictionary[this.eventName];
            // check event name
            if (!event) {
                return false; // no such event : this event was for another version!  block is undefined!
            }
            // check parameters
            const varList = this.getVars();
            const params = event.parameters;
            if (this.isGeneric) {
                varList.splice(0, 2);  // remove component and wasDefined parameters
                                       // since we know they are well-defined
            }
            if (varList.length != params.length) {
                return false; // parameters have changed
            }
            if ("true" === componentType.external) {
                for (let x = 0; x < varList.length; ++x) {
                    let found = false;
                    let i = 0, param;
                    for (; param = params[i]; ++i) {
                        if (componentDb.getInternationalizedParameterName(param.name) == varList[x]) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        return false; // parameter name changed
                    }
                }
            }
            // No need to check event return type, events do not return.
            return true; // passed all our tests! block is defined!
        };
        const isDefined = validate.call(this);

        if (isDefined) {
            this.notBadBlock();
        } else {
            this.badBlock();
        }

    },

    // [lyn, 12/31/2013] Next two fields used to check for duplicate component event handlers
    errors: [{name:"checkIfUndefinedBlock"},{name:"checkIfIAmADuplicateEventHandler"}, {name:"checkComponentNotExistsError"}],
    onchange: function(e) {
        if (e.isTransient) {
            return false;  // don't trigger error check on transient actions.
        }
        return this.workspace.getWarningHandler() && this.workspace.getWarningHandler().checkErrors(this);
    }
};

