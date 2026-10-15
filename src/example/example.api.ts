import { apiGet } from '@/shared/api';
import type { Person } from '@/shared/types';

/** Returns the currently authenticated user. */
export async function whoami(): Promise<Person> {
    return await apiGet<Person>('/whoami');
}
