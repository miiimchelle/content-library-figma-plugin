# Figma Community listing

Copy for the Figma Community publish form. Paste each section into the matching field. Nothing in this file ships with the plugin.

## Name

Content library

## Tagline

Search your team's copy from a CSV and apply it to text layers in one click.

## Description

Stop copy-pasting from spreadsheets. Content library turns a CSV of your team's copy into a searchable library inside Figma. Find the right heading, body text or button label, and apply it to the text layers you have selected.

**What you can do**

- Import a CSV and browse it as cards, grouped by source file.
- Search across copy, keys, categories and sources, or narrow the list by category and content type (Heading, Body, CTA).
- Click any heading, body or CTA to apply it to every selected text layer, after a preview that tells you how many layers will change.
- Copy any piece of text to the clipboard without applying it.
- Keep your library between sessions. It is saved on your device, so you only import once.

**Built to be safe**

- Fonts are loaded before anything changes, and a missing font stops the apply instead of leaving half-changed text.
- The selection is checked again right before text is written, so nothing changes if you moved on.
- Hidden layers, locked layers and layers inside components are skipped.
- Every apply is a normal Figma edit, so Cmd/Ctrl+Z undoes it.

**Your content stays yours**

The plugin makes no network requests and has no account or sign-in. Your CSV is stored only on your device, using Figma's local plugin storage.

**Getting started**

1. Select one or more text layers.
2. Open the plugin and choose a CSV, or tap "Try sample data" to look around first.
3. Search or filter, then click the copy you want.
4. Choose "Apply to N text layers".

**Your CSV**

You need a `key` column and at least one of `heading`, `body` or `ctas`. Add `category`, `subcategory` and `source_file` to organise the list. Several CTAs in one cell are separated with `|`. Column order and capitalisation don't matter, extra columns are ignored, and comma, semicolon and tab files all work, so exports from Excel and Google Sheets are fine. Rows with a problem are skipped and listed after import, and the rest still load.

**Good to know**

- Only text layers you select directly are changed. Selecting a frame does not change the text inside it.
- The library is saved per person on each device. If your team shares copy, share the CSV file.

## Category

Productivity (or Design tools, if that is the closest match in the publish form)

## Tags

content design, copywriting, ux writing, text, csv, content library, localization, design system

## Support contact

https://github.com/miiimchelle/content-library-figma-plugin/issues

## Release notes (version 1.0.0)

First release. Import a CSV, search and filter your copy, and apply it to selected text layers with a preview, safe font handling and a confirmation toast. Includes copy-to-clipboard on every entry, a resizable window and dark mode support.

## Still needed before publishing

These need a person, not text:

- Plugin icon, 128 x 128 px.
- Cover image, 1920 x 1080 px.
- Two or three screenshots or a short GIF: import, search and filter, apply.
- Publish from Figma (Plugins > Manage plugins > Publish) so Figma assigns the real plugin ID, then keep the updated `manifest.json`.
