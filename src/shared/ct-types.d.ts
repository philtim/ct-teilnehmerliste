/**
 * Slim hand-curated subset of the ChurchTools API types — just what the
 * template's example slice + KV-Store actually use. The full generated
 * types are ~780 KB; pulling them in by default would bloat the template.
 *
 * To get the full set: `npm run gen:types` (writes ct-types.generated.d.ts).
 * Then update imports in src/shared/types.ts to point at the generated file.
 */

/** Person object as returned by GET /whoami and most person endpoints. */
export type Person = {
    id: number;
    guid: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    email?: string;
    imageUrl?: string | null;
    isArchived?: boolean;
};

/** Lightweight reference to a person, embedded in other domain objects. */
export type DomainObjectPerson = {
    apiUrl: string;
    domainAttributes: {
        firstName: string;
        lastName: string;
        guid: string;
        isArchived: boolean;
    };
    domainIdentifier: string;
    domainType: 'person';
    frontendUrl: string;
    icon: 'user';
    title: string;
};

/** Custom module — top-level KV-Store container. */
export type CustomModuleCreate = {
    name: string;
    shorty: string;
    description?: string;
    sortKey: number;
};

export type CustomModule = CustomModuleCreate & {
    id: number;
};

/** Categories live under a module and group related KV entries. */
export type CustomModuleDataCategoryCreate = {
    customModuleId: number;
    name: string;
    shorty: string;
    description: string;
    /** Opaque JSON string — parse with the kv-store helpers. */
    data?: string;
};

export type CustomModuleDataCategory = CustomModuleDataCategoryCreate & {
    id: number;
};

/** Values are the actual KV entries under a category. */
export type CustomModuleDataValueCreate = {
    dataCategoryId: number;
    /** Opaque JSON string — parse with the kv-store helpers. */
    value: string;
};

export type CustomModuleDataValue = CustomModuleDataValueCreate & {
    id: number;
};

/** Group object — minimal subset used in the template. Generate full types if you need more. */
export type Group = {
    id: number;
    guid: string;
    name: string;
    information: {
        groupTypeId: number;
        imageUrl: string | null;
    };
    memberStatistics?: {
        active: number;
        leaders: number;
        participants: number;
    };
    roles?: Array<{
        id: number;
        name: string;
        isLeader: boolean;
    }>;
};

export type GroupHierarchy = {
    children: Array<number>;
    groupId: number;
    parents: Array<number>;
};

export type GroupMember = {
    person: DomainObjectPerson;
    personId: number;
    groupTypeRoleId: number;
};
