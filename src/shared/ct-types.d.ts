/**
 * Hand-written subset of the ChurchTools API types: the KV-Store objects the
 * extension writes. Everything it reads is parsed from `unknown` in
 * `members/parse.ts`, so no other response shape is declared here.
 */

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
