# API

Most apps only need `WorkspaceNotes`. The rest is here for apps that drive
saving and loading themselves.

## WorkspaceNotes

```js
const notes = new WorkspaceNotes(workspace, options);
```

| Member               | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `init()`             | Starts the plugin. Safe to call twice.              |
| `dispose()`          | Stops it and restores everything Blockly had before |
| `createNote(state?)` | Adds a note, in front, as one undo step             |
| `getNotes()`         | Every note on the workspace                         |

```js
notes.createNote({title: 'TODO', text: 'Check the loop', colour: '#f9bbc5'});
notes.getNotes().filter((note) => note.isPinned());
```

## A note

`Note` is a note on a rendered workspace; `NoteComment` is the same thing
headless, which is what you get on a workspace with no renderer. Both carry the
same note-specific methods on top of Blockly's own comment API.

| Method                         | What it does                            |
| ------------------------------ | --------------------------------------- |
| `getTitle()` / `setTitle(s)`   | The heading                             |
| `getColour()` / `setColour(c)` | Any CSS colour; stored as hex           |
| `isPinned()` / `setPinned(b)`  | Locked in place and raised to the front |
| `getZIndex()` / `setZIndex(n)` | Stacking order; higher is nearer front  |
| `getMeta()`                    | `{author, createdAt, updatedAt}`        |
| `saveNoteState()`              | A plain copy of all of the above        |

Everything else — `getText`, `setText`, `moveTo`, `setSize`, `setCollapsed`,
`dispose` — is Blockly's, and documented there.

## Helpers

| Function                  | What it does                                      |
| ------------------------- | ------------------------------------------------- |
| `isNote(x)`               | Whether a workspace comment is one of ours        |
| `restackNotes(workspace)` | Reorders notes on screen to match their z-indices |
| `saveNote(note, opts?)`   | One note to JSON                                  |
| `appendNote(state, ws)`   | JSON back to a note on the workspace              |
| `migrate(payload)`        | Upgrades an older payload to the current version  |
| `noteToDom(note)`         | One note to a `<comment>` element                 |
| `domToNoteState(elem)`    | A `<comment>` element to JSON                     |
| `domToNote(elem, ws)`     | A `<comment>` element to a note on the workspace  |

```js
import {isNote, saveNote} from '@mit-app-inventor/blockly-workspace-notes';

const notes = workspace.getTopComments(false).filter(isNote);
const json = notes.map((note) => saveNote(note, {addCoordinates: true}));
```

## Types

`SavedNote`, `NotesPayload`, `NoteState`, `NoteMeta`, `PaletteEntry`,
`WorkspaceNotesOptions`, `NoteCopyData`, `NoteChangeJson`, `NoteProperty`,
`NotePropertyValue` and `NoteSurface` are all exported for TypeScript users.

## For extending the plugin

`NoteSerializer`, `LegacyCommentAdapter`, `NotePaster` and `NoteChange` are
exported so you can subclass or inspect them. `NOTE_SERIALIZER_NAME`,
`SCHEMA_VERSION`, `DEFAULT_COLOUR` and `DEFAULT_PALETTE` are the constants
worth reading.
