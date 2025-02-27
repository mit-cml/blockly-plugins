## Lexical Variable Fields

There are four main fields defined by the Lexical Variable plugin:

* `FieldLexicalVariable` \- A dropdown field which shows the names of any variables that are in scope (i.e. that are referenceable) at the point of the program that that field's corresponding block appears.  Typically this is used for variable getter and setter blocks
* `FieldGlobalFlydown` \- A field which is used to name (and rename) a global variable.  It also provides a "flydown" which is displayed when the field is hovered over.  The flydown enables the user to select getter or setter blocks corresponding to the global variable.  This field is typically used as part of a block which defines a global variable.
* `FieldParameterFlydown` \- A somewhat poorly named field which is similar to the `FieldGlobalFlydown`, but is used for lexically scoped variables.  It is typically used to define such variables in blocks that introduce lexical scopes, e.g. for the parameters of procedure/function (hence the "parameter" in the field name) definitions, "let" type blocks, "for-loop" type blocks, etc.
* `FieldNoCheckDropdown` \- This is a field which is used by procedure call blocks to provide a dropdown of callable procedure names.  Unfortunately, it is not currently completely usable by itself to do that.  There is logic in the call blocks themselves which could (and should) be pulled out into a subclass of `FieldNoCheckDropdown` which could, more easily, be used to define your own call block(s).

For the plugin fields to work properly, there are a set of methods that the blocks that they are part of need to 
define.  They are:

* `referenceResults(name, prefix, env)`
* `withLexicalVarsAndPrefix(child, proc)`
* `getDeclaredVars()`
* `blocksInScope()`
* `declaredNames()`
* `renameVar(oldName, newName)` \- (maybe optional) If the block has a `renameVars` (note the 's' at the end) method, it means that the block has some extra logic beyond a simple rename.
* `renameBound(boundSubstitution, freeSubstitution)`
* `renameFree(freeSubstitution)`
* `freeVariables()`

Fortunately, if you are building a block that that doesn't have a mutation UI that needs to be kept
in sync with the fields, then the situation is a bit simpler.  In that case, you can use the `lexicalVariableScopeMixin`
defined in [mixins.js](src/mixins.js).  If you use that mixin you only need to define these two methods for your block:

* `getDeclaredVarFieldNames()`: a list of the names of the fields of the block's declared variables (e.g. "VARS").
* `getScopedInputName()`: The name of the input that defines the block's scope (e.g., "DO")

The mixin will then take care of the rest (i.e. define the rest of the methods that the block needs).  You add the mixin
to your block like this by calling `this.mixin(lexicalVariableScopeMixin);` in the block's `init()` method.
You can see examples of how to use it in [lexical-variables.js](src/blocks/lexical-variables.js) for the
`simple_local_declaration_statement` block
and in [controls.js](src/blocks/controls.js) for the`controls_forEach` and `controls_forRange` blocks.

## Method Details

`LexicalVariable.referenceResult(block, name, prefix, env)` \- Given a block, return a two element array (i.e. pair) of:

* (0) all getter/setter blocks referring to name in `block` and its children
* (1) all names within that block that would be captured if `name` were renamed to one of those names.  By 'captured' we mean that any references to that name would now refer to the renamed variable, rather than the original variable.  Basically we want to prevent such renames since they would change the semantics of the program.

`env` is a list of internally declared names in scope at this point.  Typically `referenceResult`        will be 
called by a defining block's `referenceResults` method for each of its input target blocks and next target blocks. 
The defining block will concatenate any variable names that it itself defines to the `env` that's passed into the 
block.  That concatenated set of names will be passed to any of the defining block's calls to `referenceResult` in 
its `env` argument.  Don't worry about `prefix` for now.

A block's `referenceResults(name, prefix, env)` method will return an array of two element arrays (i.e. pairs).  
Each pair will correspond to `LexicalVariable.referenceResult` called on one of the block's target blocks 
(corresponding to its inputs and its next block).  See the description of `LexicalVariable.referenceResult` for an 
explanation of what the elements of each of those pairs correspond to.

**More to come ...**
