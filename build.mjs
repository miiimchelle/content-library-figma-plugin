// Assembles ui.html from ui.src.html: inlines the compiled CSV parser and the sample CSV.
// Figma loads a single HTML file, so these cannot be separate script tags.
import { readFileSync, writeFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const parser = `const csvModule = (() => { const exports = {}; ${read('./csv.js')}\nreturn exports; })();`;
const sample = `const SAMPLE_CSV = ${JSON.stringify(read('./sample-content.csv'))};`;

// Function replacers: the inlined code contains "$" sequences that String.replace would interpret.
const html = read('./ui.src.html')
  .replace('/*__CSV_PARSER__*/', () => parser)
  .replace('/*__SAMPLE_CSV__*/', () => sample);

if (html.includes('/*__')) throw new Error('Unreplaced placeholder in ui.src.html');
writeFileSync(new URL('./ui.html', import.meta.url), html);
console.log('Built ui.html');
