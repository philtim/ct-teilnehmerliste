#!/usr/bin/env node
/**
 * Bundle budget for the entry chunk (ADR-008).
 *
 * The .xlsx writer is pulled in by a dynamic `import()`, so opening the
 * extension and browsing groups never downloads a spreadsheet library that is
 * only needed at the moment of download. That is a one-character property:
 * turn the `import()` into a static `import` and the library silently moves
 * into the entry chunk, which nothing else would notice.
 *
 * So this checks both halves of the arrangement: the entry chunk stays under
 * budget, and the lazy chunk still exists.
 */
import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

/**
 * Headroom over the current size, not a round number: enough that ordinary
 * feature work does not trip it, far less than the ~20 kB gzip the
 * spreadsheet writer would add.
 */
const ENTRY_BUDGET_GZIP = 80 * 1024;

/** Modules that must stay behind a dynamic import, by chunk-name prefix. */
const REQUIRED_LAZY_CHUNKS = ['xlsx'];

/**
 * ChurchTools serves the extension under a Content-Security-Policy whose
 * `child-src *` does not cover `blob:`, so a Web Worker spawned from a blob URL
 * is refused and whatever needed it fails outright.
 *
 * `fflate` — the zip backend under `write-excel-file` — does exactly that for
 * payloads over 160 kB, which is why the export worked on every fixture and
 * failed on a live list. `vite.config.ts` aliases it to a synchronous shim;
 * drop that alias and the worker comes back silently. So: no worker
 * construction in any shipped chunk.
 */
const FORBIDDEN_IN_CHUNKS = [{ pattern: /new Worker\s*\(/, what: 'a Web Worker constructor' }];

const gzipSize = (file) => gzipSync(fs.readFileSync(file)).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

if (!fs.existsSync(assetsDir)) {
    console.error('No dist/assets — run `npm run build` first.');
    process.exit(1);
}

// The entry chunk is whatever index.html actually loads, rather than whatever
// happens to match a name pattern.
const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const entryMatch = /<script[^>]+src="[^"]*\/assets\/([^"]+\.js)"/.exec(html);
if (!entryMatch) {
    console.error('Could not find the entry script in dist/index.html.');
    process.exit(1);
}

const failures = [];

const entrySize = gzipSize(path.join(assetsDir, entryMatch[1]));
if (entrySize > ENTRY_BUDGET_GZIP) {
    failures.push(
        `Entry chunk ${entryMatch[1]} is ${kb(entrySize)} gzip, over the budget of ` +
            `${kb(ENTRY_BUDGET_GZIP)}. If this is a deliberate addition, raise the budget ` +
            'in scripts/check-bundle.js and say why in the commit message.',
    );
}

const chunks = fs.readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
for (const prefix of REQUIRED_LAZY_CHUNKS) {
    if (!chunks.some((file) => file.startsWith(`${prefix}-`))) {
        failures.push(
            `No "${prefix}" chunk in dist/assets. It must stay behind a dynamic import() ` +
                'so the initial bundle does not carry the spreadsheet writer.',
        );
    }
}

for (const file of chunks) {
    const source = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    for (const { pattern, what } of FORBIDDEN_IN_CHUNKS) {
        if (pattern.test(source)) {
            failures.push(
                `${file} contains ${what}, which the ChurchTools CSP refuses. See the ` +
                    'note in scripts/check-bundle.js and src/members/fflate-sync.ts.',
            );
        }
    }
}

console.log(`entry  ${entryMatch[1]}  ${kb(entrySize)} gzip  (budget ${kb(ENTRY_BUDGET_GZIP)})`);
for (const file of chunks.filter((f) => f !== entryMatch[1]).sort()) {
    console.log(`lazy   ${file}  ${kb(gzipSize(path.join(assetsDir, file)))} gzip`);
}

if (failures.length > 0) {
    console.error(`\n${failures.join('\n')}`);
    process.exit(1);
}
