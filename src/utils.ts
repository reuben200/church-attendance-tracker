import { Member, AttendanceSession, Activity } from './types';

export interface ActivitySummary {
  activityId: string;
  activityName: string;
  noHeld: number;
  noPresent: number;
  percentage: number;
  remark: string;
}

export interface MemberAttendanceStats {
  combinedPercentage: number;
  summaries: ActivitySummary[];
}

export const getRemark = (percentage: number, noHeld: number, noPresent: number): string => {
  if (noHeld === 0) return 'No sessions';
  if (noPresent === 0) return 'Zero attendance (0)';
  if (percentage <= 30) return 'Very Poor (0-30%)';
  if (percentage <= 49) return 'Poor (30-49%)';
  if (percentage <= 59) return 'Fair (50-59%)';
  if (percentage <= 79) return 'Good (60-79%)';
  if (percentage <= 89) return 'Very Good (80-89%)';
  return 'Excellent (>=90%)';
};

export const calculateMemberStats = (
  member: Member,
  activities: Activity[],
  sessions: AttendanceSession[]
): MemberAttendanceStats => {
  const summaries: ActivitySummary[] = activities.map((activity) => {
    // Sessions held for this activity
    const activitySessions = sessions.filter((s) => s.activityId === activity.id);
    const noHeld = activitySessions.length;

    let noPresent = 0;
    activitySessions.forEach((session) => {
      // Find the record for this member in this session
      const record = session.records.find((r) => r.memberId === member.id);
      
      // If member is currently marked as Sick globally, they are assumed to be present
      if (member.isSick) {
        noPresent++;
      } else if (record) {
        if (record.status === 'Present' || record.isSickAtTime) {
          noPresent++;
        }
      }
    });

    const percentage = noHeld > 0 ? Math.round((noPresent / noHeld) * 100) : 0;
    const remark = getRemark(percentage, noHeld, noPresent);

    return {
      activityId: activity.id,
      activityName: activity.name,
      noHeld,
      noPresent,
      percentage,
      remark,
    };
  });

  // Calculate combined attendance
  // Total sessions held across all activities
  const totalHeld = summaries.reduce((sum, s) => sum + s.noHeld, 0);
  const totalPresent = summaries.reduce((sum, s) => sum + s.noPresent, 0);
  const combinedPercentage = totalHeld > 0 ? Math.round((totalPresent / totalHeld) * 100) : 100;

  return {
    combinedPercentage,
    summaries,
  };
};

export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-rose-500 text-rose-50 border-rose-600',
    'bg-emerald-500 text-emerald-50 border-emerald-600',
    'bg-sky-500 text-sky-50 border-sky-600',
    'bg-amber-500 text-amber-50 border-amber-600',
    'bg-violet-500 text-violet-50 border-violet-600',
    'bg-indigo-500 text-indigo-50 border-indigo-600',
    'bg-fuchsia-500 text-fuchsia-50 border-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
