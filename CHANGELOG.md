# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

First release.

### Added

- Import a CSV of copy and keep it on the device between sessions.
- Tolerant CSV import: any column order, any header case, extra columns ignored, and comma, semicolon or tab delimiters detected automatically. Only `key` and at least one of `heading`, `body` or `ctas` are required.
- Rows with problems are skipped and listed after import. Duplicate keys and duplicate columns produce warnings.
- "Try sample data" button, and a confirmation step before replacing an existing library.
- Search across key, category, subcategory, heading, body, CTAs and source file.
- Collapsible **Filters** panel with a category dropdown, a content type control (Heading, Body, CTA) and an active-filter badge.
- Entries grouped by source file, each card showing its key and category.
- Apply any heading, body or CTA to the selected text layers, with a preview of how many layers will change.
- Safe writes: fonts are loaded first, the selection is re-checked right before changing text, and hidden, locked and component layers are skipped.
- Toast on the canvas confirming each apply, or reporting an error.
- Copy button on every heading, body and CTA row.
- Skeleton loading state while the saved library restores.
- Resizable window with a corner drag handle. The size is remembered.
- Styled to match Figma's interface, including dark mode.
- No network access. Content never leaves the device.
