const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseCSV } = require('./csv.js');

// Helpers: read an entry's copy by content type.
const values = (entry, type) => (entry.fields.find(f => f.type === type) || { values: [] }).values;
const first = (entry, type) => values(entry, type)[0];

const HEADER = 'category,subcategory,key,heading,body,ctas,source_file';

test('parses the sample library', () => {
  // Header names in the sample may change, so only check what holds for any header set.
  const result = parseCSV(fs.readFileSync(__dirname + '/sample-content.csv', 'utf8'));
  assert.equal(result.entries.length, 10);
  assert.equal(result.skipped.length, 0);
  assert.deepEqual(result.warnings, []);
  assert.ok(result.contentTypes.length >= 1);
  assert.ok(result.entries.every(e => e.fields.length >= 1 && e.key));
});

test('ctas cells split on pipes into separate values', () => {
  const result = parseCSV('key,heading,ctas\nk1,Welcome,Get started|Skip for now');
  assert.deepEqual(values(result.entries[0], 'ctas'), ['Get started', 'Skip for now']);
  assert.deepEqual(result.contentTypes, ['heading', 'ctas']);
});

test('handles quotes, escaped quotes, commas and line breaks in fields', () => {
  const { entries } = parseCSV(HEADER + '\na,b,k1,"Say ""hi"", friend","Line one\nLine two",Go,src');
  assert.equal(first(entries[0], 'heading'), 'Say "hi", friend');
  assert.equal(first(entries[0], 'body'), 'Line one\nLine two');
});

test('handles CRLF line endings and a BOM', () => {
  const { entries } = parseCSV('﻿' + HEADER + '\r\na,b,k1,H1,B1,C1,src\r\na,b,k2,H2,B2,C2,src\r\n');
  assert.deepEqual(entries.map(e => e.key), ['k1', 'k2']);
});

test('headers are case-insensitive, trimmed and accept spaces', () => {
  const { entries } = parseCSV(' Key , Heading ,CTA, Source File \nk1,Hello,Go,src');
  assert.equal(first(entries[0], 'heading'), 'Hello');
  assert.deepEqual(values(entries[0], 'ctas'), ['Go']);
  assert.equal(entries[0].source_file, 'src');
});

test('columns can be in any order and optional columns may be missing', () => {
  const { entries } = parseCSV('body,key\nSome body,k1');
  assert.equal(first(entries[0], 'body'), 'Some body');
  assert.equal(entries[0].category, '');
});

test('columns starting with _ or # are never imported and are reported', () => {
  const result = parseCSV(HEADER + ',_notes,#owner\na,b,k1,H,B,C,src,hello,me');
  assert.deepEqual(result.entries[0].fields.map(f => f.type), ['heading', 'body', 'ctas']);
  assert.deepEqual(result.ignoredColumns, ['_notes', '#owner']);
  assert.deepEqual(result.contentTypes, ['heading', 'body', 'ctas']);
});

test('any other column becomes a content type, named after the column', () => {
  const result = parseCSV('key,heading,label,metadata,Error Message\nk1,Welcome,Email,Tag: new,Try again');
  assert.deepEqual(result.contentTypes, ['heading', 'label', 'metadata', 'error_message']);
  assert.deepEqual(result.entries[0].fields.map(f => [f.type, f.values]),
    [['heading', ['Welcome']], ['label', ['Email']], ['metadata', ['Tag: new']], ['error_message', ['Try again']]]);
});

test('a CSV with no heading, body or ctas works if it has any content column', () => {
  const result = parseCSV('key,label\nk1,Email');
  assert.deepEqual(result.contentTypes, ['label']);
  assert.equal(first(result.entries[0], 'label'), 'Email');
});

test('content types follow the column order of the file', () => {
  assert.deepEqual(parseCSV('key,body,heading\nk1,B,H').contentTypes, ['body', 'heading']);
});

test('only types that actually have copy are listed', () => {
  const result = parseCSV('key,heading,tooltip\nk1,H,\nk2,H2,');
  assert.deepEqual(result.contentTypes, ['heading']);
  assert.deepEqual(result.entries[0].fields.map(f => f.type), ['heading']);
});

test('empty cells in a content column leave that field out of the entry', () => {
  const { entries } = parseCSV('key,heading,label\nk1,H,\nk2,,L');
  assert.deepEqual(entries[0].fields.map(f => f.type), ['heading']);
  assert.deepEqual(entries[1].fields.map(f => f.type), ['label']);
});

test('only ctas splits on pipes; other columns keep them', () => {
  const { entries } = parseCSV('key,ctas,label\nk1,A|B,x | y');
  assert.deepEqual(values(entries[0], 'ctas'), ['A', 'B']);
  assert.deepEqual(values(entries[0], 'label'), ['x | y']);
});

test('reserved columns are never content types', () => {
  const result = parseCSV('key,category,subcategory,source_file,heading\nk1,a,b,c,H');
  assert.deepEqual(result.contentTypes, ['heading']);
});

test('semicolon and tab delimiters are detected', () => {
  assert.equal(first(parseCSV('key;heading\nk1;Hi, there').entries[0], 'heading'), 'Hi, there');
  assert.equal(parseCSV('key\theading\nk1\tHi').delimiter, '\t');
});

test('a delimiter inside quoted header text does not fool detection', () => {
  const result = parseCSV('key,"a;b;c;d",heading\nk1,x,Hi');
  assert.equal(result.delimiter, ',');
  assert.equal(first(result.entries[0], 'heading'), 'Hi');
});

test('trailing empty cells from Excel are tolerated', () => {
  const { entries, skipped } = parseCSV(HEADER + ',,\na,b,k1,H,B,C,src,,');
  assert.equal(entries.length, 1);
  assert.equal(skipped.length, 0);
});

test('short rows are padded', () => {
  const { entries } = parseCSV(HEADER + '\na,b,k1,Heading');
  assert.equal(first(entries[0], 'heading'), 'Heading');
  assert.equal(entries[0].source_file, '');
});

test('bad rows are skipped with a reason and the rest still import', () => {
  const result = parseCSV([HEADER, 'a,b,k1,H,B,C,src', 'a,b,,H,B,C,src', 'a,b,k3,,,,src', 'a,b,k4,H,B,C,src,oops', 'a,b,k5,H,B,C,src'].join('\n'));
  assert.deepEqual(result.entries.map(e => e.key), ['k1', 'k5']);
  assert.deepEqual(result.skipped.map(s => s.row), [3, 4, 5]);
  assert.match(result.skipped[0].reason, /missing key/);
  assert.match(result.skipped[1].reason, /no copy/);
  assert.match(result.skipped[2].reason, /cells/);
});

test('blank lines are ignored silently', () => {
  const result = parseCSV(HEADER + '\n\na,b,k1,H,B,C,src\n\n');
  assert.equal(result.entries.length, 1);
  assert.equal(result.skipped.length, 0);
});

test('duplicate keys import but warn', () => {
  const result = parseCSV(HEADER + '\na,b,k1,H,B,C,s\na,b,k1,H2,B2,C2,s');
  assert.equal(result.entries.length, 2);
  assert.match(result.warnings[0], /Duplicate keys: k1/);
});

test('duplicate columns use the first and warn', () => {
  const result = parseCSV('key,heading,heading\nk1,First,Second');
  assert.equal(first(result.entries[0], 'heading'), 'First');
  assert.match(result.warnings[0], /Duplicate columns/);
});

test('a stray quote inside an unquoted cell is kept literally', () => {
  assert.equal(first(parseCSV('key,heading\nk1,5" tall').entries[0], 'heading'), '5" tall');
});

test('fatal errors', () => {
  assert.throws(() => parseCSV(''), /empty/);
  assert.throws(() => parseCSV('   \n  '), /empty/);
  assert.throws(() => parseCSV('heading,body\nH,B'), /Missing a "key" column/);
  assert.throws(() => parseCSV('key,category\nk1,a'), /No content columns/);
  assert.throws(() => parseCSV('key,_notes\nk1,a'), /No content columns/);
  assert.throws(() => parseCSV(HEADER), /No usable rows/);
  assert.throws(() => parseCSV(HEADER + '\na,b,k1,"never closed,B,C,src'), /never closed/);
});

test('no usable rows explains the first problem', () => {
  assert.throws(() => parseCSV(HEADER + '\na,b,,H,B,C,src'), /Row 2 missing key/);
});

test('values are trimmed and CTAs split on pipes', () => {
  const { entries } = parseCSV('key,ctas\n k1 , A | B ||C ');
  assert.equal(entries[0].key, 'k1');
  assert.deepEqual(values(entries[0], 'ctas'), ['A', 'B', 'C']);
});
