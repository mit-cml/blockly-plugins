# Design

A Blockly workspace is full of blocks, and blocks only say what the program
does. They cannot say why. Notes are somewhere to put the human part: a
reminder, a question for a teammate, a warning about a tricky bit.

The requirement everything else follows from: **a note must survive a save and
reload.** A note that disappears when you close the tab is worse than useless,
because people will trust it and then lose work.

## What is new, and what comes for free

Blockly already has workspace comments — a plain box you can type into. They
already handle a great deal:

| Already in Blockly                           | New here                |
| -------------------------------------------- | ----------------------- |
| A box you can type into                      | A title                 |
| Drag to move, drag a corner to resize        | A colour per note       |
| Collapse, delete, copy and paste             | Pinning — lock in place |
| Keyboard navigation and screen-reader labels | Stacking order          |
| Undo and redo                                | Author and dates        |
|                                              | A versioned save format |

Everything in the left column keeps working exactly as people already expect.

## The decisions worth explaining

### Why extend Blockly's comment rather than build a new object

Dragging, resizing, keyboard access, screen readers, copy and paste, and undo
all already work. Rebuilding them would mean re-creating bugs that are already
fixed.

The cost is that the design is tied to how Blockly's comments behave. If
Blockly changes them, this has to follow.

### Why a note has no buttons

Every early round put icons in the title row — collapse, delete, pin — and
every round the note read as a _block_, because a strip of icons across the top
of a rectangle is exactly what a block looks like. Moving all of it into the
right-click menu leaves nothing on the paper but the words on it.

The cost is that collapsing is one click further away and slightly less
discoverable.

### Why the title is edited in place

An earlier version asked for the title in a dialog. That was wrong twice over:
Blockly never asks for text in a dialog, and the fallback is the browser's own
serif prompt box, which matches nothing else on the page.

Using Blockly's field editor was only half the fix, because a field editor is
built to be _seen_ — a white box with the text selected — and on a note that
still read as a mode opening on the paper. The editor is now invisible: same
position, same font, same placeholder, no box, no selection. The title should
behave exactly like the body, and the body has never needed anything to open.

The cost is that a click on the title does two things depending on whether it
moved. Blockly's own gesture code draws that line at the drag radius, and this
follows it, so dragging a note by its title still works.

### Why "pinned" means locked, not fixed to the screen

Pinned could mean locked to the canvas, or fixed to the screen like a
heads-up display. Locked won: a note that floats over your blocks wherever you
pan is more annoying than helpful, and the screen-fixed version fights the way
a workspace scrolls and zooms.

### Why colours are pale

Notes sit among coloured blocks. A saturated note would compete with them and
make the workspace harder to read.

Colour alone was not enough, though. Several rounds of tuning hue, icon colour
and text colour all failed, because what reads as a block is the _shape_. Once
the shape was fixed — rounded card, no header strip, no boxed text — the
palette could be pulled paler still. The two work together: a note is S 0.25 at
V 0.98, against a block's S 0.45 at V 0.65.

### Why notes get their own place in the save file

Notes are saved under their own key rather than pretending to be plain
comments. That keeps the extra fields clean and versioned, and means a note is
never saved twice by accident.

The cost is that a file with notes in it is not a plain Blockly file — though a
plain Blockly editor ignores them rather than breaking.

## How the code is laid out

Each folder is one layer, and a file is named for the single thing it holds.
Reading top to bottom is roughly the dependency order.

```
src/
├── index.ts          The whole public surface. Re-exports only, no logic.
├── plugin.ts         WorkspaceNotes: what a host constructs.
├── model/            What a note is.
├── serialization/    JSON in and out, plus xml/ for the older format.
├── events/           The undo event a note fires.
├── clipboard/        Pasting a note with its title and colour intact.
├── ui/               Chrome the user touches: menu, title editor, CSS.
├── utils/            Pure helpers. No registration, no module state.
├── constants/        Numbers and names, grouped by what they configure.
└── types/            The shapes that travel between the layers.
```

Four rules keep it that way:

- **`index.ts` holds no logic.** Anything it does not re-export is internal and
  free to move. It is also the build entry point, resolved by path, so it stays
  where it is.
- **No barrel files inside the folders.** Every import names the file it wants
  (`../constants/layout`, never `../constants`). Longer to type, and the reason
  the import graph stays legible as the code grows.
- **`utils/` is inert.** Pure functions, no Blockly registration, no
  module-level state — importable from a test with nothing set up.
- **Registration lives in `registry.ts`.** Anything that mutates a global
  Blockly registry does it in a file named `registry.ts` (or `xml/patch.ts`),
  so the side effects are findable in one sweep and every one has a matching
  `unregister`.

One import cycle exists on purpose: `model/note.ts` and `model/stacking.ts`
need each other, since a note restacks its neighbours when its z-index changes
and restacking needs the class to recognise a note. Both uses sit inside
function bodies, so neither runs while the modules are still evaluating.
