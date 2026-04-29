import { api } from '../api';

export type AttendanceStatus = 'HERE' | 'LATE' | 'ABSENT' | 'EXCUSED';

export const ATTENDANCE_POINTS: Record<AttendanceStatus, number> = {
  HERE: 0,
  LATE: 2,
  ABSENT: 4,
  EXCUSED: 0,
};

export interface AttendanceStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  form: number | null;
}

export interface AttendanceEntry {
  id: string;
  rollCallId: string;
  studentUserId: string;
  status: AttendanceStatus;
  pointsAwarded: number;
  excuseReason: string | null;
  createdAt: string;
  updatedAt: string;
  student?: AttendanceStudent;
}

export interface RollCall {
  id: string;
  classSessionId: string | null;
  classId: string | null;
  takenBy: string;
  takenAt: string;
  locked: boolean;
  classSession: {
    id: string;
    startsAt: string;
    endsAt: string;
    class: { id: string; name: string; location: string | null };
  } | null;
  entries: AttendanceEntry[];
}

export interface PendingRollCall {
  sessionId: string;
  classId: string;
  className: string;
  location: string | null;
  kind: string;
  startsAt: string;
  endsAt: string;
  rollCallId: string | null;
  taken: boolean;
}

export interface WeekStatus {
  points: number;
  restricted: boolean;
  restrictionThreshold: number;
  weekStart: string;
  resetsAt: string;
}

export interface HistoryEntry extends AttendanceEntry {
  rollCall: {
    id: string;
    classSession: {
      startsAt: string;
      class: { id: string; name: string };
    } | null;
    class: { id: string; name: string } | null;
  };
}

export interface RestrictedRow {
  student: AttendanceStudent;
  points: number;
  restricted: boolean;
  weekStart: string;
  pendingVerificationCount: number;
}

export interface WeeklySnapshot {
  id: string;
  schoolId: string;
  studentUserId: string;
  weekStart: string;
  points: number;
  restricted: boolean;
  finalizedAt: string | null;
}

export interface VerificationEntryStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  form: number | null;
}

export interface VerificationEntry {
  id: string;
  rollCallId: string;
  studentUserId: string;
  status: AttendanceStatus;
  pointsAwarded: number;
  excuseReason: string | null;
  councilExcuseReason: string | null;
  verificationStatus: 'unverified' | 'verified' | 'excused_by_council';
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
  student: VerificationEntryStudent;
  verifier: VerificationEntryStudent | null;
  rollCall: {
    id: string;
    takenAt: string;
    takenByUser: VerificationEntryStudent | null;
    classSession: {
      startsAt: string;
      class: { id: string; name: string };
    } | null;
    class: { id: string; name: string } | null;
  };
}

export interface VerificationQueueResponse {
  weekStart: string;
  weekEnd: string;
  includeVerified: boolean;
  entries: VerificationEntry[];
}

export const attendanceApi = {
  openRollCall: (sessionId: string) =>
    api
      .get<RollCall>(`/attendance/sessions/${sessionId}/roll-call`)
      .then((r) => r.data),
  setEntry: (
    entryId: string,
    body: { status: AttendanceStatus; excuseReason?: string },
  ) =>
    api.patch<AttendanceEntry>(`/attendance/entries/${entryId}`, body).then((r) => r.data),
  bulk: (
    rollCallId: string,
    entries: Array<{ entryId: string; status: AttendanceStatus; excuseReason?: string }>,
  ) =>
    api
      .post<RollCall>(`/attendance/roll-calls/${rollCallId}/bulk`, { entries })
      .then((r) => r.data),
  myWeek: () => api.get<WeekStatus>('/attendance/me/week').then((r) => r.data),
  myHistory: (from?: string, to?: string) =>
    api
      .get<HistoryEntry[]>('/attendance/me/history', {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      })
      .then((r) => r.data),
  myPending: () =>
    api.get<PendingRollCall[]>('/attendance/my-pending').then((r) => r.data),
  restricted: () =>
    api.get<RestrictedRow[]>('/attendance/restricted').then((r) => r.data),
  userWeek: (userId: string) =>
    api.get<WeekStatus>(`/attendance/users/${userId}/week`).then((r) => r.data),

  // Phase 10
  mySnapshots: () =>
    api
      .get<WeeklySnapshot[]>('/attendance/me/history/snapshots')
      .then((r) => r.data),
  userSnapshots: (userId: string) =>
    api
      .get<WeeklySnapshot[]>(`/attendance/users/${userId}/history/snapshots`)
      .then((r) => r.data),
  runWeeklyReset: () =>
    api
      .post<{ schools: Array<{ schoolId: string; snapshotCount: number }> }>(
        '/attendance/admin/run-weekly-reset',
      )
      .then((r) => r.data),

  // Phase 11
  verificationQueue: (params: {
    week?: 'current' | 'previous';
    includeVerified?: boolean;
  } = {}) =>
    api
      .get<VerificationQueueResponse>('/attendance/verification/queue', {
        params: {
          ...(params.week ? { week: params.week } : {}),
          ...(params.includeVerified ? { includeVerified: 'true' } : {}),
        },
      })
      .then((r) => r.data),
  verifyEntry: (entryId: string) =>
    api
      .post<VerificationEntry>(`/attendance/entries/${entryId}/verify`)
      .then((r) => r.data),
  excuseEntry: (entryId: string, reason: string) =>
    api
      .post<VerificationEntry>(`/attendance/entries/${entryId}/excuse`, {
        reason,
      })
      .then((r) => r.data),
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  HERE: 'Here',
  LATE: 'Late',
  ABSENT: 'Absent',
  EXCUSED: 'Excused',
};
