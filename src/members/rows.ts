/**
 * The list itself: members grouped into families, in reading order, each
 * family numbered in the order it appears.
 */
import { groupFamilies } from '@/families/families';
import type { Relationship } from '@/families/types';
import type { Member } from './types';

export type ListRow = {
    member: Member;
    familyKey: string;
    /** How many listed people share the family — 1 for someone on their own. */
    familySize: number;
    /** 0-based position of the family in the list, for alternating shading. */
    familyIndex: number;
    /** True on a family's first row, where the preview draws its separator. */
    firstOfFamily: boolean;
};

export type MemberList = {
    rows: ListRow[];
    familyCount: number;
    /** Families with more than one listed person. */
    multiFamilyCount: number;
    peopleInMultiFamilies: number;
};

const de = (a: string, b: string) => a.localeCompare(b, 'de', { sensitivity: 'base' });
const byPerson = (a: Member, b: Member) =>
    de(a.lastName, b.lastName) || de(a.firstName, b.firstName) || a.personId - b.personId;

/**
 * Families are detected among exactly the members passed in, so a member
 * filtered out of the list never joins two others into one family.
 *
 * Order: people by surname, first name, id within a family; families by their
 * first person. Family ids are then numbered top to bottom — F001 is the first
 * family on the list, so the ids read as a running count and a gap means
 * nothing was left out.
 */
export function buildList(members: Member[], relationships: Relationship[]): MemberList {
    const families = groupFamilies(members, relationships);
    const byId = new Map(members.map((m) => [m.personId, m]));

    const groups = families
        .map((f) =>
            f.personIds
                .map((id) => byId.get(id))
                .filter((m): m is Member => m !== undefined)
                .sort(byPerson),
        )
        .filter((g) => g.length > 0)
        .sort((a, b) => byPerson(a[0], b[0]));

    const width = Math.max(3, String(groups.length).length);
    const rows: ListRow[] = [];
    groups.forEach((group, familyIndex) => {
        const familyKey = `F${String(familyIndex + 1).padStart(width, '0')}`;
        group.forEach((member, i) =>
            rows.push({
                member,
                familyKey,
                familySize: group.length,
                familyIndex,
                firstOfFamily: i === 0,
            }),
        );
    });

    const multi = groups.filter((g) => g.length > 1);
    return {
        rows,
        familyCount: groups.length,
        multiFamilyCount: multi.length,
        peopleInMultiFamilies: multi.reduce((sum, g) => sum + g.length, 0),
    };
}
