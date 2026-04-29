export const ATTENDANCE_STATUSES = ['HERE', 'LATE', 'ABSENT', 'EXCUSED'] as const;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export const POINTS: Record<AttendanceStatusValue, number> = {
  HERE: 0,
  LATE: 2,
  ABSENT: 4,
  EXCUSED: 0,
};

export const RESTRICTION_THRESHOLD = 4;
