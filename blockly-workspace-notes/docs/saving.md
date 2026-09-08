# Saving and loading

Notes save with the workspace. There is nothing extra to call.

```js
const state = Blockly.serialization.workspaces.save(workspace);
Blockly.serialization.workspaces.load(state, workspace);
```

## What a saved note looks like

Notes get their own key in the file, beside `blocks`:

```json
{
  "blocks": {"languageVersion": 0, "blocks": []},
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
        "colour": "#f9bbc5",
        "pinned": true,
        "zIndex": 3,
        "meta": {
          "author": "ada",
          "createdAt": "2026-09-07T16:07:09Z",
          "updatedAt": "2026-09-07T16:09:41Z"
        }
      }
    ]
  }
}
```

Everything that gets remembered:

| Saved                 | Notes                                              |
| --------------------- | -------------------------------------------------- |
| Position              | Exact, including right-to-left layouts             |
| Width and height      | Exactly as you left them                           |
| The text              |                                                    |
| The title             | Only if it has one                                 |
| The colour            | Only if it is not the default                      |
| Pinned                | Only if pinned                                     |
| Stacking order        | So overlapping notes come back in the same order   |
| Collapsed             | Only if collapsed                                  |
| Author and timestamps | Author comes from `getAuthor`; dates are automatic |

## Three things about the format

**Only what differs is written.** A plain yellow note with no title records
neither. Files stay small, and a change to one note shows up as a small diff
rather than a wall of text.

**The payload carries a version.** If the format ever gains a field, files
saved today are quietly upgraded as they load.

**Old files still open.** A workspace saved before this plugin existed, with
plain Blockly comments in it, loads correctly — each comment becomes a note
with the default colour and no title.

## XML

Blockly's older XML format works too, as long as `xmlSupport` is on, which it
is by default.

```js
const dom = Blockly.Xml.workspaceToDom(workspace);
Blockly.Xml.domToWorkspace(dom, workspace);
```

A note is written as a `<comment>` element with a few extra attributes:

```xml
<comment id="n1qX" x="40" y="20" w="240" h="140"
         title="TODO" colour="#f9bbc5" pinned="true" z="3"
         author="ada" created="2026-09-07T16:07:09Z"
         updated="2026-09-07T16:09:41Z">Refactor this loop</comment>
```

Every added attribute is optional, so plain Blockly still reads the element as
an ordinary comment and ignores what it does not recognise.

JSON is the format to prefer. Blockly has frozen XML — it still works and is
not going away, but it gains no new features, and only JSON has a proper place
for a plugin's own data.

## Saving it yourself

If your app handles persistence its own way, pass
`skipSerializerRegistration: true` and use `saveNote` and `appendNote`
directly. See the [API](./api.md).
