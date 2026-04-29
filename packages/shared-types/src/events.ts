export interface EventRegistry {
  // Auth
  'auth.login': { userId: string; schoolId: string; ip: string };
  'auth.logout': { userId: string; sessionId: string };

  // Users
  'user.created': { userId: string; schoolId: string; createdBy: string };
  'user.updated': { userId: string; schoolId: string; updatedBy: string };
  'user.role_assigned': { userId: string; roleId: string; assignedBy: string };
  'user.role_removed': { userId: string; roleId: string; removedBy: string };

  // Classes
  'class.created': { classId: string; schoolId: string; createdBy: string };
  'class.updated': { classId: string; schoolId: string; updatedBy: string };
  'class.deleted': { classId: string; schoolId: string; deletedBy: string };
  'class.enrollment.added': { classId: string; studentUserId: string; schoolId: string; addedBy: string };
  'class.enrollment.removed': { classId: string; studentUserId: string; schoolId: string; removedBy: string };
  'class.session.created': { sessionId: string; classId: string; schoolId: string; createdBy: string };
  'class.session.updated': { sessionId: string; classId: string; schoolId: string; updatedBy: string };
  'class.session.deleted': { sessionId: string; classId: string; schoolId: string; deletedBy: string };

  // Attendance
  'attendance.roll_call_opened': { rollCallId: string; classId: string; schoolId: string };
  'attendance.roll_call_closed': { rollCallId: string; classId: string; schoolId: string };
  'attendance.entry_recorded': { entryId: string; studentId: string; status: string; points: number; schoolId: string };
  'attendance.entry.changed': {
    entryId: string;
    rollCallId: string;
    studentUserId: string;
    oldStatus: string;
    newStatus: string;
    oldPoints: number;
    newPoints: number;
    changedBy: string;
  };
  'attendance.entry_excused': { entryId: string; verifiedBy: string; reason: string };
  'attendance.weekly_reset': { schoolId: string; week: string; restrictedCount: number };
  'attendance.weekly_reset.completed': {
    schoolId: string;
    weekStart: string;
    snapshotCount: number;
  };
  'attendance.entry.verified': {
    entryId: string;
    verifierId: string;
  };
  'attendance.entry.excused': {
    entryId: string;
    excuserId: string;
    oldStatus: string;
    oldPoints: number;
    reason: string;
  };

  // Dorms
  'dorm.created': { dormId: string; schoolId: string; createdBy: string };
  'dorm.roll_call_opened': { rollCallId: string; dormId: string; schoolId: string };
  'dorm.roll_call_closed': { rollCallId: string; dormId: string; schoolId: string };
  'dorm.room_check': { dormId: string; studentId: string; messy: boolean; points: number; schoolId: string };

  // Programs
  'program.started': { programId: string; studentId: string; schoolId: string };
  'program.completed': { programId: string; studentId: string; schoolId: string };
  'program.step_completed': { programId: string; stepId: string; studentId: string };

  // Analytics
  'pageview.recorded': { userId: string; schoolId: string; from: string; to: string; ts: number };

  // System
  'audit.log': { userId: string; schoolId: string; action: string; entity: string; entityId: string; meta?: Record<string, unknown> };
}
