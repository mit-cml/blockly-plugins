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

| Already in Blockly                           | New here                 |
| -------------------------------------------- | ------------------------ |
| A box you can type into                      | A title                  |
| Drag to move, drag a corner to resize        | A colour per note        |
| Collapse, delete, copy and paste             | Pinning — hold in place  |
| Keyboard navigation and screen-reader labels | Locking — make read-only |
| Undo and redo                                | Stacking order           |
|                                              | Author and dates         |
|                                              | A versioned save format  |

Everything in the left column keeps working exactly as people already expect.

## The decisions worth explaining

### Why extend Blockly's comment rather than build a new object

Dragging, resizing, keyboard access, screen readers, copy and paste, and undo
all already work. Rebuilding them would mean re-creating bugs that are already
fixed.

The cost is that the design is tied to how Blockly's comments behave. If
Blockly changes them, this has to follow.

### Why the note looks like a Blockly comment

A note is a Blockly workspace comment, so it looks like one: square, thin
bordered, with a title bar in its own colour and its controls in that bar.

An earlier design went the other way — a rounded card with no bar and no
buttons, everything in the right-click menu — on the theory that a rectangle
with a strip of icons across the top is what a block looks like. It read well,
but it made a note something you had to learn. Following the pattern people
already know is worth more than avoiding a family resemblance, and the colour
does the work of telling a note from a block.

Collapse and delete are Blockly's own buttons, not copies. They are hidden by
default and this simply shows them, which is why they arrive with keyboard
navigation, focus handling, ARIA labels and the collapse button's automatic
relabelling between "Collapse Comment" and "Expand Comment" already working. All
that is replaced is the artwork, redrawn in the note's own ink.

The pin beside them is a marker rather than a control: it does nothing when
clicked, and it is there only while a note is pinned, answering the one question
the note could not otherwise answer — why will this one not move?

### Why the title is edited in place

An earlier version asked for the title in a dialog. That was wrong twice over:
Blockly never asks for text in a dialog, and the fallback is the browser's own
serif prompt box, which matches nothing else on the page.

Using Blockly's field editor was only half the fix, because a field editor is
built to be _seen_ — a white box with the text selected — and on a note that
still read as a mode opening on the note. The editor is now invisible: same
position, same font, same placeholder, no box, no selection. The title should
behave exactly like the body, and the body has never needed anything to open.

The cost is that a click on the title does two things depending on whether it
moved. Blockly's own gesture code draws that line at the drag radius, and this
follows it, so dragging a note by its title still works.

### Why "pinned" means held to the canvas, not fixed to the screen

Pinned could mean held to the canvas, or fixed to the screen like a heads-up
display. Held won: a note that floats over your blocks wherever you pan is more
annoying than helpful, and the screen-fixed version fights the way a workspace
scrolls and zooms.

### Why locking is not pinning

They sound alike and they are not. Pinning is about _where a note is_ — it stops
being dragged and comes to the front. Locking is about _what a note says_ — it
stops being edited and cannot be deleted.

Underneath, Blockly gives a comment three independent flags, and each of the two
features owns a disjoint set: locking drives `editable` and `deletable`, pinning
drives `movable`, and neither ever writes the other's. That is not tidiness for
its own sake. If both wrote `movable`, unpinning a locked note would quietly
hand its movement back, and which behaviour you got would depend on the order
you happened to do things in. Keeping them disjoint is what makes all four
combinations mean exactly what they look like.

The cost accepted in exchange: unlocking sets both of its flags to `true`
outright, so locking owns them. A host wanting its own read-only notion should
not also drive those two.

The title bar has one marker slot, and a lock takes it from a pin. A note that
cannot be edited is the more urgent of the two facts to convey, and the pin
comes back the moment it is unlocked. The alternative — showing both — costs the
title a fifth of its width on the notes most likely to have something to say.

### Why the host decides who can unlock

Locking exists because someone wants a note to survive being read by someone
else: a teacher's instructions on a student's workspace. That only works if the
student cannot simply unlock it, and the plugin has no idea who is looking. So
the host supplies a predicate and the plugin asks it.

It is held per workspace rather than captured once, because every other
registration here is first-registration-wins — harmless for a palette, wrong
for a permission, since a host running two workspaces would otherwise let
whichever loaded first decide for both.

And it gates the menu, not the model. `setLocked` has to keep working from code
or undo, paste and loading a file would all break. Locking states intent and
stops accidents; it is not a security boundary, and anything that depends on it
should be checked where the file is saved.

### Why every colour comes from one

A note stores a single colour. Everything else is derived from it: the title bar
and border a step darker, and the ink — the title, the body text and all three
glyphs — the same hue taken dark and saturated.

Nothing is hardcoded black, and that is the point. Black furniture on a coloured
card looks like a coloured card with black furniture on it; a green note whose
text and icons are deep green reads as one object. It also means a host can
supply any palette it likes and the whole note follows.

The one thing derivation cannot guarantee is readability, so that is tested
rather than trusted: across the palette the worst contrast is 5.79:1 for ink on
the bar and 7.67:1 on the body, both clear of the 4.5:1 that body text needs,
and `test/colour.mocha.js` asserts it.

The fills themselves stay pale because notes sit among coloured blocks, and a
saturated note would compete with them: S 0.25 at V 0.98, against a block's
S 0.45 at V 0.65.

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
