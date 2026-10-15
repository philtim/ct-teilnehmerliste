# ct-teilnehmerliste — Project Context for Claude Code

A ChurchTools extension: pick a group (an event, a camp, any group you can
see), get a preview of its members grouped into families, choose the columns,
and download the list as an Excel file.

Family detection is taken over from the RR dashboard
(`philtim/ct-rr-organigram`, `src/beitraege/families.ts`). Changes to the rule
should be made in both places.

## Hard rules

- All CSS selectors live under `.teilnehmerliste-root` (ADR-002) — no exceptions.
- No `localStorage` / `sessionStorage` — use the ChurchTools KV-Store.
- API calls go through `@/shared/api`, never the raw client or `fetch` (ADR-005).
- **Nothing installation-specific in the source.** The extension must run
  unchanged at any congregation using ChurchTools. Group ids, group type ids,
  role names, field names — all of it is read from the API at runtime. A
  constant that describes _our_ installation is a bug, including when it is
  only a default.
- **ChurchTools permissions decide what is visible.** The extension shows the
  groups, people and fields the viewer may see through the API, and nothing
  else. It never widens that and never needs a configuration to work.
- **Read-only against ChurchTools.** The only write is the remembered column
  selection in the extension's own KV-Store, and a failing write must never
  block the preview or the download.
- All on-screen text lives in `src/shared/copy.ts`.
- The .xlsx writer stays behind a dynamic `import()` and its zip backend stays
  synchronous (ADR-008); `npm run check:bundle` guards both.

## Conventions

- Commit messages: conventional commits, imperative mood ("add feature", not
  "added feature"). release-please reads them for the changelog.
- Keep PRs focused — one logical change per PR.
- Keep a feature branch current by **rebasing** it onto `main`, never by
  merging `main` into it.
- Land a branch on `main` with a **real merge commit** — never squash. The
  individual commits are what release-please reads for the changelog, and
  what makes a single step revertable on its own.
- **Don't give a PR a conventional-commit title.** release-please attributes a
  merge commit via the pull request's title, so a title like
  `feat(x): add the thing` is counted on top of the commit of the same name
  inside it, and the change is listed twice in `CHANGELOG.md`. Write the title
  as a plain sentence and let the commits carry the prefixes.
- `npm run check` must pass before a PR is opened.

## Release and deploy

- Merging release-please's release PR tags the version, attaches the ZIP to the
  GitHub release and uploads it to the demo instance (`CT_DEMO_*` secrets).
- Live is deployed by hand: Actions → **Deploy ZIP** → `live` and the tag.
- The footer shows version and commit, so a deployment can be identified.
