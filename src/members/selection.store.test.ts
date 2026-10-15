import { describe, expect, it } from 'vitest';
import { parseEntry } from './selection.store';

describe('parseEntry', () => {
    it('reads a well-formed entry', () => {
        expect(parseEntry({ id: 1, groupId: 9, selected: ['a'], known: ['a', 'b'] })).toEqual({
            id: 1,
            groupId: 9,
            selected: ['a'],
            known: ['a', 'b'],
        });
    });

    it('treats anything else as no entry', () => {
        for (const value of [
            null,
            'x',
            { id: 1, groupId: '9', selected: [], known: [] },
            { id: 1, groupId: 9, selected: [1], known: [] },
            { id: 1, groupId: 9, selected: [] },
        ]) {
            expect(parseEntry(value)).toBeNull();
        }
    });
});
