# ct-template

Template for ChurchTools Vue 3 + TypeScript extensions. Forks include:

- Vue 3 + Vite + TypeScript scaffold under `src/` with feature-folder structure ([ADR-004](docs/adr/004-module-structure.md)).
- Hardened API layer in `src/shared/api/` with timeouts, normalized errors, and an ESLint rule that forbids importing `@churchtools/churchtools-client` outside the API folder ([ADR-005](docs/adr/005-api-client.md)).
- KV-Store helpers split by concern (`module`, `category`, `value`) under `src/shared/kv-store/`.
- GitHub Actions for CI, release-please, and ZIP deploy to demo + live ChurchTools instances. Workflow inputs are read from `package.json#churchtools` so you only configure metadata in one place.
- A `Hello-Auth` example slice that calls `/whoami` and renders the user's name — proves the pipeline end-to-end.

## Use the template

```bash
gh repo create my-extension --template <your-org>/ct-template
cd my-extension
npm install
npm run init        # interactive: name, shorty, moduleName → updates everything
git add -A && git commit -m "chore: scaffold from ct-template"
```

Then follow [`docs/SETUP.md`](docs/SETUP.md) to wire up GitHub secrets and your first release.

## Project layout

```
src/
├── main.ts                 # boot, mount Vue app
├── App.vue                 # top-level shell
├── example/                # Hello-Auth slice (delete or replace)
│   ├── Example.vue
│   ├── useExample.ts       # composable
│   └── example.api.ts      # whoami()
└── shared/
    ├── api/                # the only place that imports @churchtools/churchtools-client
    │   ├── client.ts       # ct, initApi, withTimeout, apiGet/Post/Put/Delete
    │   ├── errors.ts       # ChurchToolsApiError
    │   └── pagination.ts   # fetchAllPages
    ├── kv-store/           # module / category / value helpers
    ├── ct-types.d.ts       # slim hand-curated CT types
    ├── constants.ts        # EXTENSION_KEY, API_TIMEOUT_MS
    ├── reset.css           # dev-only host-style simulation
    └── types.ts            # CT type re-exports
```

## Scripts

- `npm run dev` — Vite dev server with hot reload.
- `npm run build` — production build to `dist/`.
- `npm run lint` / `npm run typecheck` / `npm run check` — quality gates (CI runs `check`).
- `npm run deploy` — build + package into `releases/*.zip`.
- `npm run gen:types` — opt-in: regenerate full CT types from a live OpenAPI schema.
- `npm run init` — one-shot template initializer (delete after first run).

## Architecture decisions

See [`docs/adr/`](docs/adr/) for the six ADRs that shape this template.

## License

MIT — see [`LICENSE`](LICENSE).
