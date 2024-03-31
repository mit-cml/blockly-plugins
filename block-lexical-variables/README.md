# blockly-block-lexical-variables [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

This plugin adds a set of [Blockly](https://www.npmjs.com/package/blockly) 
blocks that support lexical (aka local) variables, as well as a dynamic UI
for obtaining variable and parameter getters and setters and for renaming variables.
It  also updates the UI for existing blocks that are implicitly lexically scoped,
i.e.:
* Function/Procedure definitions
* For loops

For variable getter and setter blocks this
plugin also provides dropdowns which allow the user to change the variable
name to any variable allowed by scope.  The plugin will also mark any variable blocks
that are moved out of their allowable scope.

The plugin also adds a dropdown for procedure call blocks, allowing the user to
change the call to be any other procedure of the same basic shape (i.e. statement
shape or expression shape).

This plugin is based on code originally written for 
[MIT App Inventor](https://appinventor.mit.edu).

You can see a demo version of a Blockly app that has integrated this plugin
[here](https://mit-cml.github.io/lexical-variable-demo/).  The code for that
demo is [here](https://github.com/mit-cml/lexical-variable-demo).

## Blocks
### Lexical/local variable declarations
**Block type: 'local-declaration-statement'** - The variable name will be scoped to be valid
within the body of the block.

![A picture of a lexical variable block](readme-media/lexvar.png "Lexical variable")

While hovering over the variable name:

![A picture of a lexical variable block with getter and setter blocks](readme-media/lexvar-with-flydown.png "Lexical variable with flydown")

### Global variable declaration
**Block type: 'global-declaration-statement'** - An block which declares a global variable. The
variable name is scoped to the entire program.

![A picture of a global variable block](readme-media/globalvar.png "Global variable")

and while hovering over the variable name:

![A picture of a global variable block with getter and setter blocks](readme-media/globalvar-with-flydown.png "Global variable with flydown")

## Variable/Parameter setters and getters
### Setter
**Block type: 'lexical_variable_set'** - Note that despite the block type name, the 
same block is used for global variables, local variables, loop variables and 
function/procedure parameters.  The names that appear in the dropdown will change
according to the placement of the block.  I.e., it will show the variables that are
in scope for that getter according to which blocks it is within.

![A picture of a setter block](readme-media/set.png "Setter")
![A picture of a setter block with a dropdown](readme-media/set-with-dropdown.png "Setter with dropdown")
![A picture of a setter block within another block](readme-media/set-within-scope.png "Setter with dropdown")

###Getter
**Block type: 'lexical_variable_get'** - Exactly analogous to the setter block.

![A picture of a getter block](readme-media/get.png "Getter")
![A picture of a getter block with a dropdown](readme-media/get-with-dropdown.png "Getter with dropdown")
![A picture of a getter block within another block](readme-media/get-within-scope.png "Getter with dropdown")

## Loops
### For
**Block type: 'controls_for'** - A block which enables a `for` loop

![A picture of a for block](readme-media/for.png "For")
![A picture of a for block](readme-media/for-with-flydown.png "For")

**Block type: 'controls_forEach'** - A block which enables a loop over the items in a list

![A picture of a for block](readme-media/forlist.png "For")
![A picture of a for block](readme-media/forlist-with-flydown.png "For")

## Functions/procedures
### Function/procedure definition with no return value.
**Block type: 'procedures_defnoreturn'**

![A picture of a procedure definition block](readme-media/procdef.png "Procedure def.")

![A picture of a procedure definition block with flydown](readme-media/procdef-with-flydown.png "Procedure def.")

### Function/procedure definition with a return value.
**Block type: 'procedures_defreturn'**

![A picture of a procedure definition block with return value](readme-media/procdef-return.png "Procedure def.")

![A picture of a procedure definition block with return and with flydown](readme-media/procdef-return-with-flydown.png "Procedure def.")

### Function/procedure call with no value
**Block type: 'procedures_callnoreturn'** - Note that, though I don't show it here, the
procedure name field is a dropdown which allows the user to select any procedure and 
the block will change to match that procedures name and parameters.

![A picture of a procedure call block](readme-media/proccall.png "Procedure call")
or
![A picture of a procedure call block](readme-media/proccall-inline.png "Procedure call")

### Function/procedure call with value
**Block type: 'procedures_callreturn'** - This has the same dropdown behavior as the previous procedure
call block.

![A picture of a procedure call block with a value](readme-media/proccall-with-return.png "Procedure call")
or
![A picture of a procedure call block with a value](readme-media/proccall-with-return-inline.png "Procedure call")

## Notes
Right now the new fields and the new (or redefined) blocks are somewhat
co-dependent.  At some point they will be disentangled.  At that point
this plugin might split into two; one for the fields and one for the blocks,
with the latter plugin dependent on the first.  At that point you will
also be able to build you own blocks using the fields.

## Installation

### Yarn
```
yarn add @mit-app-inventor/blockly-block-lexical-variables
```

### npm
```
npm install @mit-app-inventor/blockly-block-lexical-variables --save
```

## Usage
_Please make sure that your app which includes this plugin uses a relatively recent version of Blockly.  As of this
writing that would be version 8.0.0._

You'll want to include something like the following in your app:

```js
import Blockly from 'blockly';
import { LexicalVariablesPlugin } from '@mit-app-inventor/blockly-block-lexical-variables';
...
const workspace = Blockly.inject(...);
...
// Load lexical variable plugin
LexicalVariablesPlugin.init(workspace);
```
Note that unlike with standard Blockly, you should **not** use a custom toolbox category
for your variables, as this would interfere with the way that variables are declared and
used with this plugin.  Just create an ordinary Variables category, if you want, and
place the lexical-variable-get and lexical-variable-set blocks in there.

In theory, you can also use the lexical variable fields to build your own blocks,
but the process is not documented yet.  If you're really curious, take a look
at the block definitions.  Basically, in addition to using the fields there are
a bunch of properties and methods that you need to define on your blocks to make it
all work.
## Credits
As mentioned earlier, this plugin is based on code written for
[MIT App Inventor](https://github.com/mit-cml/appinventor-sources). The lexical 
variable implementation (and supporting blocks and UI) in App Inventor was
developed primarily by **Lyn Turbak** but has had many contributors over the years
including (in roughly chronological order):
* Sharon Perl
* Andrew McKinney
* Hal Abelson
* PMW
* Ralph Morelli
* Jeffry Schiller
* Jose Flores
* Joanie Weaver
* Shirley Lu
* mphox
* Leo Burd
* Dave Wolber
* Harry Davis
* WeiHua Li
* jbensal
* Shruti Rijhwani
* Liz Looney
* Evan Patton
* Susan Lane
* Colin Yang
* Beka Westberg
* Siddharth
* Mark Friedman

If you contributed to this code at some point and I somehow neglected to 
mention you, I apologise.  Let me know, file a bug or just submit a pull request
on this file.
## License
Apache 2.0
