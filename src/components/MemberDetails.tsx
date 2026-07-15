import React, { useState } from 'react';
import { Member, Activity, AttendanceSession } from '../types';
import { calculateMemberStats, getRemark } from '../utils';
import { ArrowLeft, Award, Calendar, CheckCircle2, User, Upload, Trash2, Heart, HeartOff, Download } from 'lucide-react';

interface MemberDetailsProps {
  member: Member;
  activities: Activity[];
  sessions: AttendanceSession[];
  onBack?: () => void;
  onUpdateMember?: (id: string, updates: Partial<Member>) => void;
  isMemberOnlyView?: boolean;
}

export const MemberDetails: React.FC<MemberDetailsProps> = ({
  member,
  activities,
  sessions,
  onBack,
  onUpdateMember,
  isMemberOnlyView = false,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem(`avatar_${member.id}`) || null;
  });
  const [isUploading, setIsUploading] = useState(false);

  // Generate statistics
  const stats = calculateMemberStats(member, activities, sessions);

  // Chronological sessions sorted with latest first
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem(`avatar_${member.id}`, base64String);
        setAvatarUrl(base64String);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem(`avatar_${member.id}`);
    setAvatarUrl(null);
  };

  const handleExportIndividualCSV = () => {
    const headers = ['Date', 'Service/Activity', 'Attendance Status', 'Method/Notes'];
    const rows = sortedSessions.map((session) => {
      const record = session.records.find((r) => r.memberId === member.id);
      let statusText = 'Absent';
      let note = '';

      if (member.isSick) {
        statusText = 'Present (Excused)';
        note = 'Globally marked as Sick (Auto-Excused)';
      } else if (record) {
        if (record.isSickAtTime) {
          statusText = 'Present (Excused)';
          note = 'Excused as Sick at session time';
        } else if (record.status === 'Present') {
          statusText = 'Present';
          note = 'Recorded Present';
        } else {
          statusText = 'Absent';
          note = 'Recorded Absent';
        }
      } else {
        statusText = 'Absent';
        note = 'No record found';
      }

      return [session.date, session.activityName, statusText, note];
    });

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${member.title || ''}_${(member.name || '').replace(/\s+/g, '_')}_Attendance_History.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const percentColor = (pct: number) => {
    if (pct >= 90) return 'text-[#5A5A40]';
    if (pct >= 80) return 'text-[#5A5A40]';
    if (pct >= 60) return 'text-[#D4A373]';
    if (pct >= 50) return 'text-[#D4A373]';
    return 'text-[#B25E5E]';
  };

  const percentBg = (pct: number) => {
    if (pct >= 90) return 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
    if (pct >= 80) return 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
    if (pct >= 60) return 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';
    if (pct >= 50) return 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';
    return 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
  };

  return (
    <div id="member-details-container" className="space-y-6">
      {/* Navigation & Header */}
      {!isMemberOnlyView && onBack && (
        <button
          id="member-details-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7A7A66] hover:text-[#5A5A40] hover:bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Registry
        </button>
      )}

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 relative overflow-hidden">
        {/* Subtle decorative mesh */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FAF9F6] rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

        {/* Top Right Overall Combined Percentage - EXTREMELY LARGE TEXT */}
        <div className="absolute top-6 right-6 text-right">
          <p className="text-[10px] font-bold text-[#7A7A66] uppercase tracking-widest">
            Combined Attendance
          </p>
          <p
            id="combined-percentage-display"
            className={`text-5xl md:text-6xl font-extrabold tracking-tighter mt-1 ${percentColor(
              stats.combinedPercentage
            )}`}
          >
            {stats.combinedPercentage}%
          </p>
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 border ${percentBg(
              stats.combinedPercentage
            )}`}
          >
            {stats.combinedPercentage >= 90
              ? 'Excellent Standard'
              : stats.combinedPercentage >= 80
              ? 'Very Good Standard'
              : stats.combinedPercentage >= 60
              ? 'Good Standard'
              : stats.combinedPercentage >= 50
              ? 'Satisfactory'
              : 'Requires Improvement'}
          </span>
        </div>

        {/* Left Side: Avatar & Name */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Profile Image & Uploader */}
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#E6E4DD] relative">
                <img
                  id="member-uploaded-avatar"
                  src={avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {!isMemberOnlyView && (
                  <button
                    id="delete-avatar-btn"
                    onClick={handleRemoveAvatar}
                    className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4 text-[#B25E5E]" />
                  </button>
                )}
              </div>
            ) : (
              // Image avatar fallback with default color if no uploaded image
              <div
                id="member-avatar-fallback"
                className="w-24 h-24 rounded-2xl border-2 border-[#E6E4DD] flex items-center justify-center font-bold text-3xl shrink-0 bg-[#F5F2ED] text-[#5A5A40] shadow-inner"
              >
                {member.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Custom Image Upload Form Overlay */}
            {!isMemberOnlyView && (
              <label
                id="avatar-upload-label"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-lg flex items-center justify-center shadow-md cursor-pointer border border-[#4E4E37] transition-transform hover:scale-105"
                title="Upload Profile Image"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Name and Meta */}
          <div className="space-y-2 max-w-[calc(100%-120px)]">
            <h3 className="text-2xl font-serif font-bold tracking-tight text-[#3D3D33] leading-none">
              {member.title}. {member.name}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF9F6] text-[#7A7A66] border border-[#E6E4DD]">
                <User className="w-3 h-3 text-[#7A7A66]" />
                Role: {member.role.toUpperCase()}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#FAF9F6] text-[#5A5A40] border border-[#E6E4DD]">
                Access Code: {member.accessCode}
              </span>

              {/* Sickness logic trigger */}
              {onUpdateMember && (
                <button
                  id={`toggle-sick-details-btn-${member.id}`}
                  onClick={() => onUpdateMember(member.id, { isSick: !member.isSick })}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                    member.isSick
                      ? 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2] font-bold'
                      : 'bg-white text-[#7A7A66] border-[#E6E4DD] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {member.isSick ? (
                    <>
                      <Heart className="w-3 h-3 text-[#B25E5E] fill-[#B25E5E]" />
                      Status: Sick (Auto-Present)
                    </>
                  ) : (
                    <>
                      <HeartOff className="w-3 h-3 text-[#7A7A66]" />
                      Status: Active & Healthy
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-[11px] font-mono text-[#7A7A66]">
              Unique ID: {member.id} • Visibility: {member.isVisible ? 'Visible in sheet' : 'Hidden from sheet'}
            </p>
          </div>
        </div>
      </div>

      {/* Individual Attendance Activity Summary */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 space-y-4">
        <h4 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#5A5A40]" />
          Attendance Breakdown by Activity Type
        </h4>

        <div className="overflow-x-auto">
          <table id="member-attendance-breakdown" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-3 text-center">Sessions Held</th>
                <th className="py-3 px-3 text-center">Sessions Present</th>
                <th className="py-3 px-3 text-center">% Attendance</th>
                <th className="py-3 px-4">Performance Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E4DD] text-xs">
              {stats.summaries.map((summary) => {
                const isVeryHigh = summary.percentage >= 90;
                const isHigh = summary.percentage >= 80;
                const isMedium = summary.percentage >= 60;
                const isFair = summary.percentage >= 50;

                let badgeColor = 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
                if (isVeryHigh) badgeColor = 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
                else if (isHigh) badgeColor = 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
                else if (isMedium) badgeColor = 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';
                else if (isFair) badgeColor = 'bg-[#F5F2ED] text-[#D4A373] border-[#E6E4DD]';

                return (
                  <tr key={summary.activityId} id={`breakdown-row-${summary.activityId}`} className="hover:bg-[#FAF9F6]/30">
                    {/* Activity */}
                    <td className="py-3.5 px-4 font-bold text-[#3D3D33]">
                      {summary.activityName}
                    </td>

                    {/* No. Held */}
                    <td className="py-3.5 px-3 text-center font-semibold text-[#7A7A66]">
                      {summary.noHeld}
                    </td>

                    {/* No. Present */}
                    <td className="py-3.5 px-3 text-center font-semibold text-[#3D3D33]">
                      {summary.noPresent}
                    </td>

                    {/* % Attendance */}
                    <td className="py-3.5 px-3 text-center font-extrabold font-mono text-[#3D3D33]">
                      {summary.noHeld > 0 ? `${summary.percentage}%` : '—'}
                    </td>

                    {/* Remark */}
                    <td className="py-3.5 px-4">
                      {summary.noHeld > 0 ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {summary.remark}
                        </span>
                      ) : (
                        <span className="text-[#7A7A66] font-medium italic">
                          No sessions recorded yet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Chronological Session Attendance Log */}
      <div className="bg-white rounded-2xl border border-[#E6E4DD] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4DD] pb-3">
          <div>
            <h4 className="text-base font-serif font-bold text-[#3D3D33] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#5A5A40]" />
              Detailed Attendance History Log
            </h4>
            <p className="text-xs text-[#7A7A66]">
              Chronological log of held church services and recorded presence.
            </p>
          </div>
          <button
            onClick={handleExportIndividualCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#5A5A40] bg-[#FAF9F6] hover:bg-[#EAE6DF] border border-[#C8C8A9] rounded-xl transition-all cursor-pointer shadow-sm"
            title="Export individual attendance history to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export History (CSV)
          </button>
        </div>

        {sortedSessions.length === 0 ? (
          <div className="text-center py-8 text-[#7A7A66] text-xs">
            No history recorded yet for this member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E4DD] text-[11px] font-bold text-[#7A7A66] uppercase tracking-wider bg-[#FAF9F6]">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Service / Activity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4">Excused/Sick Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD] text-xs">
                {sortedSessions.map((session) => {
                  const record = session.records.find((r) => r.memberId === member.id);
                  let statusLabel = 'Absent';
                  let statusBadgeClass = 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
                  let detail = '—';

                  if (member.isSick) {
                    statusLabel = 'Excused (Sick)';
                    statusBadgeClass = 'bg-[#FDF2F2] text-[#D4A373] border-[#FAD2D2]';
                    detail = 'Auto-excused (Globally marked as sick)';
                  } else if (record) {
                    if (record.isSickAtTime) {
                      statusLabel = 'Excused (Sick)';
                      statusBadgeClass = 'bg-[#FAF9F6] text-[#D4A373] border-[#E6E4DD]';
                      detail = 'Excused at session time';
                    } else if (record.status === 'Present') {
                      statusLabel = 'Present';
                      statusBadgeClass = 'bg-[#FAF9F6] text-[#5A5A40] border-[#E6E4DD]';
                    } else {
                      statusLabel = 'Absent';
                      statusBadgeClass = 'bg-[#FDF2F2] text-[#B25E5E] border-[#FAD2D2]';
                    }
                  }

                  return (
                    <tr key={session.id} className="hover:bg-[#FAF9F6]/30">
                      <td className="py-3 px-4 font-mono font-medium text-[#7A7A66]">
                        {session.date}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#3D3D33]">
                        {session.activityName}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#7A7A66] italic">
                        {detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
