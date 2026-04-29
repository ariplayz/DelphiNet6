import { api } from '../api';

export type ClassKind =
  | 'ACADEMIC'
  | 'AFTERNOON'
  | 'NIGHT'
  | 'SEMINAR'
  | 'STUDENT_SERVICE'
  | 'CLUB'
  | 'AFTER_CLASS';

export interface ClassSummary {
  id: string;
  name: string;
  kind: ClassKind;
  notes: string | null;
  location: string | null;
  supervisorUserId: string | null;
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: { enrollments: number };
}

export interface ClassSession {
  id: string;
  classId: string;
  startsAt: string;
  endsAt: string;
  recurrenceRule: string | null;
}

export interface ClassEnrollment {
  id: string;
  studentUserId: string;
  addedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    form: number | null;
  };
}

export interface ClassDetail extends ClassSummary {
  enrollments: ClassEnrollment[];
  sessions: ClassSession[];
}

export interface CreateClassDto {
  name: string;
  kind: ClassKind;
  notes?: string;
  location?: string;
  supervisorUserId?: string;
}

export type UpdateClassDto = Partial<CreateClassDto>;

export interface CreateSessionDto {
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string;
}

export type UpdateSessionDto = Partial<CreateSessionDto>;

export const classesApi = {
  list: (params?: { mine?: boolean; supervisor?: string }) =>
    api
      .get<ClassSummary[]>('/classes', {
        params: {
          ...(params?.mine ? { mine: 'true' } : {}),
          ...(params?.supervisor ? { supervisor: params.supervisor } : {}),
        },
      })
      .then((r) => r.data),
  mine: () => api.get<ClassSummary[]>('/classes/mine').then((r) => r.data),
  supervised: () =>
    api.get<ClassSummary[]>('/classes/supervised').then((r) => r.data),
  get: (id: string) =>
    api.get<ClassDetail>(`/classes/${id}`).then((r) => r.data),
  create: (dto: CreateClassDto) =>
    api.post<ClassSummary>('/classes', dto).then((r) => r.data),
  update: (id: string, dto: UpdateClassDto) =>
    api.patch<ClassSummary>(`/classes/${id}`, dto).then((r) => r.data),
  delete: (id: string) => api.delete(`/classes/${id}`).then((r) => r.data),
  setRoster: (id: string, userIds: string[]) =>
    api.put(`/classes/${id}/roster`, { userIds }).then((r) => r.data),
  listSessions: (id: string, from?: string, to?: string) =>
    api
      .get<ClassSession[]>(`/classes/${id}/sessions`, {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      })
      .then((r) => r.data),
  createSession: (id: string, dto: CreateSessionDto) =>
    api.post<ClassSession>(`/classes/${id}/sessions`, dto).then((r) => r.data),
  updateSession: (sid: string, dto: UpdateSessionDto) =>
    api
      .patch<ClassSession>(`/classes/sessions/${sid}`, dto)
      .then((r) => r.data),
  deleteSession: (sid: string) =>
    api.delete(`/classes/sessions/${sid}`).then((r) => r.data),
};

export const CLASS_KIND_LABELS: Record<ClassKind, string> = {
  ACADEMIC: 'Academic',
  AFTERNOON: 'Afternoon',
  NIGHT: 'Night',
  SEMINAR: 'Seminar',
  STUDENT_SERVICE: 'Student Service',
  CLUB: 'Club',
  AFTER_CLASS: 'After Class',
};
