# Getting started

## Install

```bash
npm install @mit-app-inventor/blockly-workspace-notes
```

You need Blockly 13.2.1 or newer. It is a peer dependency, so it stays on your
side of the install.

## Switch it on

```js
import * as Blockly from 'blockly';
import {WorkspaceNotes} from '@mit-app-inventor/blockly-workspace-notes';

const workspace = Blockly.inject('blocklyDiv', {toolbox});
new WorkspaceNotes(workspace).init();
```

That is the whole setup. Right-click the workspace and you will see **Add
Note**.

> **Import the plugin before `Blockly.inject`.**
> Blockly's stylesheets only reach workspaces injected _after_ they are
> registered, so a note imported later comes out unstyled.

## Options

Pass an object as the second argument. Every option has a sensible default, so
pass only what you want to change.

```js
new WorkspaceNotes(workspace, {
  defaultSize: {width: 300, height: 200},
  getAuthor: () => currentUser.name,
}).init();
```

| Option                       | Default              | What it does                                    |
| ---------------------------- | -------------------- | ----------------------------------------------- |
| `palette`                    | 7 stationery colours | The swatches offered in the Colour menu         |
| `defaultSize`                | `260 × 180`          | The size a new note is created at               |
| `getAuthor`                  | `() => ''`           | Names the note's author, shown along its foot   |
| `contextMenu`                | `true`               | Adds the note items to the right-click menu     |
| `xmlSupport`                 | `true`               | Keeps notes intact through the older XML format |
| `skipSerializerRegistration` | `false`              | Leaves saving and loading entirely to your app  |
| `emitLegacyComments`         | `false`              | Also writes the old `workspaceComments` key     |

### A custom palette

Each entry needs a name, a hue and the resolved fill colour:

```js
new WorkspaceNotes(workspace, {
  palette: [
    {name: 'Yellow', hue: 48, fill: '#f9edbb'},
    {name: 'Sky', hue: 200, fill: '#bbe5f9'},
  ],
}).init();
```

## Turning it off

`dispose()` puts Blockly back exactly as it found it — the menu items, the
clipboard, the save format and the default comment size all return to normal.

```js
const notes = new WorkspaceNotes(workspace);
notes.init();

// later
notes.dispose();
```

Both calls are safe to repeat; a second `init()` or `dispose()` does nothing.
