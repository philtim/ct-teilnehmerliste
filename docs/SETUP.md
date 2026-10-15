# Setup guide

This is the post-clone walkthrough for projects scaffolded from `ct-template`.
For day-to-day developer commands (run, lint, build), see the project's `README.md`.

## 1. Initialize from the template

```bash
gh repo create my-extension --template <your-org>/ct-template
cd my-extension
npm install
npm run init
```

`npm run init` is interactive. It asks for:

- **npm package name** — the value for `package.json#name`.
- **ChurchTools shorty** — the custom module identifier (kebab-case, no spaces). Used everywhere the host references the extension.
- **Display name** — what end users see in the ChurchTools menu.
- **Description** — one line; lands in `package.json` and the GitHub release body.

The script derives `extensionKey`, `rootElementId`, and `rootClassName` from the shorty so they always match. After running, it deletes itself.

Commit the result:

```bash
git add -A
git commit -m "chore: scaffold from ct-template"
```

## 2. GitHub secrets

The release-please and deploy workflows need API access to your ChurchTools instances. In **Settings → Secrets and variables → Actions**, add:

| Secret               | Required | What it is                                                                          |
| -------------------- | -------- | ----------------------------------------------------------------------------------- |
| `CT_DEMO_BASE_URL`   | yes      | Demo instance URL, e.g. `https://demo.church.tools`. Where release-please auto-deploys. |
| `CT_DEMO_LOGIN_TOKEN` | yes      | Personal API token from CT (Personal settings → Login & Security → Login token).     |
| `CT_LIVE_BASE_URL`   | only for live deploys | Production instance URL.                                                |
| `CT_LIVE_LOGIN_TOKEN` | only for live deploys | Personal API token on the live instance.                              |

The composite action `.github/actions/upload-to-churchtools` self-bootstraps: if no module with the configured shorty exists, it's created on first upload.

## 3. CORS for local dev

Browser dev needs CORS allowed on the target instance:

1. Open ChurchTools admin → **System → Integrations → API → CORS**.
2. Add `http://localhost:5173` to the allow list.

Then:

```bash
cp .env-example .env
# fill VITE_BASE_URL, VITE_USERNAME, VITE_PASSWORD
npm run dev
```

The example slice should render `Hallo, <your name>!` — that's the end-to-end smoke test.

## 4. First release

`release-please` watches conventional-commit messages on `main`:

- `feat: …` → minor bump (or patch while pre-1.0)
- `fix: …` → patch bump
- `feat!: …` or `BREAKING CHANGE:` footer → major bump
- `chore: …`, `docs: …`, `refactor: …` → no release

When you push commits with `feat:` or `fix:` to `main`, release-please opens a rolling **release PR** titled `chore(main): release X.Y.Z`. Merge it to ship — that triggers:

1. Tag + GitHub release with auto-generated CHANGELOG.
2. ZIP build + attach to the release.
3. Upload to the demo instance via the composite action.

For live: open the **Deploy ZIP** workflow under Actions, pick `live` and the tag.

## 5. Optional: full CT types

The template ships with a slim hand-curated `src/shared/ct-types.d.ts` (Person, Group, KV-Store types). Run

```bash
CT_OPENAPI_URL=https://your-instance.church.tools/api/openapi.json npm run gen:types
```

to write `src/shared/ct-types.generated.d.ts` from the live OpenAPI spec, then update imports in `src/shared/types.ts` to use the generated file.

## 6. Replace the example slice

Delete `src/example/` and replace it with your feature(s). Per [ADR-004](adr/004-module-structure.md): one folder per feature, each with its own `*.api.ts`, `use*.ts` composable, and component(s). Cross-feature concerns go in `src/shared/`.
