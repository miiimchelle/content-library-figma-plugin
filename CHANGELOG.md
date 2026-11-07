# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

First release.

### Added

- Import a CSV of copy and keep it on the device between sessions.
- Tolerant CSV import: any column order, any header case, and comma, semicolon or tab delimiters detected automatically. Only a `key` column is required.
- Flexible content types: every column other than `key`, `category`, `subcategory` and `source_file` becomes a type of copy (heading, body, label, metadata, or anything else), so the filter, cards and search follow the CSV. `ctas` still splits several CTAs on `|`. Columns starting with `_` or `#` are not imported.
- Rows with problems are skipped and listed after import. Duplicate keys and duplicate columns produce warnings.
- "Try sample data" button, and a confirmation step before replacing an existing library.
- Search across key, category, subcategory, source file and all copy columns.
- Collapsible **Filters** panel with a category dropdown, a content type control built from the CSV's columns and an active-filter badge.
- Entries grouped by source file, each card showing its key and category.
- Apply any piece of copy to the selected text layers, with a preview of how many layers will change.
- Safe writes: fonts are loaded first, the selection is re-checked right before changing text, and hidden, locked and component layers are skipped.
- Toast on the canvas confirming each apply, or reporting an error.
- Copy button on every row of copy.
- Skeleton loading state while the saved library restores.
- Resizable window with a corner drag handle. The size is remembered.
- Styled to match Figma's interface, including dark mode.
- No network access. Content never leaves the device.
