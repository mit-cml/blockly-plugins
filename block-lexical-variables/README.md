# blockly-block-lexical-variables [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

This plugin adds a set of [Blockly](https://www.npmjs.com/package/blockly) 
blocks that support lexical (aka local) variables, as well as a dynamic UI
for obtaining variable getters and setters and for renaming variables.  It
also updates the UI for existing blocks that are implicitly lexically scoped,
i.e.:
* Function/Procedure definitions
* For loops

You can see a demo version of a Blockly app that has integrated this plugin
[here](https://mit-cml.github.io/lexical-variable-demo/).  The code for that
demo is [here](https://github.com/mit-cml/lexical-variable-demo).

_More explanation and pretty pictures to come!_

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

### Import
```js
import * as Blockly from 'blockly';
import * as LexicalVariables from '@mit-app-inventor/blockly-block-lexical-variables';
...
const workspace = Blockly.inject(...);
...
// Load lexical variable plugin
LexicalVariables.init(workspace);
```

## License
Apache 2.0
