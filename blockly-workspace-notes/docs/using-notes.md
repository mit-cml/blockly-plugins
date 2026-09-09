# Using notes

A note is a sheet of paper on the workspace. It has a title you can read at a
glance, a colour, and room to write.

<p align="center">
  <img src="./images/note-anatomy.svg" width="100%" alt="The parts of a note: title bar, collapse and delete buttons, title, body and resize handle" />
</p>

The title bar carries two buttons — collapse on the left, delete on the right —
and a pin marker appears between them when a note is pinned. Everything else a
note can do is in the right-click menu.

## Add one

Right-click empty canvas and choose **Add Note**. It appears where you clicked,
ready to type in.

## Write in it

Click the body and type. An empty note shows a faded prompt so it never looks
broken.

## Name it

Click the title and type. Nothing opens and nothing moves — the heading just
gains a caret, the same way the body does.

- **Enter** commits.
- **Escape** puts the old title back.
- Clicking elsewhere commits.

Dragging a note by its title still moves it. The editor only opens if the press
stayed put.

## Colour it

Right-click and pick from a row of seven colours. The current one is ringed.

The swatches sit in a single row rather than seven separate menu entries, so
picking a colour is one click and the menu stays short.

## Pin it

Right-click → **Pin note**. A pinned note cannot be dragged and sits in front
of its neighbours. It says so twice: a pin in the title bar, and a heavier edge
around the card.

The pin is a marker, not a button — there is nothing to click, and it is only
there while the note is pinned. Right-click → **Unpin note** to release it.

## Collapse it

Press the chevron at the left of the title bar to fold a note down to that bar,
or right-click → **Collapse note**. The title stays readable, and the chevron
turns to point right. Press it again to open the note back up.

This is how you keep a long note around without it covering your blocks.

## Order them

Right-click → **Bring to front** or **Send to back**, for when notes overlap.
The order is remembered when you save.

## Move, resize, copy, delete

These are Blockly's own, and they behave exactly as they do for anything else
on the workspace.

- Drag the title row to move it.
- Drag the bottom-right corner to resize. The title shortens with an ellipsis
  as you go, and the note stops at a size where it can still be read and
  grabbed.
- **Duplicate note**, or copy and paste. The copy keeps the title, colour and
  pinned state, and lands slightly offset.
- **Delete note** from the menu, the bin at the right of the title bar, or
  Delete while the note is selected.

One press of undo brings a deleted note back complete — same text, same title,
same colour, same pinned state. Every other change is undoable too: typing,
resizing, recolouring, renaming, pinning, reordering.

## The states you will see

<p align="center">
  <img src="./images/note-states.svg" width="100%" alt="A named note, one not named yet, a collapsed note, a pinned note showing its marker, and a selected note" />
</p>

| State             | How you can tell                                      |
| ----------------- | ----------------------------------------------------- |
| **Named**         | The title is bold, in the note's own ink              |
| **Not named yet** | A faded `Title`, and a faded prompt in the body       |
| **Collapsed**     | Just the title bar, and the chevron points right      |
| **Pinned**        | A pin in the title bar, and a heavier edge            |
| **Selected**      | Blockly's own gold ring, following the card's corners |

## Keyboard and screen readers

Notes are workspace comments underneath, so Blockly's keyboard navigation and
screen-reader support apply to them unchanged. Nothing extra to configure.
