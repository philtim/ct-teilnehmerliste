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

    it('ignores anything but a plain id', () => {
        expect(readGroupParam(`${PAGE}?gruppe=12abc`)).toBeNull();
        expect(readGroupParam(PAGE)).toBeNull();
        expect(readGroupParam('not a url')).toBeNull();
    });
});
