import { describe, expect, it } from 'vitest';
import { parseGroupRef } from './groups.api';

describe('parseGroupRef', () => {
    it('reads a bare id, with or without #', () => {
        expect(parseGroupRef('2599')).toBe(2599);
        expect(parseGroupRef(' #2599 ')).toBe(2599);
    });

    it('reads a link copied from the address bar', () => {
        expect(parseGroupRef('https://gemeinde.church.tools/groups/2599/dashboard')).toBe(2599);
        expect(parseGroupRef('https://gemeinde.church.tools/groups/2599')).toBe(2599);
        expect(parseGroupRef('gemeinde.church.tools/groups/12?tab=members')).toBe(12);
    });

    it('treats a name as a name, even one with a number in it', () => {
        expect(parseGroupRef('Sommercamp 2026')).toBeNull();
        expect(parseGroupRef('https://gemeinde.church.tools/persons/2599/')).toBeNull();
        expect(parseGroupRef('')).toBeNull();
    });
});
