import React, { useState } from 'react';
import { Member, HouseFellowshipNotice, UserRole } from '../types';
import { Cake, Calendar, Clock, MapPin, User, Edit3, Megaphone, Check, X, Sparkles, Bell } from 'lucide-react';

// Helper to convert date to YYYY-MM-DD
const toYYYYMMDD = (dateStr: string): string => {
  if (!dateStr) return '';
  const reg = /^\d{4}-\d{2}-\d{2}$/;
  if (reg.test(dateStr)) return dateStr;
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {}
  
  return '';
};

// Helper to format date nicely for human display
const formatDateNicely = (dateStr: string): string => {
  if (!dateStr) return '';
  const reg = /^\d{4}-\d{2}-\d{2}$/;
  if (reg.test(dateStr)) {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  }
  return dateStr;
};

interface NoticeboardCardProps {
  members: Member[];
  notice: HouseFellowshipNotice | null;
  onUpdateNotice: (notice: HouseFellowshipNotice) => Promise<void>;
  currentRole: UserRole;
  currentActorName?: string; // name of logged-in admin or secretary
}

export const NoticeboardCard: React.FC<NoticeboardCardProps> = ({
  members,
  notice,
  onUpdateNotice,
  currentRole,
  currentActorName,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [topic, setTopic] = useState(notice?.topic || '');
  const [date, setDate] = useState(toYYYYMMDD(notice?.date || ''));
  const [time, setTime] = useState(notice?.time || '5:00 PM');
  const [host, setHost] = useState(notice?.host || 'To be Announced');
  const [address, setAddress] = useState(notice?.address || '');
  const [saving, setSaving] = useState(false);

  // Initialize form fields when notice loads or editing starts
  React.useEffect(() => {
    if (notice) {
      setTopic(notice.topic || '');
      setDate(toYYYYMMDD(notice.date));
      setTime(notice.time || '5:00 PM');
      setHost(notice.host || 'To be Announced');
      setAddress(notice.address);
    }
  }, [notice, isEditing]);

  const canEdit = currentRole === 'Admin' || currentRole === 'Secretary';

  // Calculate Birthdays (Today & Tomorrow)
  const getTodayAndTomorrowMMDD = () => {
    const today = new Date();
    const format = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}-${dd}`;
    };

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return {
      todayStr: format(today),
      tomorrowStr: format(tomorrow),
    };
  };

  const { todayStr, tomorrowStr } = getTodayAndTomorrowMMDD();

  // Filter members (only visible ones to be safe, or all active members)
  const birthdaysToday = members.filter((m) => m.birthday === todayStr);
  const birthdaysTomorrow = members.filter((m) => m.birthday === tomorrowStr);

  const hasBirthdays = birthdaysToday.length > 0 || birthdaysTomorrow.length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !date.trim() || !time.trim() || !host.trim() || !address.trim()) {
      alert('Please fill out all house fellowship fields');
      return;
    }

    setSaving(true);
    try {
      const updated: HouseFellowshipNotice = {
        id: 'house_fellowship',
        topic: topic.trim(),
        date: date.trim(),
        time: time.trim(),
        host: host.trim(),
        address: address.trim(),
        lastUpdatedBy: currentActorName || currentRole,
      };
      await onUpdateNotice(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update noticeboard:', err);
      alert('Failed to save notice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="noticeboard-card" className="bg-white rounded-2xl border border-[#C8C8A9] shadow-md overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#E6E4DD]">
      
      {/* SECTION 1: BIRTHDAY NOTIFICATIONS */}
      <div className="flex-1 p-5 space-y-4 bg-gradient-to-br from-[#FAF9F6] to-white">
        <div className="flex items-center gap-2 pb-2.5 border-b border-[#E6E4DD]">
          <div className="p-1.5 bg-[#FDF2F2] border border-[#FAD2D2] rounded-lg text-[#B25E5E]">
            <Cake className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-serif font-bold text-[#3D3D33] tracking-tight">
              Congregation Birthdays
            </h4>
            <p className="text-[10px] text-[#7A7A66] font-medium">
              Real-time daily birthday countdown tracker
            </p>
          </div>
        </div>

        {hasBirthdays ? (
          <div className="space-y-3">
            {/* Birthdays Today */}
            {birthdaysToday.length > 0 && (
              <div className="p-3.5 bg-[#FDF2F2]/60 border border-[#FAD2D2]/80 rounded-xl space-y-1.5 shadow-sm">
                <p className="text-[10px] font-extrabold text-[#B25E5E] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Celebrating Today!
                </p>
                <div className="space-y-1">
                  {birthdaysToday.map((m) => (
                    <p key={m.id} className="text-sm font-bold text-[#3D3D33]">
                      🎉 {m.title}. {m.name}
                    </p>
                  ))}
                </div>
                <p className="text-[10px] text-[#7A7A66] italic">
                  Let us celebrate together and thank God for their lives!
                </p>
              </div>
            )}

            {/* Birthdays Tomorrow (a day to the birthday) */}
            {birthdaysTomorrow.length > 0 && (
              <div className="p-3.5 bg-[#F5F2ED]/60 border border-[#E6E4DD] rounded-xl space-y-1.5 shadow-sm">
                <p className="text-[10px] font-extrabold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-[#D4A373]" />
                  Birthday Tomorrow
                </p>
                <div className="space-y-1">
                  {birthdaysTomorrow.map((m) => (
                    <p key={m.id} className="text-sm font-bold text-[#3D3D33]">
                      🎂 {m.title}. {m.name}
                    </p>
                  ))}
                </div>
                <p className="text-[10px] text-[#7A7A66]">
                  Notification sent to all. Get ready to celebrate them tomorrow!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-1">
            <p className="text-xs font-semibold text-[#7A7A66]">
              No birthdays today or tomorrow.
            </p>
            <p className="text-[10px] text-[#9A9A88]">
              Up next: keep checking the notices for the next celebrating member!
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: HOUSE FELLOWSHIP NOTICEBOARD */}
      <div className="flex-1 p-5 space-y-4 bg-gradient-to-br from-white to-[#FAF9F6]">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg text-[#5A5A40]">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-serif font-bold text-[#3D3D33] tracking-tight">
                Next House Fellowship Notice
              </h4>
              <p className="text-[10px] text-[#7A7A66] font-medium">
                Official bulletin board managed by the Secretary
              </p>
            </div>
          </div>

          {canEdit && !isEditing && (
            <button
              id="edit-fellowship-notice-btn"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#5A5A40] bg-[#F5F2ED] hover:bg-[#E6E4DD] border border-[#C8C8A9] rounded-lg transition-all cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              Update Bulletin
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                Host
              </label>
              <select
                id="notice-topic-select"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40] cursor-pointer"
                required
              >
                <option value="">Select Host</option>
                {members.map((m) => (
                  <option key={m.id} value={`${m.title}. ${m.name}`}>
                    {m.title}. {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Date (Calendar Picker)
                </label>
                <input
                  id="notice-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Time
                </label>
                <input
                  id="notice-time-input"
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 5:00 PM"
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Moderator
                </label>
                <select
                  id="notice-host-select"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40] cursor-pointer"
                  required
                >
                  <option value="To be Announced">To be Announced</option>
                  {members.map((m) => (
                    <option key={m.id} value={`${m.title}. ${m.name}`}>
                      {m.title}. {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#7A7A66] uppercase tracking-wider mb-1">
                  Fellowship Center Address
                </label>
                <input
                  id="notice-address-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Fellowship center physical address"
                  className="w-full text-xs px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[#3D3D33] focus:outline-none focus:border-[#5A5A40]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E4DD]">
              <button
                id="cancel-notice-btn"
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-[10px] font-bold text-[#7A7A66] hover:bg-[#F5F2ED] border border-[#E6E4DD] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-notice-btn"
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-[10px] font-bold text-white bg-[#5A5A40] hover:bg-[#4E4E37] rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save Notice'}
              </button>
            </div>
          </form>
        ) : notice ? (
          <div className="space-y-3.5">
            <div className="bg-[#FAF9F6] border border-[#E6E4DD] p-3 rounded-xl shadow-inner space-y-1">
              <span className="text-[9px] font-extrabold uppercase bg-[#5A5A40] text-white px-1.5 py-0.5 rounded font-mono">
                Host
              </span>
              <h5 className="text-sm font-bold text-[#3D3D33] pt-0.5">
                {notice.topic}
              </h5>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Date</p>
                  <p className="text-xs font-bold text-[#3D3D33]">{formatDateNicely(notice.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Time</p>
                  <p className="text-xs font-bold text-[#3D3D33]">{notice.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Moderator</p>
                  <p className="text-xs font-bold text-[#3D3D33]">{notice.host || 'To be Announced'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#5A5A40] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-[#7A7A66] tracking-wider">Address</p>
                  <p className="text-xs font-bold text-[#3D3D33] line-clamp-2" title={notice.address}>
                    {notice.address}
                  </p>
                </div>
              </div>
            </div>

            {notice.lastUpdatedBy && (
              <p className="text-[9px] text-[#7A7A66] text-right font-mono italic">
                Last updated by: {notice.lastUpdatedBy}
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-[#7A7A66]">No active House Fellowship notice available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
