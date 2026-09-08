# Using notes

A note is a sheet of paper on the workspace. It has a title you can read at a
glance, a colour, and room to write.

<p align="center">
  <img src="./images/note-anatomy.svg" width="100%" alt="The parts of a note: title, rule, card, body and resize handle" />
</p>

Everything a note can do is in the right-click menu. Nothing sits on the paper
except the words on it.

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

Right-click → **Pin note**. A pinned note cannot be dragged, sits in front of
its neighbours, and draws a heavier edge so you can see why it will not move.

Right-click → **Unpin note** to release it.

## Collapse it

Right-click → **Collapse note** to fold it down to its title row. The title
stays readable. This is how you keep a long note around without it covering
your blocks.

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
- **Delete note**, or press Delete while it is selected.

One press of undo brings a deleted note back complete — same text, same title,
same colour, same pinned state. Every other change is undoable too: typing,
resizing, recolouring, renaming, pinning, reordering.

## The states you will see

<p align="center">
  <img src="./images/note-states.svg" width="100%" alt="A named note, one not named yet, a collapsed note, a pinned note and a selected note" />
</p>

| State             | How you can tell                                      |
| ----------------- | ----------------------------------------------------- |
| **Named**         | The title is bold and black on the paper              |
| **Not named yet** | A greyed `Title`, and a greyed prompt in the body     |
| **Collapsed**     | Just the title row. The rule disappears with the body |
| **Pinned**        | A heavier edge around the card                        |
| **Selected**      | Blockly's own gold ring, following the card's corners |

## Keyboard and screen readers

Notes are workspace comments underneath, so Blockly's keyboard navigation and
screen-reader support apply to them unchanged. Nothing extra to configure.
