/**
 * Re-exports from ct-types so feature code imports a single, stable surface.
 * Add project-specific aggregate types in their own file (e.g. domain.ts) —
 * keep this file purely declarative.
 */
export type {
    CustomModule,
    CustomModuleCreate,
    CustomModuleDataCategory,
    CustomModuleDataCategoryCreate,
    CustomModuleDataValue,
    CustomModuleDataValueCreate,
    DomainObjectPerson,
    Group,
    GroupHierarchy,
    GroupMember,
    Person,
} from './ct-types';
