#!/usr/bin/env node

/**
 * Generate `src/shared/ct-types.generated.d.ts` from a ChurchTools OpenAPI
 * schema. Reads `CT_OPENAPI_URL` from process env (also honors `.env`).
 *
 *   CT_OPENAPI_URL=https://demo.church.tools/api/openapi.json npm run gen:types
 *
 * The slim hand-curated `ct-types.d.ts` ships with the template so a fresh
 * clone builds without network access. Run this only when you need types
 * for endpoints beyond what the template uses, then update imports in
 * `src/shared/types.ts` to point at the generated file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Best-effort .env loader — no dotenv dependency, just enough for one var.
function loadEnv() {
    const p = path.join(root, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
}

async function main() {
    loadEnv();
    const url = process.env.CT_OPENAPI_URL;
    if (!url) {
        console.error(
            '❌ CT_OPENAPI_URL is not set. Add it to .env (see .env-example) or pass it inline.',
        );
        process.exit(1);
    }
    console.log(`📥 Fetching OpenAPI schema from ${url} …`);
    const ast = await openapiTS(new URL(url));
    const out = path.join(root, 'src/shared/ct-types.generated.d.ts');
    fs.writeFileSync(out, astToString(ast));
    const sizeKb = (fs.statSync(out).size / 1024).toFixed(1);
    console.log(`✅ Wrote ${path.relative(root, out)} (${sizeKb} KB).`);
    console.log('   Update imports in src/shared/types.ts to use the generated types.');
}

main().catch((err) => {
    console.error('gen-ct-types failed:', err);
    process.exit(1);
});
