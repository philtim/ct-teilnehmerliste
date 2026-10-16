import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate/browser';
import writeXlsxFile from 'write-excel-file/universal';
import { toExcel } from './workbook';
import { withCachedLinkValues, workbookWithCachedLinkValues } from './cached-values';

describe('withCachedLinkValues', () => {
    it('adds the id as the cached value of a link formula', () => {
        const xml =
            '<c r="A2" s="2"><f>HYPERLINK("https://x/?q=churchdb#PersonView/searchEntry:%23113/",113)</f></c>';
        expect(withCachedLinkValues(xml)).toBe(
            '<c r="A2" s="2"><f>HYPERLINK("https://x/?q=churchdb#PersonView/searchEntry:%23113/",113)</f><v>113</v></c>',
        );
    });

    it('handles every row, and leaves other cells and formulas alone', () => {
        const xml =
            '<c r="A2"><f>HYPERLINK("https://x/1",1)</f></c><c r="B2"><v>3</v></c>' +
            '<c r="A3"><f>HYPERLINK("https://x/2",2)</f></c><c r="C3"><f>SUM(A1:A2)</f></c>';
        expect(withCachedLinkValues(xml)).toBe(
            '<c r="A2"><f>HYPERLINK("https://x/1",1)</f><v>1</v></c><c r="B2"><v>3</v></c>' +
                '<c r="A3"><f>HYPERLINK("https://x/2",2)</f><v>2</v></c><c r="C3"><f>SUM(A1:A2)</f></c>',
        );
    });

    it('does not add a second value', () => {
        const xml = '<f>HYPERLINK("u",5)</f><v>5</v>';
        expect(withCachedLinkValues(xml)).toBe(xml);
    });
});

/**
 * The patch above matches the XML `write-excel-file` writes today. If an
 * update of the library writes the formula any other way, the regex stops
 * matching without a sound — and the id column is empty again in Protected
 * View. This writes a real file with the real library to catch exactly that.
 */
describe('workbookWithCachedLinkValues', () => {
    it("gives the library's own link formulas their value", async () => {
        const link = toExcel({ kind: 'link', value: 113, href: 'https://x/?q=a#b:%23113/' });
        const blob = await writeXlsxFile([
            { sheet: 'Mitglieder', data: [[{ value: 'ID', type: String }], [link]] },
        ]).toBlob();
        const patched = workbookWithCachedLinkValues(new Uint8Array(await blob.arrayBuffer()));
        const sheet = strFromU8(unzipSync(patched)['xl/worksheets/sheet1.xml']);
        expect(sheet).toMatch(/<f>HYPERLINK\("[^"]*",113\)<\/f><v>113<\/v>/);
    });
});
