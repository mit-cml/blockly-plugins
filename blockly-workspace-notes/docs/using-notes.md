# Using notes

A note is a card on the workspace: a title bar you can read at a glance, a
colour of its own, and room to write underneath.

<p align="center">
  <img src="./images/note-anatomy.svg" width="100%" alt="The parts of a note: title bar, collapse and delete buttons, title, body, author and date, and resize handle" />
</p>

The title bar carries two buttons — collapse on the left, delete on the right —
and one marker slot between them. A pin appears there on a pinned note, a
padlock on a locked one, and the padlock wins if a note is both. A locked note
also loses the bin from its bar. Along the foot, a small line records who wrote
the note and when it last changed. Everything else a note can do is in the
right-click menu.

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

## Lock it

Right-click → **Lock note** to make a note read-only. A locked note shows a
padlock in its title bar and loses the bin beside it.

Locked, you cannot edit the text, rename it, recolour it, resize it, delete it
or copy it. You can still move it, collapse it, restack it, select it and read
it. Right-click → **Unlock note** to release it.

Whether you may lock or unlock a note at all is up to the app — a teacher can
be allowed to lock an instruction note that a student cannot unlock. Where that
is the case, **Unlock note** is still in the menu but greyed out, so it is
clear the note is locked deliberately rather than broken.

## Collapse it

Press the chevron at the left of the title bar to fold a note down to that bar,
or right-click → **Collapse note**. The title stays readable, and the chevron
turns to point right. Press it again to open the note back up.

This is how you keep a long note around without it covering your blocks.

## Who wrote it, and when

Along the bottom of every note is a quiet line showing its author and the date
it last changed. Both are recorded automatically — the date every time you
edit, and the author from the `getAuthor` option your app supplies. Without
that option there is no name to show, so the line falls back to the date alone.

On a narrow note the name gives way first, since the date is short and the name
can be cut to nothing useful. A collapsed note hides the line with its body.

## Order them

Right-click → **Bring to front** or **Send to back**, for when notes overlap.
The order is remembered when you save.

## Move, resize, copy, delete

These are Blockly's own, and they behave exactly as they do for anything else
on the workspace.

- Drag the title row to move it.
- Drag the bottom-right corner to resize. The title shortens with an ellipsis
  as you go, and the note stops at a size where it can still be read and
  grabbed. A locked note has no resize handle.
- **Duplicate note**, or copy and paste. The copy keeps the title, colour and
  pinned state, and lands slightly offset. A locked note cannot be copied.
- **Delete note** from the menu, the bin at the right of the title bar, or
  Delete while the note is selected. None of the three works on a locked note.

One press of undo brings a deleted note back complete — same text, same title,
same colour, same pinned state. Every other change is undoable too: typing,
resizing, recolouring, renaming, pinning, locking, reordering.

## The states you will see

<p align="center">
  <img src="./images/note-states.svg" width="100%" alt="A named note, one not named yet, a collapsed note, a pinned note showing its marker, a selected note, and a locked note showing a padlock and no bin" />
</p>

| State             | How you can tell                                      |
| ----------------- | ----------------------------------------------------- |
| **Named**         | The title is bold, in the note's own ink              |
| **Not named yet** | A faded `Title`, and a faded prompt in the body       |
| **Collapsed**     | Just the title bar, and the chevron points right      |
| **Pinned**        | A pin in the title bar, and a heavier edge            |
| **Locked**        | A padlock in the title bar, and no bin beside it      |
| **Selected**      | Blockly's own gold ring, following the card's corners |

## Keyboard and screen readers

Notes are workspace comments underneath, so Blockly's keyboard navigation and
screen-reader support apply to them unchanged. Nothing extra to configure.
