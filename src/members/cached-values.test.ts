import { describe, expect, it } from 'vitest';
import { withCachedLinkValues } from './cached-values';

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
