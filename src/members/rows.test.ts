import { describe, expect, it } from 'vitest';
import { buildList } from './rows';
import { member } from './test-fixtures';

describe('buildList', () => {
    it('groups families, orders them by name, and numbers them top to bottom', () => {
        const members = [
            member(1, { lastName: 'Zander', firstName: 'Ben', street: 'A-Weg 1' }),
            member(2, { lastName: 'Albers', firstName: 'Tom', street: 'B-Weg 2' }),
            member(3, { lastName: 'Zander', firstName: 'Anna', street: 'A-Weg 1' }),
        ];
        const list = buildList(members, []);
        expect(list.rows.map((r) => [r.member.personId, r.familyKey, r.familySize])).toEqual([
            [2, 'F001', 1],
            [3, 'F002', 2],
            [1, 'F002', 2],
        ]);
        expect(list.rows.map((r) => r.firstOfFamily)).toEqual([true, true, false]);
        expect(list.rows.map((r) => r.familyIndex)).toEqual([0, 1, 1]);
        expect(list).toMatchObject({
            familyCount: 2,
            multiFamilyCount: 1,
            peopleInMultiFamilies: 2,
        });
    });

    it('detects families among the listed members only', () => {
        // Two children joined only through a relationship each has to a third
        // member: filter the third out, and the link must not survive.
        const members = [
            member(1, { lastName: 'A', street: null }),
            member(2, { lastName: 'B', street: null }),
        ];
        const list = buildList(members, [
            { personId: 1, relativeId: 3, kind: 'link' },
            { personId: 2, relativeId: 3, kind: 'link' },
        ]);
        expect(list.familyCount).toBe(2);
    });

    it('widens the family number for long lists', () => {
        const members = Array.from({ length: 1000 }, (_, i) =>
            member(i + 1, { street: `Weg ${i}`, lastName: `N${String(i).padStart(4, '0')}` }),
        );
        expect(buildList(members, []).rows[0].familyKey).toBe('F0001');
    });

    it('is empty for nobody', () => {
        expect(buildList([], [])).toEqual({
            rows: [],
            familyCount: 0,
            multiFamilyCount: 0,
            peopleInMultiFamilies: 0,
        });
    });
});
