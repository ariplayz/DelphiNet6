import { api } from '../api';

export interface DormUserLite {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  form: number | null;
}

export interface DormSummary {
  id: string;
  schoolId: string;
  name: string;
  notes: string | null;
  captainUserId: string | null;
  captain: DormUserLite | null;
  roomCount: number;
  occupancy: number;
  createdAt: string;
}

export interface DormResident {
  id: string;
  studentUserId: string;
  since: string;
  student: DormUserLite;
}

export interface DormRoom {
  id: string;
  dormId: string;
  name: string;
  capacity: number;
  assignments: DormResident[];
}

export type DormSlotKind = 'morning' | 'evening';

export interface DormScheduleSlot {
  id: string;
  dormId: string;
  slot: DormSlotKind;
  timeOfDay: string; // HH:MM
  daysOfWeek: number[];
  allowsMessyRoomPoints: boolean;
}

export interface DormDetail {
  id: string;
  schoolId: string;
  name: string;
  notes: string | null;
  captainUserId: string | null;
  captain: DormUserLite | null;
  rooms: DormRoom[];
  schedules: DormScheduleSlot[];
}

export interface MyResidence {
  assignmentId: string;
  since: string;
  room: { id: string; name: string; capacity: number };
  dorm: { id: string; name: string; captain: DormUserLite | null };
}

export type DormAttendanceStatus = 'HERE' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface DormRollCallEntry {
  id: string;
  rollCallId: string;
  studentUserId: string;
  status: DormAttendanceStatus;
  excuseReason: string | null;
  pointsAwarded: number;
  kind: string;
  student?: DormUserLite;
}

export interface DormRollCallRoom {
  id: string;
  name: string;
  capacity: number;
  messy: boolean;
  entries: DormRollCallEntry[];
}

export interface DormRollCall {
  id: string;
  kind: 'DORM_MORNING' | 'DORM_EVENING';
  takenAt: string;
  takenBy: string;
  locked: boolean;
  dormId: string;
  dormName: string;
  slotId: string;
  slotKind: DormSlotKind;
  timeOfDay: string;
  allowsMessyRoomPoints: boolean;
  occursOn: string;
  rooms: DormRollCallRoom[];
  orphanEntries: DormRollCallEntry[];
}

export interface DormPendingItem {
  dormId: string;
  dormName: string;
  slotId: string;
  slot: DormSlotKind;
  timeOfDay: string;
  allowsMessyRoomPoints: boolean;
  taken: boolean;
  rollCallId: string | null;
}

export interface CreateDormDto {
  name: string;
  captainUserId?: string;
  notes?: string;
}

export interface UpdateDormDto {
  name?: string;
  captainUserId?: string | null;
  notes?: string | null;
}

export interface CreateRoomDto {
  name: string;
  capacity?: number;
}

export interface CreateScheduleSlotDto {
  slot: DormSlotKind;
  timeOfDay: string;
  daysOfWeek: number[];
  allowsMessyRoomPoints?: boolean;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dormsApi = {
  list: () => api.get<DormSummary[]>('/dorms').then((r) => r.data),
  get: (id: string) => api.get<DormDetail>(`/dorms/${id}`).then((r) => r.data),
  create: (dto: CreateDormDto) =>
    api.post<DormSummary>('/dorms', dto).then((r) => r.data),
  update: (id: string, dto: UpdateDormDto) =>
    api.patch<DormSummary>(`/dorms/${id}`, dto).then((r) => r.data),
  remove: (id: string) => api.delete(`/dorms/${id}`).then((r) => r.data),

  addRoom: (dormId: string, dto: CreateRoomDto) =>
    api.post<DormRoom>(`/dorms/${dormId}/rooms`, dto).then((r) => r.data),
  updateRoom: (roomId: string, dto: Partial<CreateRoomDto>) =>
    api.patch<DormRoom>(`/dorms/rooms/${roomId}`, dto).then((r) => r.data),
  deleteRoom: (roomId: string) =>
    api.delete(`/dorms/rooms/${roomId}`).then((r) => r.data),
  setRoomResidents: (roomId: string, userIds: string[]) =>
    api
      .put<DormRoom>(`/dorms/rooms/${roomId}/residents`, { userIds })
      .then((r) => r.data),

  listSchedule: (dormId: string) =>
    api
      .get<DormScheduleSlot[]>(`/dorms/${dormId}/schedule`)
      .then((r) => r.data),
  addScheduleSlot: (dormId: string, dto: CreateScheduleSlotDto) =>
    api
      .post<DormScheduleSlot>(`/dorms/${dormId}/schedule`, dto)
      .then((r) => r.data),
  updateScheduleSlot: (slotId: string, dto: Partial<CreateScheduleSlotDto>) =>
    api
      .patch<DormScheduleSlot>(`/dorms/schedule/${slotId}`, dto)
      .then((r) => r.data),
  removeScheduleSlot: (slotId: string) =>
    api.delete(`/dorms/schedule/${slotId}`).then((r) => r.data),

  myCaptaincy: () =>
    api.get<DormSummary[]>('/dorms/me/captaincy').then((r) => r.data),
  myResidence: () =>
    api.get<MyResidence | null>('/dorms/me/residence').then((r) => r.data),

  // Roll call
  myPending: () =>
    api
      .get<DormPendingItem[]>('/dorm-roll-call/my-pending')
      .then((r) => r.data),
  open: (slotId: string) =>
    api
      .get<DormRollCall>(`/dorm-roll-call/${slotId}/today`)
      .then((r) => r.data),
  setEntry: (
    entryId: string,
    body: { status: DormAttendanceStatus; excuseReason?: string },
  ) =>
    api
      .patch<DormRollCallEntry>(`/dorm-roll-call/entries/${entryId}`, body)
      .then((r) => r.data),
  markRoomMessy: (rollCallId: string, roomId: string) =>
    api
      .post<{
        rollCallId: string;
        roomId: string;
        residentUserIds: string[];
        created: number;
        alreadyMarked: boolean;
      }>(`/dorm-roll-call/${rollCallId}/rooms/${roomId}/messy`, {})
      .then((r) => r.data),
};
