<h1 align="center">
  blockly-workspace-notes
  <br />
  <img src="https://badge.ttsalpha.com/api?icon=typescript&label=TypeScript&status=5.9.3&color=3178C6&iconColor=3178C6" alt="TypeScript" />
  <img src="https://badge.ttsalpha.com/api?icon=nodedotjs&label=Node.js&status=20&color=5FA04E&iconColor=5FA04E" alt="Node.js" />
  <img src="https://badge.ttsalpha.com/api?icon=npm&label=NPM&status=10&color=CB3837&iconColor=CB3837" alt="NPM" />
  <br />
  <img src="https://badge.ttsalpha.com/api?label=Blockly&status=13.2.1&color=4285F4" alt="Blockly" />
  <img src="https://badge.ttsalpha.com/api?label=License&status=Apache--2.0&color=D22128" alt="License" />
</h1>

**blockly-workspace-notes** turns Blockly's workspace comments into sticky notes: draggable, resizable, colour-coded paper with a title, an author and a stacking order. They extend Blockly's own comments, so dragging, selection, keyboard navigation and undo all come for free, and they round-trip through both JSON and XML.

<p align="center">
  <img src="./docs/images/note-anatomy.svg" width="70%" alt="The parts of a note" />
</p>

## Core Dependencies

Before setting up the project, ensure you have the following installed:

1. **Node.js** — `v20+` &nbsp; [Download Node.js](https://nodejs.org/)
2. **NPM** — `v10+` &nbsp; [Learn about NPM](https://www.npmjs.com/)
3. **Blockly** — `v13.2.1` (peer dependency) &nbsp; [Blockly docs](https://developers.google.com/blockly)

> [!IMPORTANT]
> **Import the plugin before `Blockly.inject`.**
>
> `Blockly.Css.register` only affects injections that happen after it runs, so a
> note imported later renders unstyled. Notes are saved under their own
> versioned `workspaceNotes` key alongside `blocks`; older files written under
> `workspaceComments` still load.

## Repository Structure

```plaintext
|
├── 📁 .github                    # CI and publish workflows
├── 📁 docs                       # README media
├── 📁 src                        # Plugin source, TypeScript
├── 📁 test                       # Mocha suites and the playground
├── 📄 .gitignore
├── 📄 .prettierrc.json           # Format config
├── 📄 eslint.config.mjs          # Lint config
├── 📄 tsconfig.json              # TypeScript config
├── 📄 DESIGN.md                  # Design decisions and rationale
├── 📄 LICENSE
├── 📄 package.json
└── 📄 README.md                  # Project overview
|
```

## Getting Started

### Use it in an application

```bash
npm install @mit-app-inventor/blockly-workspace-notes
```

```js
import * as Blockly from 'blockly';
import {WorkspaceNotes} from '@mit-app-inventor/blockly-workspace-notes';

const workspace = Blockly.inject('blocklyDiv', {toolbox});
new WorkspaceNotes(workspace).init();
```

Right-click the workspace to add a note; right-click a note to rename, recolour, pin or restack it.

### Work on it locally

```bash
git clone https://github.com/mit-cml/blockly-plugins.git
cd blockly-plugins/blockly-workspace-notes
npm install
npm start
```

`npm start` opens the playground. Other scripts:

```bash
npm test               # typecheck, then the mocha suites
npm run build          # bundle and .d.ts into dist/
npm run lint           # ESLint
npm run format         # Prettier
```

<p align="center">Built with :heart: for <b>Blockly</b></p>
