/**
 * Give each `HYPERLINK(…, id)` formula its value.
 *
 * `write-excel-file` writes a formula without a cached result (`<f>` and no
 * `<v>`). Excel recalculates on open — but not in Protected View, which is
 * how a downloaded file opens by default, nor do Quick Look, phone viewers or
 * a Drive preview calculate at all. They show the ID column empty or as 0.
 * The result of these formulas is known: it is the id they display. So it is
 * written next to the formula, in the place Excel itself would put it.
 *
 * Only formulas of exactly this shape are touched; any other cell is left as
 * the library wrote it.
 */
const LINK_FORMULA = /<f>(HYPERLINK\([^<]*?,(\d+)\))<\/f>(?!<v>)/g;

export function withCachedLinkValues(sheetXml: string): string {
    return sheetXml.replace(LINK_FORMULA, '<f>$1</f><v>$2</v>');
}
