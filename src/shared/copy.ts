/**
 * Every piece of text the extension shows, in one place — German only, so a
 * translation or a wording change is a one-file change. Components name a
 * key; they do not carry text of their own.
 *
 * Not in here: the Excel file's own content (members/workbook.ts), which is a
 * document of its own, and console messages, which nobody using the extension
 * reads.
 */
export const COPY = {
    listTruncated: (url: string, max: number) =>
        `${url} liefert mehr als ${max} Einträge — die Liste wäre unvollständig.`,
};
