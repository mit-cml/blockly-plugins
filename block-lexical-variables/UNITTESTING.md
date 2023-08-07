## Mocha tests

There are unit tests written in [Mocha](https://mochajs.org/) in tests/mocha.
Unfortunately, they can't be run as is.  Something with Mocha, Node or the combination doesn't seem to work properly
with imports of the form `import * as Blcokly from 'blockly/code';`. So, before running the tests, you need to
do a global replace of `import * as Blockly from 'blockly/code';` with `import Blockly from Blockly;` in 
**all the files in this package**. 

Once the above is done, you can run the tests with

```sh
node --loader=./tests/node-es6-loader.js node_modules/mocha/bin/mocha.js --ui tdd tests/mocha
```

Note that you need a node version >=20 (maybe v19 will work, but it's not been tested) and that we are using a custom 
loader that allows for (among other things)imports that don't have file extensions.

Note also that we don't use the `import Blockly from Blockly;` form in the package because it causes a huge blowup 
(~10X) in the size of the built dist file.

_TODO: write a script that does the above and add an invocation of it to the package.json file._
