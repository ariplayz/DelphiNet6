import { AsyncLocalStorage } from 'node:async_hooks';

export interface SchoolContext {
  schoolId: string;
}

export const SchoolContextStorage = new AsyncLocalStorage<SchoolContext>();
