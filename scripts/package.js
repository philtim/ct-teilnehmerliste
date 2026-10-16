#!/usr/bin/env node
/** Zip `dist/` into `releases/<name>-v<version>-<commit>.zip`, the file ChurchTools installs. */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { name, version } = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

let gitHash;
try {
    gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
    gitHash = Date.now().toString(36);
}

if (!fs.existsSync(path.join(rootDir, 'dist'))) {
    console.error('dist directory not found. Run "npm run build" first.');
    process.exit(1);
}

const releasesDir = path.join(rootDir, 'releases');
fs.mkdirSync(releasesDir, { recursive: true });
const archivePath = path.join(releasesDir, `${name}-v${version}-${gitHash}.zip`);

execSync(`zip -r "${archivePath}" dist/ -x "*.map" "*.DS_Store"`, {
    cwd: rootDir,
    stdio: 'inherit',
});
console.log(archivePath);
