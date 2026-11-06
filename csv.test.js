const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseCSV } = require('./csv.js');

const HEADER = 'category,subcategory,key,heading,body,ctas,source_file';

test('parses the sample library', () => {
  const result = parseCSV(fs.readFileSync(__dirname + '/sample-content.csv', 'utf8'));
  assert.equal(result.entries.length, 10);
  assert.equal(result.skipped.length, 0);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.entries[0].ctaList, ['Get started', 'Skip for now']);
});

test('handles quotes, escaped quotes, commas and line breaks in fields', () => {
  const { entries } = parseCSV(HEADER + '\na,b,k1,"Say ""hi"", friend","Line one\nLine two",Go,src');
  assert.equal(entries[0].heading, 'Say "hi", friend');
  assert.equal(entries[0].body, 'Line one\nLine two');
});

test('handles CRLF line endings and a BOM', () => {
  const { entries } = parseCSV('﻿' + HEADER + '\r\na,b,k1,H1,B1,C1,src\r\na,b,k2,H2,B2,C2,src\r\n');
  assert.deepEqual(entries.map(e => e.key), ['k1', 'k2']);
});

test('headers are case-insensitive, trimmed and accept spaces', () => {
  const { entries } = parseCSV(' Key , Heading ,CTA, Source File \nk1,Hello,Go,src');
  assert.equal(entries[0].heading, 'Hello');
  assert.deepEqual(entries[0].ctaList, ['Go']);
  assert.equal(entries[0].source_file, 'src');
});

test('columns can be in any order and optional columns may be missing', () => {
  const { entries } = parseCSV('body,key\nSome body,k1');
  assert.equal(entries[0].body, 'Some body');
  assert.equal(entries[0].category, '');
});

test('extra columns are ignored and reported', () => {
  const result = parseCSV(HEADER + ',notes,owner\na,b,k1,H,B,C,src,hello,me');
  assert.equal(result.entries.length, 1);
  assert.deepEqual(result.ignoredColumns, ['notes', 'owner']);
});

test('semicolon and tab delimiters are detected', () => {
  assert.equal(parseCSV('key;heading\nk1;Hi, there').entries[0].heading, 'Hi, there');
  assert.equal(parseCSV('key\theading\nk1\tHi').delimiter, '\t');
});

test('a delimiter inside quoted header text does not fool detection', () => {
  const result = parseCSV('key,"a;b;c;d",heading\nk1,x,Hi');
  assert.equal(result.delimiter, ',');
  assert.equal(result.entries[0].heading, 'Hi');
});

test('trailing empty cells from Excel are tolerated', () => {
  const { entries, skipped } = parseCSV(HEADER + ',,\na,b,k1,H,B,C,src,,');
  assert.equal(entries.length, 1);
  assert.equal(skipped.length, 0);
});

test('short rows are padded', () => {
  const { entries } = parseCSV(HEADER + '\na,b,k1,Heading');
  assert.equal(entries[0].heading, 'Heading');
  assert.equal(entries[0].source_file, '');
});

test('bad rows are skipped with a reason and the rest still import', () => {
  const result = parseCSV([HEADER, 'a,b,k1,H,B,C,src', 'a,b,,H,B,C,src', 'a,b,k3,,,,src', 'a,b,k4,H,B,C,src,oops', 'a,b,k5,H,B,C,src'].join('\n'));
  assert.deepEqual(result.entries.map(e => e.key), ['k1', 'k5']);
  assert.deepEqual(result.skipped.map(s => s.row), [3, 4, 5]);
  assert.match(result.skipped[0].reason, /missing key/);
  assert.match(result.skipped[1].reason, /no heading/);
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
  assert.equal(result.entries[0].heading, 'First');
  assert.match(result.warnings[0], /Duplicate columns/);
});

test('a stray quote inside an unquoted cell is kept literally', () => {
  assert.equal(parseCSV('key,heading\nk1,5" tall').entries[0].heading, '5" tall');
});

test('fatal errors', () => {
  assert.throws(() => parseCSV(''), /empty/);
  assert.throws(() => parseCSV('   \n  '), /empty/);
  assert.throws(() => parseCSV('heading,body\nH,B'), /Missing a "key" column/);
  assert.throws(() => parseCSV('key,category\nk1,a'), /Missing copy columns/);
  assert.throws(() => parseCSV(HEADER), /No usable rows/);
  assert.throws(() => parseCSV(HEADER + '\na,b,k1,"never closed,B,C,src'), /never closed/);
});

test('no usable rows explains the first problem', () => {
  assert.throws(() => parseCSV(HEADER + '\na,b,,H,B,C,src'), /Row 2 missing key/);
});

test('values are trimmed and CTAs split on pipes', () => {
  const { entries } = parseCSV('key,ctas\n k1 , A | B ||C ');
  assert.equal(entries[0].key, 'k1');
  assert.deepEqual(entries[0].ctaList, ['A', 'B', 'C']);
});
