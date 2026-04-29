export interface EventRegistry {
  'auth.login': { userId: string; schoolId: string };
  'auth.login_failed': { email: string };
  'auth.logout': { userId: string };
  'pageview.recorded': { userId: string; schoolId: string; path: string; referrer?: string };
  'role.granted': { actorId: string; targetUserId: string; roleId: string };
  'role.revoked': { actorId: string; targetUserId: string; roleId: string };
  'school.created': { schoolId: string; name: string };
  'user.created': { userId: string; schoolId: string };
  'class.created': { classId: string; schoolId: string };
  'class.supervisor_changed': { classId: string; supervisorUserId: string };
  'attendance.recorded': { rollCallId: string; studentUserId: string; status: string; points: number };
  'rollcall.completed': { rollCallId: string; classId?: string; dormId?: string };
  'attendance.verified': { entryId: string; verifiedBy: string };
  'attendance.council_excused': { entryId: string; reason: string; excusedBy: string };
  'student.restricted': { studentUserId: string; schoolId: string; weekStart: string };
  'student.unrestricted': { studentUserId: string; schoolId: string };
  'points.week_reset': { schoolId: string; weekStart: string };
  'program.checksheet_completed': { studentUserId: string; checksheetId: string };
  'routing.assigned': { rfId: string; assignedTo: string };
  'ethics.report_filed': { reportId: string; schoolId: string };
  'success_story.verified': { storyId: string; verifiedBy: string };
  'dorm.created': { dormId: string; schoolId: string };
  'dorm.captain_changed': { dormId: string; captainUserId: string };
  'attendance.messy_room_assessed': { dormId: string; studentUserId: string; points: number };
}
