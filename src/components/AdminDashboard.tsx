import React from 'react';
import { Member, Activity, AttendanceSession } from '../types';
import { calculateMemberStats } from '../utils';
import { TrendingUp, Users, HeartPulse, Sparkles, Calendar, Info, Clock, CheckCircle, Download } from 'lucide-react';

interface AdminDashboardProps {
  members: Member[];
  activities: Activity[];
  sessions: AttendanceSession[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  activities,
  sessions,
}) => {
  // 1. Calculate General Aggregates
  const totalMembers = members.length;
  const visibleMembersCount = members.filter((m) => m.isVisible).length;
  const sickMembersCount = members.filter((m) => m.isSick).length;

  // Calculate Average Attendance Percentage across all sessions
  let totalRecordCount = 0;
  let totalPresentCount = 0;

  sessions.forEach((session) => {
    session.records.forEach((record) => {
      // Find the member to check if they are globally sick
      const member = members.find((m) => m.id === record.memberId);
      const isPresent = record.status === 'Present' || record.isSickAtTime || (member && member.isSick);
      
      totalRecordCount++;
      if (isPresent) {
        totalPresentCount++;
      }
    });
  });

  const overallAttendanceRate = totalRecordCount > 0 ? Math.round((totalPresentCount / totalRecordCount) * 100) : 100;

  // Function to export complete attendance roster to CSV
  const handleExportAllCSV = () => {
    const activityHeaders = activities.map(a => `${a.name} (%)`);
    const headers = [
      'Member ID',
      'Title',
      'Name',
      'Access Code',
      'Role',
      'Sickness Status',
      'Combined Attendance Rate (%)',
      'Total Sessions Held',
      'Total Sessions Present',
      ...activityHeaders
    ];

    const rows = members.map((member) => {
      const stats = calculateMemberStats(member, activities, sessions);
      const totalHeld = stats.summaries.reduce((sum, s) => sum + s.noHeld, 0);
      const totalPresent = stats.summaries.reduce((sum, s) => sum + s.noPresent, 0);

      const activityPercentages = activities.map((activity) => {
        const found = stats.summaries.find(s => s.activityId === activity.id);
        return found && found.noHeld > 0 ? `${found.percentage}%` : '—';
      });

      return [
        member.id,
        member.title,
        member.name,
        member.accessCode,
        member.role.toUpperCase(),
        member.isSick ? 'Sick (Excused)' : 'Active',
        `${stats.combinedPercentage}%`,
        totalHeld.toString(),
        totalPresent.toString(),
        ...activityPercentages
      ];
    });

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Congregation_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Calculate average attendance per activity type
  const activityStats = activities.map((activity) => {
    const actSessions = sessions.filter((s) => s.activityId === activity.id);
    let totalActRecords = 0;
    let totalActPresent = 0;

    actSessions.forEach((session) => {
      session.records.forEach((record) => {
        const member = members.find((m) => m.id === record.memberId);
        const isPresent = record.status === 'Present' || record.isSickAtTime || (member && member.isSick);
        totalActRecords++;
        if (isPresent) {
          totalActPresent++;
        }
      });
    });

    const rate = totalActRecords > 0 ? Math.round((totalActPresent / totalActRecords) * 100) : 0;

    return {
      id: activity.id,
      name: activity.name,
      day: activity.dayOfWeek,
      held: actSessions.length,
      rate,
    };
  });

  // Sort activities to find top performing
  const topPerforming = [...activityStats].sort((a, b) => b.rate - a.rate)[0];

  // 3. Chronological Sessions for line chart (up to 5 recent)
  const sortedSessions = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);

  const trendData = sortedSessions.map((session) => {
    let sessionPresent = 0;
    session.records.forEach((record) => {
      const member = members.find((m) => m.id === record.memberId);
      const isPresent = record.status === 'Present' || record.isSickAtTime || (member && member.isSick);
      if (isPresent) {
        sessionPresent++;
      }
    });

    const rate = session.records.length > 0 ? Math.round((sessionPresent / session.records.length) * 100) : 0;

    return {
      date: session.date,
      name: session.activityName,
      rate,
    };
  });

  // Bro/Sis demographic stats
  const broCount = members.filter((m) => m.title === 'Bro').length;
  const sisCount = members.filter((m) => m.title === 'Sis').length;
  const broPct = totalMembers > 0 ? Math.round((broCount / totalMembers) * 100) : 0;
  const sisPct = totalMembers > 0 ? Math.round((sisCount / totalMembers) * 100) : 0;

  return (
    <div id="admin-dashboard-root" className="space-y-6">
      {/* Dashboard Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4DD] pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-[#3D3D33] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#5A5A40]" />
            Executive Attendance Dashboard
          </h2>
          <p className="text-sm text-[#7A7A66]">
            Real-time aggregate reporting, active sickness metrics, and historical service trends.
          </p>
        </div>
        <button
          onClick={handleExportAllCSV}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#5A5A40] bg-white hover:bg-[#FAF9F6] border border-[#C8C8A9] rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
          title="Export complete congregation roster attendance to CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Export All Attendance (CSV)
        </button>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Total Members
            </p>
            <p id="bento-total-members" className="text-3xl font-extrabold text-[#3D3D33]">
              {totalMembers}
            </p>
            <p className="text-xs text-[#7A7A66]">
              {visibleMembersCount} visible • {totalMembers - visibleMembersCount} hidden
            </p>
          </div>
          <div className="p-3 bg-[#FAF9F6] text-[#5A5A40] rounded-xl border border-[#E6E4DD]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Attendance Index */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Attendance Index
            </p>
            <p id="bento-overall-rate" className="text-3xl font-extrabold text-[#5A5A40]">
              {overallAttendanceRate}%
            </p>
            <p className="text-xs text-[#7A7A66]">
              Combined average of all sessions
            </p>
          </div>
          <div className="p-3 bg-[#F5F2ED] text-[#5A5A40] rounded-xl border border-[#E6E4DD]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Active Sickness Log */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Active Sickness Log
            </p>
            <p id="bento-sick-count" className="text-3xl font-extrabold text-[#B25E5E]">
              {sickMembersCount}
            </p>
            <p className="text-xs text-[#7A7A66]">
              Absences excused as present
            </p>
          </div>
          <div className="p-3 bg-[#FDF2F2] text-[#B25E5E] rounded-xl border border-[#FAD2D2]">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>

        {/* Top-Performing Activity */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider">
              Highest Attendance Rate
            </p>
            <p id="bento-top-activity" className="text-xl font-extrabold text-[#3D3D33] truncate max-w-[150px]">
              {topPerforming ? topPerforming.name : '—'}
            </p>
            <p className="text-xs text-[#7A7A66]">
              Avg Rate: {topPerforming ? `${topPerforming.rate}%` : '0%'}
            </p>
          </div>
          <div className="p-3 bg-[#FAF9F6] text-[#D4A373] rounded-xl border border-[#E6E4DD]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Custom SVG Bar Chart: Service-by-service averages */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E4DD] p-5 space-y-4 shadow-sm">
          <div className="border-b border-[#E6E4DD] pb-3">
            <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
              Activity Attendance Benchmarking
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Average attendance rate (%) sorted by program types
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {activityStats.length === 0 ? (
              <p className="text-center text-[#7A7A66] text-xs py-8">
                No activities configured.
              </p>
            ) : (
              activityStats.map((stat) => (
                <div key={stat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#3D3D33]">
                      {stat.name} <span className="font-normal text-[#7A7A66]">({stat.day})</span>
                    </span>
                    <span className="font-mono font-bold text-[#3D3D33]">{stat.rate}%</span>
                  </div>
                  {/* Progress bar styled bar chart */}
                  <div className="w-full h-3 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E6E4DD]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.rate >= 90
                          ? 'bg-[#5A5A40]'
                          : stat.rate >= 80
                          ? 'bg-[#707052]'
                          : stat.rate >= 60
                          ? 'bg-[#D4A373]'
                          : stat.rate >= 50
                          ? 'bg-[#E1C4A5]'
                          : 'bg-[#C8A2A2]'
                      }`}
                      style={{ width: `${stat.rate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7A7A66] font-mono">
                    <span>Sessions held: {stat.held}</span>
                    <span>Remark: {stat.rate >= 90 ? 'Excellent' : stat.rate >= 80 ? 'Very Good' : stat.rate >= 60 ? 'Good' : stat.rate >= 50 ? 'Fair' : 'Poor'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Demographics / Ratios */}
        <div className="bg-white rounded-2xl border border-[#E6E4DD] p-5 space-y-4 shadow-sm">
          <div className="border-b border-[#E6E4DD] pb-3">
            <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
              Congregation Composition
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Title composition of registered members
            </p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center space-y-5">
            {/* Split ring visualizer */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-[#D4A373]"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-[#5A5A40]"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - broPct / 100)}`}
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-xs font-bold text-[#7A7A66]">Ratio</p>
                <p className="text-base font-serif font-bold text-[#3D3D33]">
                  {broCount}:{sisCount}
                </p>
              </div>
            </div>

            {/* Labels */}
            <div className="w-full grid grid-cols-2 gap-3 text-center border-t border-[#E6E4DD] pt-4">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#5A5A40] rounded-full inline-block" />
                  Bro ({broCount})
                </p>
                <p className="text-lg font-bold text-[#5A5A40]">{broPct}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#D4A373] rounded-full inline-block" />
                  Sis ({sisCount})
                </p>
                <p className="text-lg font-bold text-[#D4A373]">{sisPct}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Trends Line-chart widget */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] p-5 space-y-4 shadow-sm">
        <div className="border-b border-[#E6E4DD] pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-serif font-bold text-[#3D3D33]">
              Chronological Attendance Trend
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Attendance rate of the last 5 registered service sessions
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F5F2ED] text-[#5A5A40] border border-[#E6E4DD] rounded-full font-bold">
            Live Timeline
          </span>
        </div>

        {trendData.length === 0 ? (
          <p className="text-center text-[#7A7A66] text-xs py-8">
            No session logs taken yet. Take attendance to build timeline trends.
          </p>
        ) : (
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-3">
              {trendData.map((session, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-2 group">
                  {/* Bar height represents trend */}
                  <div className="w-full bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg h-36 flex flex-col justify-end p-1 hover:border-[#5A5A40] transition-colors">
                    <div
                      className={`w-full rounded-md transition-all duration-500 flex items-center justify-center text-[10px] font-mono font-bold text-white ${
                        session.rate >= 90
                          ? 'bg-[#5A5A40]'
                          : session.rate >= 80
                          ? 'bg-[#707052]'
                          : session.rate >= 60
                          ? 'bg-[#D4A373]'
                          : 'bg-[#C8A2A2]'
                      }`}
                      style={{ height: `${Math.max(session.rate, 15)}%` }}
                    >
                      {session.rate}%
                    </div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-[10px] font-bold text-[#3D3D33] truncate max-w-[80px]" title={session.name}>
                      {session.name}
                    </p>
                    <p className="text-[9px] font-mono text-[#7A7A66]">
                      {session.date.split('-').slice(1).join('/')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
