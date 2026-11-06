// Pure CSV parsing for the content library. No DOM or Figma APIs, so it can be tested
// under Node and inlined into ui.html by build.mjs.

interface LibraryEntry {
  id: number;
  category: string;
  subcategory: string;
  key: string;
  heading: string;
  body: string;
  ctas: string;
  ctaList: string[];
  source_file: string;
}
interface SkippedRow { row: number; reason: string }
interface ParseResult {
  entries: LibraryEntry[];
  skipped: SkippedRow[];
  warnings: string[];
  ignoredColumns: string[];
  delimiter: string;
}

const KNOWN_COLUMNS = ['category', 'subcategory', 'key', 'heading', 'body', 'ctas', 'source_file'];
const COPY_COLUMNS = ['heading', 'body', 'ctas'];
const ALIASES: { [name: string]: string } = { cta: 'ctas', source: 'source_file' };
const DELIMITERS = [',', ';', '\t'];

function normalizeHeader(value: string): string {
  const name = value.replace(/^﻿/, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ALIASES[name] || name;
}

// Picks the delimiter that appears most in the header record (outside quotes). Defaults to comma.
function detectDelimiter(input: string): string {
  const counts: { [d: string]: number } = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && ch in counts) counts[ch]++;
  }
  let best = ',';
  for (const d of DELIMITERS) if (counts[d] > counts[best]) best = d;
  return best;
}

// Lenient tokenizer: stray quotes inside an unquoted cell (5" tall) are kept literally.
// Only an unclosed quoted field is fatal, because it swallows the rest of the file.
function tokenize(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  let quoteRow = 0;
  const finishCell = () => { row.push(cell); cell = ''; closed = false; };
  const finishRow = () => { finishCell(); rows.push(row); row = []; };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; }
      } else cell += ch;
    } else if (ch === delimiter) finishCell();
    else if (ch === '\r' || ch === '\n') { finishRow(); if (ch === '\r' && input[i + 1] === '\n') i++; }
    else if (ch === '"' && !closed && cell.trim() === '') { quoted = true; cell = ''; quoteRow = rows.length + 1; }
    else cell += ch;
  }
  if (quoted) throw new Error('A quoted field starting at row ' + quoteRow + ' is never closed.');
  if (cell || row.length || closed) finishRow();
  return rows;
}

function parseCSV(raw: string): ParseResult {
  if (typeof raw !== 'string') throw new Error('CSV must be text.');
  const input = raw.replace(/^﻿/, '');
  if (!input.trim()) throw new Error('The file is empty.');
  const delimiter = detectDelimiter(input);
  const rows = tokenize(input, delimiter);
  const header = rows.shift() || [];

  const warnings: string[] = [];
  const ignoredColumns: string[] = [];
  const index: { [name: string]: number } = {};
  const duplicated: string[] = [];
  header.forEach((value, i) => {
    const name = normalizeHeader(value);
    if (!name) return;
    if (KNOWN_COLUMNS.indexOf(name) === -1) { ignoredColumns.push(value.trim()); return; }
    if (name in index) { if (duplicated.indexOf(name) === -1) duplicated.push(name); return; }
    index[name] = i;
  });
  if (!('key' in index)) throw new Error('Missing a "key" column. Found: ' + (header.map(h => h.trim()).filter(Boolean).join(', ') || 'no headers') + '.');
  if (!COPY_COLUMNS.some(name => name in index)) throw new Error('Missing copy columns. Add at least one of: heading, body, ctas.');
  if (duplicated.length) warnings.push('Duplicate columns ignored (first one used): ' + duplicated.join(', ') + '.');

  const cell = (cells: string[], name: string) => (name in index && cells[index[name]] !== undefined ? cells[index[name]].trim() : '');
  const entries: LibraryEntry[] = [];
  const skipped: SkippedRow[] = [];
  const seen: { [key: string]: boolean } = {};
  const duplicateKeys: string[] = [];
  rows.forEach((cells, i) => {
    const row = i + 2;
    if (cells.every(value => !value.trim())) return;
    if (cells.length > header.length && cells.slice(header.length).some(value => value.trim())) {
      skipped.push({ row, reason: 'has ' + cells.length + ' cells but there are ' + header.length + ' columns (an unquoted comma?)' });
      return;
    }
    const key = cell(cells, 'key');
    if (!key) { skipped.push({ row, reason: 'missing key' }); return; }
    const ctas = cell(cells, 'ctas');
    const entry: LibraryEntry = {
      id: entries.length,
      category: cell(cells, 'category'),
      subcategory: cell(cells, 'subcategory'),
      key,
      heading: cell(cells, 'heading'),
      body: cell(cells, 'body'),
      ctas,
      ctaList: ctas.split('|').map(value => value.trim()).filter(Boolean),
      source_file: cell(cells, 'source_file')
    };
    if (!entry.heading && !entry.body && !entry.ctaList.length) { skipped.push({ row, reason: 'no heading, body or CTA' }); return; }
    if (seen[key] && duplicateKeys.indexOf(key) === -1) duplicateKeys.push(key);
    seen[key] = true;
    entries.push(entry);
  });
  if (duplicateKeys.length) {
    warnings.push('Duplicate keys: ' + duplicateKeys.slice(0, 5).join(', ') + (duplicateKeys.length > 5 ? ' and ' + (duplicateKeys.length - 5) + ' more' : '') + '.');
  }
  if (!entries.length) {
    throw new Error('No usable rows found.' + (skipped.length ? ' Row ' + skipped[0].row + ' ' + skipped[0].reason + '.' : ''));
  }
  return { entries, skipped, warnings, ignoredColumns, delimiter };
}

// Node (tests) and the build step's wrapper provide `exports`; the Figma main thread does not.
declare const exports: { parseCSV?: typeof parseCSV } | undefined;
if (typeof exports !== 'undefined') exports.parseCSV = parseCSV;
