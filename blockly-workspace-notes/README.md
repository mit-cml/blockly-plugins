# Workspace Notes

[![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

Sticky notes for a Blockly workspace: draggable, resizable, colour-coded paper
with a title, an author and a stacking order.

<p align="center">
  <img src="./docs/images/note-anatomy.svg" width="70%" alt="The parts of a note" />
</p>

Notes extend Blockly's own workspace comments, so dragging, resizing,
selection, keyboard navigation and undo all work exactly as they already do.
They are saved alongside your blocks, and round-trip through both JSON and XML.

## Install

```bash
npm install @mit-app-inventor/blockly-workspace-notes
```

Needs Blockly 13.2.1 or newer as a peer dependency, and Node 20+ to build.

## Use

```js
import * as Blockly from 'blockly';
import {WorkspaceNotes} from '@mit-app-inventor/blockly-workspace-notes';

const workspace = Blockly.inject('blocklyDiv', {toolbox});
new WorkspaceNotes(workspace).init();
```

> [!IMPORTANT]
> Import the plugin **before** calling `Blockly.inject`. `Blockly.Css.register`
> only affects injections that happen after it runs, so a note imported later
> renders unstyled.

That is the whole setup. Right-click the workspace to add a note; click a
note's title to rename it; right-click a note to recolour, pin, collapse or
restack it. Everything else — moving, resizing, copying, deleting, undo — is
Blockly's own behaviour.

## Options

Pass an options object as the second argument.

| Option                       | Default              | What it does                                             |
| ---------------------------- | -------------------- | -------------------------------------------------------- |
| `palette`                    | 7 stationery colours | The swatches offered in the Colour menu                  |
| `defaultSize`                | `260 × 180`          | Size a new note is created at                            |
| `getAuthor`                  | `() => ''`           | Called once per note to record who made it               |
| `contextMenu`                | `true`               | Register the note menu items                             |
| `xmlSupport`                 | `true`               | Wrap `Blockly.Xml` so notes survive the older XML format |
| `skipSerializerRegistration` | `false`              | Leave persistence entirely to your app                   |
| `emitLegacyComments`         | `false`              | Also write the old `workspaceComments` key               |

```js
new WorkspaceNotes(workspace, {
  defaultSize: {width: 300, height: 200},
  getAuthor: () => currentUser.name,
}).init();
```

## API

| Member               | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `init()`             | Starts the plugin. Idempotent.                      |
| `dispose()`          | Stops it and restores everything Blockly had before |
| `createNote(state?)` | Adds a note, in front, as one undo step             |
| `getNotes()`         | Every note on the workspace                         |

The note classes, serializers and helpers are exported too, for an app that
drives saving and loading itself.

## Saved format

Notes are saved under their own versioned `workspaceNotes` key, beside
`blocks`. Older files written under `workspaceComments` still load, as notes.

```json
{
  "workspaceNotes": {
    "version": 1,
    "notes": [
      {
        "id": "n1qX",
        "x": 40,
        "y": 20,
        "width": 240,
        "height": 140,
        "text": "Refactor this loop",
        "title": "TODO",
        "colour": "#ffd6a5"
      }
    ]
  }
}
```

Only what differs from the default is written, so a plain yellow note with no
title records neither.

## Develop

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

[DESIGN.md](./DESIGN.md) covers why a note works the way it does, and how the
source is laid out.

## License

Apache-2.0
