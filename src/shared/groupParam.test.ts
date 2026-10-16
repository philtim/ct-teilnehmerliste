import { describe, expect, it } from 'vitest';
import { readGroupParam, withGroupParam } from './groupParam';

const PAGE = 'https://gemeinde.church.tools/ccm/teilnehmerliste/';

describe('group parameter', () => {
    it('round-trips a group id and keeps the rest of the address', () => {
        const href = withGroupParam(`${PAGE}?x=1#top`, 2599);
        expect(href).toBe(`${PAGE}?x=1&gruppe=2599#top`);
        expect(readGroupParam(href)).toBe(2599);
    });

    it('removes the parameter for no group', () => {
        expect(withGroupParam(`${PAGE}?gruppe=12`, null)).toBe(PAGE);
    });

    it('tells a parameter that is no id from none at all', () => {
        expect(readGroupParam(`${PAGE}?gruppe=12abc`)).toBe('invalid');
        expect(readGroupParam(`${PAGE}?gruppe=1234567890`)).toBe('invalid');
        expect(readGroupParam(PAGE)).toBeNull();
        expect(readGroupParam(`${PAGE}?gruppe=`)).toBeNull();
        expect(readGroupParam('not a url')).toBeNull();
    });
});
