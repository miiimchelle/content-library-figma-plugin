# Content library

A Figma plugin that turns a CSV of your team's copy into a searchable library inside Figma. Browse your copy by type (headings, body text, CTAs, labels or whatever columns your CSV has), then apply your choice to the text layers you've selected.

## Features

- Import a CSV content library. It is remembered on your device between sessions.
- Search across the key, category, subcategory, source file and every column of copy.
- Filter by category and by content type from a collapsible **Filters** panel. The content types are built from your CSV's columns, so any column of copy (heading, body, label, tooltip, error message…) becomes a filter. A badge shows how many filters are active.
- Entries are grouped by source file, with each piece of copy as its own selectable card.
- **Multi-field mode**: Fill multiple layers from a single entry. Enable the checkbox to apply all of an entry's fields at once. The plugin matches layers by name (e.g., "heading", "label", "cta", named after the column) or by selection order.
- Preview before applying: the plugin shows how many text layers will change.
- A toast on the canvas confirms each apply (or reports an error).
- Copy any piece of copy to the clipboard with the copy button on its row, without applying it.
- The window is resizable from the corner handle and remembers its size.
- Safe writes: fonts are loaded first, and the selection is re-checked right before text is changed.
- No network access. Your content never leaves your device.

## CSV format

Only a `key` column is required. **Every other column becomes a type of copy**, named after its header, so the plugin adapts to however your team curates the file. A column called `label`, `tooltip` or `error_message` works exactly like `heading` or `body`: it shows up on each card, in search, and as a button in the content type filter.

| Header | Description |
| --- | --- |
| `key` | Unique identifier for the entry (required) |
| `category` | Top-level group, used for the category filter |
| `subcategory` | Secondary label, shown on the card and searchable |
| `source_file` | Used to group entries in the list |
| `ctas` | Special: several CTAs in one cell, separated by `\|` (shown as CTA 1, CTA 2…) |
| anything else | A type of copy, for example `heading`, `body`, `label`, `metadata` |
| `_notes`, `#owner` | Columns starting with `_` or `#` are not imported. Use them for notes. |

The content type filter lists only types that have copy in at least one row, in the order of your columns. If the file has just one type, the filter is hidden.
The importer is forgiving:

- Column order and header case don't matter (`Source File` and `Error Message` work; spaces and dashes become underscores).
- Commas, semicolons and tabs are detected automatically, so Excel exports in any locale work. Use **Save As → CSV UTF-8**.
- Rows with a problem (no key, no copy, too many cells) are skipped and listed after import. The rest still import.
- Duplicate keys import but produce a warning.
- Importing over an existing library asks you to confirm first.

Fields containing the delimiter or line breaks must be wrapped in double quotes. A ready-made example is in [sample-content.csv](sample-content.csv), and the plugin has a **Try sample data** button.

```csv
category,subcategory,key,heading,body,ctas,source_file
onboarding,welcome,welcome_01,Welcome aboard,"Let's get you set up in just a few quick steps.",Get started|Skip for now,onboarding_flow
```

## Usage

### Single-field mode (default)

1. Select one or more text layers in Figma.
2. Open the plugin and import your CSV (or use **Import CSV** to replace the library).
3. Search or filter, then click a card.
4. Click **Apply to N text layers**.

The selected text will be applied to all selected layers.

### Multi-field mode

1. Select multiple text layers (e.g., a card's heading, body, and button).
2. Enable **Fill multiple layers from one entry** checkbox.
3. Click **All fields** on an entry card.
4. Click **Apply N fields to N layers**.

The plugin fills each layer based on:
- **Layer name matching**: A layer named after a field gets that field, for example "heading", "label" or "body". Layers named "cta" or "button" get the CTAs.
- **Selection order**: If names don't match, the first selected layer gets the first field, second gets second field, etc.

What gets changed:

- Only layers you select directly are modified. Children of a selected frame are not.
- Hidden layers, locked layers and layers inside components or component sets are skipped.
- If the selection or text changes after the preview, you are asked to preview again.
- Missing fonts block the apply, and nothing is changed.

## Development

Requires Node.js and Figma desktop.

```sh
npm install
npm run build      # compile code.ts and csv.ts, then assemble ui.html
npm test           # compile and run the CSV parser tests
npm run typecheck  # type-check without emitting
npm run watch      # recompile TypeScript on change (re-run build for ui.html)
```

To load the plugin in Figma, go to **Plugins → Development → Import plugin from manifest…** and choose [manifest.json](manifest.json).

### Project structure

| File | Purpose |
| --- | --- |
| [code.ts](code.ts) | Plugin main thread: selection handling, previews, font loading, applying text, storage |
| [csv.ts](csv.ts) | CSV parser (pure, no DOM or Figma APIs) |
| [csv.test.js](csv.test.js) | Parser tests, run with Node's built-in test runner |
| [ui.src.html](ui.src.html) | Plugin UI source: search, filters, import flow |
| [build.mjs](build.mjs) | Inlines the compiled parser and sample CSV into `ui.src.html` to produce `ui.html` |
| [manifest.json](manifest.json) | Figma plugin manifest |
| [sample-content.csv](sample-content.csv) | Example library for testing |

`code.js`, `csv.js` and `ui.html` are generated by `npm run build` and are not committed. Edit `ui.src.html`, not `ui.html`.

## Privacy

The plugin makes no network requests (`networkAccess` is set to `none`). The imported CSV is stored locally with Figma's `clientStorage`.

## License

[MIT](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release notes.
