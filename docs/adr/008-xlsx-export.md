# ADR-008: Client-side .xlsx export with `write-excel-file`, zipped synchronously

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decided by:** Philipp Timmalog

## Context

The list leaves the extension as a file people keep working in. Three
constraints shape how it is written:

- **A spreadsheet, not a text dump.** CSV fails on German Excel in four
  separate ways — semicolon separator, decimal comma, BOM for umlauts, and
  dates like `07.03.2014` being converted on open — each a support question.
- **Written in the browser.** The extension is read-only against ChurchTools
  and has no backend.
- **Not paid for by everyone.** Browsing groups and the preview do not need a
  spreadsheet writer; only the click on "Excel herunterladen" does.

The RR dashboard (`philtim/ct-rr-organigram`, its ADR-010 and ADR-012) solved
the same problem and found one trap on the way: `write-excel-file` zips through
`fflate`, whose asynchronous `zip()` spawns a Web Worker from a `blob:` URL for
payloads over 160 kB. ChurchTools' Content-Security-Policy refuses that worker,
so the export works on every small fixture and fails on a real list.

## Decision

- **`write-excel-file`**, pinned, behind a dynamic `import()` in
  `src/members/xlsx.ts` — the only module that imports it. The workbook layout
  (`workbook.ts`) is pure and tested without it.
- **Synchronous zip.** `vite.config.ts` aliases bare `fflate` to
  `src/members/fflate-sync.ts`, which keeps `fflate`'s API and makes `zip()`
  call `zipSync()`. The cost is a few tens of milliseconds on the main thread
  once per download.
- **`npm run check:bundle`** (in CI) guards both halves: the entry chunk stays
  under its budget, an `xlsx-*` chunk exists, and no shipped chunk contains a
  `new Worker(` call.
- **What the file holds:** the list exactly as previewed — the same columns
  and order, family ids numbered top to bottom, the person id as a
  `HYPERLINK` formula to the profile, dates as dates, and a field column whose
  values are all plain numbers as numbers (so a fee column can be summed; a
  value with a leading zero, like a phone number, keeps the column text).
  An "Info" sheet names the group, when the data was read, which statuses
  were left out, the preview's hints about the data, and the extension
  version that wrote the file.
- **Link formulas carry their value.** `write-excel-file` writes formulas
  without a cached result, so Protected View, Quick Look and phone viewers
  would show the ID column empty. `xlsx.ts` reopens the file with the same
  synchronous `fflate` and adds the id as each `HYPERLINK` formula's `<v>`
  (`cached-values.ts`).

## Consequences

- Opening the extension does not load the writer (~19 kB gzip).
- A list of any size can be downloaded inside ChurchTools.
- The family id is a plain value in the file. Someone who disagrees with a
  grouping changes it there; the extension does not remember corrections.
