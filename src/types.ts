export type MemberTitle = 'Sis' | 'Bro';
export type UserRole = 'Admin' | 'Secretary' | 'Member';

export interface Activity {
  id: string;
  name: string;
  dayOfWeek: string; // e.g., 'Sunday', 'Tuesday', 'Friday', '1st Saturday', '2nd Saturday'
}

export type OutreachStatus = 'none' | 'pending' | 'contacted' | 'resolved';

export interface Member {
  id: string;
  title: MemberTitle;
  name: string;
  isSick: boolean; // If true, assumed present in calculations
  isVisible: boolean; // Toggled by eye icon, if false, not shown in attendance sheet
  role: 'member' | 'admin' | 'secretary'; // Default 'member'
  accessCode: string; // 7-character auto-generated alphanumeric code
  outreachStatus?: OutreachStatus;
  outreachNotes?: string;
  birthday?: string; // format 'MM-DD', e.g. '07-14'
}

export interface HouseFellowshipNotice {
  id: 'house_fellowship';
  topic: string;
  date: string;
  time: string;
  host: string;
  address: string;
  lastUpdatedBy?: string;
}

export interface AttendanceRecord {
  memberId: string;
  status: 'Present' | 'Absent';
  isSickAtTime?: boolean; // Captured status when attendance was taken
}

export interface AttendanceSession {
  id: string;
  activityId: string;
  activityName: string; // Snapshotted activity name
  date: string; // YYYY-MM-DD
  records: AttendanceRecord[];
}
