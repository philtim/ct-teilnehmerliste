#!/usr/bin/env node

/**
 * One-shot rewriter that turns this template into a concrete project.
 *
 *   node scripts/init-template.js
 *
 * Asks for the npm package name, the ChurchTools custom-module shorty, and
 * the human-readable module display name. Everything else (extension key,
 * mount-element ID, CSS root class) is derived from the shorty so there's
 * one source of truth.
 *
 * Run once after cloning the template; the script then deletes itself
 * along with the template-only README/SETUP scaffolding.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function prompt(rl, question, fallback) {
    const suffix = fallback ? ` [${fallback}]` : '';
    return rl.question(`${question}${suffix}: `).then((a) => a.trim() || fallback || '');
}

function kebab(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n');
}

function replaceInFile(p, replacements) {
    let s = fs.readFileSync(p, 'utf8');
    for (const [from, to] of replacements) {
        s = s.split(from).join(to);
    }
    fs.writeFileSync(p, s);
}

async function main() {
    const rl = readline.createInterface({ input, output });

    const pkgPath = path.join(root, 'package.json');
    const pkg = readJson(pkgPath);
    const old = pkg.churchtools;

    console.log('\nInitialize a new ChurchTools extension from this template.\n');

    const name = await prompt(rl, 'npm package name', 'my-ct-extension');
    const shorty = await prompt(rl, 'ChurchTools shorty (kebab-case)', kebab(name));
    const moduleName = await prompt(rl, 'Display name in ChurchTools', name);
    const description = await prompt(rl, 'Short description', '');

    rl.close();

    const extensionKey = shorty;
    const rootElementId = `${shorty}-app`;
    const rootClassName = `${shorty}-root`;

    // --- package.json
    pkg.name = name;
    pkg.description = description;
    pkg.churchtools = {
        shorty,
        moduleName,
        extensionKey,
        rootElementId,
        rootClassName,
    };
    writeJson(pkgPath, pkg);

    // --- string replacements across files
    const replacements = [
        [old.rootElementId, rootElementId],
        [old.rootClassName, rootClassName],
        [old.extensionKey, extensionKey],
        [old.moduleName, moduleName],
        [old.shorty, shorty],
    ];

    const targets = ['index.html', 'src/main.ts', '.env-example', 'README.md', 'docs/SETUP.md'];

    for (const rel of targets) {
        const p = path.join(root, rel);
        if (fs.existsSync(p)) replaceInFile(p, replacements);
    }

    // --- self-cleanup: this script and gen-types are useful only once.
    // Keep gen-ct-types.js — it stays valuable across the project's life.
    fs.rmSync(__filename);

    console.log('\n✅ Template initialized.');
    console.log(`   name:          ${name}`);
    console.log(`   shorty:        ${shorty}`);
    console.log(`   moduleName:    ${moduleName}`);
    console.log(`   rootElementId: ${rootElementId}`);
    console.log(`   rootClassName: ${rootClassName}`);
    console.log('\nNext: review CHANGELOG.md, customize README.md, then commit.\n');
}

main().catch((err) => {
    console.error('init-template failed:', err);
    process.exit(1);
});
