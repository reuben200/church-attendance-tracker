import { useState, useEffect } from 'react';
import { Member, Activity, AttendanceSession, UserRole, AttendanceRecord, MemberTitle, HouseFellowshipNotice } from './types';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberManagement } from './components/MemberManagement';
import { AttendanceTaking } from './components/AttendanceTaking';
import { MemberDetails } from './components/MemberDetails';
import { SettingsPage } from './components/SettingsPage';
import { GoogleSyncPanel } from './components/GoogleSyncPanel';
import { NoticeboardCard } from './components/NoticeboardCard';
import { getCachedToken, syncToSpreadsheet, initAuth } from './utils/googleWorkspace';
import {
  getMembersFromFirestore,
  addMemberToFirestore,
  updateMemberInFirestore,
  deleteMemberFromFirestore,
  getActivitiesFromFirestore,
  addActivityToFirestore,
  updateActivityInFirestore,
  deleteActivityFromFirestore,
  getSessionsFromFirestore,
  addSessionToFirestore,
  updateSessionInFirestore,
  deleteSessionFromFirestore,
  getHouseFellowshipNoticeFromFirestore,
  saveHouseFellowshipNoticeInFirestore
} from './lib/firebase';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Settings,
  User,
  Shield,
  Activity as ActivityIcon,
  HelpCircle,
  Clock,
  Heart,
  LogOut,
  Key
} from 'lucide-react';

export default function App() {
  // --- 1. State Initialization with Real Firestore sync ---
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [notice, setNotice] = useState<HouseFellowshipNotice | null>(null);
  const [loading, setLoading] = useState(true);

  // Real Authentic Role & Portal Access State
  const [currentRole, setCurrentRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('church_user_role') || sessionStorage.getItem('church_user_role');
    return saved ? (saved as UserRole) : null;
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => {
    return localStorage.getItem('church_user_member_id') || sessionStorage.getItem('church_user_member_id');
  });

  // --- Real-Time Sync & Initialization from Firestore ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Step 1: Fetch collections from Firestore
        const [dbMembers, dbActivities, dbSessions, dbNotice] = await Promise.all([
          getMembersFromFirestore(),
          getActivitiesFromFirestore(),
          getSessionsFromFirestore(),
          getHouseFellowshipNoticeFromFirestore()
        ]);

        // Step 3: Populate React client state
        setMembers(dbMembers);
        setActivities(dbActivities);
        setSessions(dbSessions);
        setNotice(dbNotice);
      } catch (err) {
        console.error('Error fetching data from Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateNotice = async (updatedNotice: HouseFellowshipNotice) => {
    try {
      await saveHouseFellowshipNoticeInFirestore(updatedNotice);
      setNotice(updatedNotice);
    } catch (err) {
      console.error('Error updating noticeboard notice:', err);
      throw err;
    }
  };

  const handleLogin = (role: UserRole, memberId: string | null, rememberMe: boolean) => {
    setCurrentRole(role);
    setSelectedMemberId(memberId);
    if (rememberMe) {
      localStorage.setItem('church_user_role', role);
      if (memberId) {
        localStorage.setItem('church_user_member_id', memberId);
      }
      sessionStorage.removeItem('church_user_role');
      sessionStorage.removeItem('church_user_member_id');
    } else {
      sessionStorage.setItem('church_user_role', role);
      if (memberId) {
        sessionStorage.setItem('church_user_member_id', memberId);
      }
      localStorage.removeItem('church_user_role');
      localStorage.removeItem('church_user_member_id');
    }
  };

  const handleSignOut = () => {
    setCurrentRole(null);
    setSelectedMemberId(null);
    setSelectedDetailMember(null);
    localStorage.removeItem('church_user_role');
    localStorage.removeItem('church_user_member_id');
    sessionStorage.removeItem('church_user_role');
    sessionStorage.removeItem('church_user_member_id');
  };

  // Navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry' | 'rollcall' | 'settings'>('dashboard');
  const [selectedDetailMember, setSelectedDetailMember] = useState<Member | null>(null);

  // --- Google Auth Initialization ---
  useEffect(() => {
    initAuth();
  }, []);

  // --- Google Sheets Real-Time Sync Effect ---
  useEffect(() => {
    const spreadsheetId = localStorage.getItem('google_spreadsheet_id');
    const realTimeSyncEnabled = localStorage.getItem('google_realtime_sync') !== 'false';
    const token = getCachedToken();
    if (token && spreadsheetId && realTimeSyncEnabled && !loading) {
      syncToSpreadsheet(token, spreadsheetId, members, activities, sessions).catch((e) => {
        console.error('Real-Time Sync Error:', e);
      });
    }
  }, [members, activities, sessions, loading]);

  // Adjust view when role changes
  useEffect(() => {
    if (currentRole === 'Member') {
      setSelectedDetailMember(null); // Managed by direct viewport binding
    } else {
      // Return to dashboard when switching to Admin/Secretary
      setActiveTab('dashboard');
    }
  }, [currentRole]);

  // --- 3. Member Handlers ---
  const handleAddMember = async (
    title: MemberTitle,
    name: string,
    isSick: boolean,
    isVisible: boolean
  ) => {
    // Generate unique 7-digit alphanumeric code
    let accessCode = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    while (!isUnique) {
      let code = '';
      for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!members.some((m) => m.accessCode === code)) {
        accessCode = code;
        isUnique = true;
      }
    }

    const newMember: Member = {
      id: `m_${Date.now()}`,
      title,
      name,
      isSick,
      isVisible,
      role: 'member',
      accessCode,
    };

    try {
      await addMemberToFirestore(newMember);
      setMembers((prev) => [...prev, newMember]);
    } catch (err) {
      console.error('Error adding member to firestore:', err);
    }
  };

  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    try {
      await updateMemberInFirestore(id, updates);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
      // Sync in-view details if the edited member is currently viewed
      if (selectedDetailMember && selectedDetailMember.id === id) {
        setSelectedDetailMember((prev) => (prev ? { ...prev, ...updates } : null));
      }
    } catch (err) {
      console.error('Error updating member in firestore:', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteMemberFromFirestore(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (selectedDetailMember && selectedDetailMember.id === id) {
        setSelectedDetailMember(null);
      }
    } catch (err) {
      console.error('Error deleting member from firestore:', err);
    }
  };

  // --- 4. Activity Handlers ---
  const handleAddActivity = async (name: string, dayOfWeek: string) => {
    const newAct: Activity = {
      id: `a_${Date.now()}`,
      name,
      dayOfWeek,
    };
    try {
      await addActivityToFirestore(newAct);
      setActivities((prev) => [...prev, newAct]);
    } catch (err) {
      console.error('Error adding activity to firestore:', err);
    }
  };

  const handleUpdateActivity = async (id: string, name: string, dayOfWeek: string) => {
    try {
      await updateActivityInFirestore(id, { name, dayOfWeek });
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name, dayOfWeek } : a))
      );
    } catch (err) {
      console.error('Error updating activity in firestore:', err);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteActivityFromFirestore(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error deleting activity from firestore:', err);
    }
  };

  // --- 5. Attendance Session Handlers ---
  const handleSaveSession = async (activityId: string, date: string, records: AttendanceRecord[]) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    // Check if a session already exists for this activity and date - if so, overwrite it
    const existingIndex = sessions.findIndex((s) => s.activityId === activityId && s.date === date);

    const newSession: AttendanceSession = {
      id: existingIndex >= 0 ? sessions[existingIndex].id : `s_${Date.now()}`,
      activityId,
      activityName: activity.name,
      date,
      records,
    };

    try {
      await addSessionToFirestore(newSession);
      setSessions((prev) => {
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = newSession;
          return copy;
        } else {
          return [...prev, newSession];
        }
      });
    } catch (err) {
      console.error('Error saving session to firestore:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSessionFromFirestore(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session from firestore:', err);
    }
  };

  // --- 6. Active Member lookup for simulated Member viewpoint ---
  const activeSimulatedMember = members.find((m) => m.id === selectedMemberId);

  // --- 7. Layout and View Filtering ---
  const renderTabNavigation = () => {
    if (currentRole === 'Member') return null; // No tabs for members

    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'registry', label: 'Member Registry', icon: Users },
      { id: 'rollcall', label: 'Take Attendance', icon: ClipboardCheck },
    ];

    // Settings page is Admin ONLY
    if (currentRole === 'Admin') {
      tabs.push({ id: 'settings', label: 'Settings', icon: Settings });
    }

    return (
      <div className="flex border-b border-[#E6E4DD] bg-[#FAF9F6] shadow-sm overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !selectedDetailMember;
          return (
            <button
              key={tab.id}
              id={`tab-nav-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedDetailMember(null);
              }}
              className={`flex items-center gap-2 py-4 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#5A5A40] text-[#5A5A40] bg-white font-bold'
                  : 'border-transparent text-[#7A7A66] hover:text-[#3D3D33] hover:bg-[#FAF9F6]/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#E6E4DD] border-t-[#5A5A40] rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#5A5A40] font-sans">
              Connecting to Registry
            </h3>
            <p className="text-xs text-[#7A7A66] font-sans">
              Synchronizing with real-time church cloud database...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#3D3D33] font-sans flex flex-col antialiased">
        <LoginPage
          members={members}
          onLogin={handleLogin}
        />
        <footer className="bg-white border-t border-[#E6E4DD] py-5 text-center mt-auto">
          <p className="text-xs text-[#7A7A66] font-sans">
            Igbe Church of Christ Attendance Tracker • Secure Local Congregation Management • Standard UTC Time Sandbox
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#3D3D33] font-sans flex flex-col antialiased">
      {/* 1. Real Authenticated Header */}
      <header id="header-auth" className="bg-[#5A5A40] text-white border-b border-[#4E4E37] px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#4E4E37] rounded-lg border border-white/10 w-10 h-10 overflow-hidden flex items-center justify-center">
            <img 
              src="/pwa_icon_512.jpg" 
              alt="Igbe Logo" 
              className="w-full h-full object-cover rounded-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xs md:text-sm font-serif font-bold tracking-wider text-white">
              IGBE CHURCH OF CHRIST
            </h1>
            <p className="text-[10px] md:text-xs font-sans text-[#C8C8A9] tracking-tight font-medium">
              Attendance & Registry Tracker Portal
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-[#4E4E37]/50 pt-2 sm:pt-0">
          {/* User Role Badge */}
          <div className="flex items-center gap-2">
            {currentRole === 'Admin' && (
              <span className="flex items-center gap-1.5 bg-[#D4A373] text-[#3D3D33] px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                <Shield className="w-3.5 h-3.5" />
                Admin Workspace
              </span>
            )}
            {currentRole === 'Secretary' && (
              <span className="flex items-center gap-1.5 bg-white text-[#5A5A40] px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                <Key className="w-3.5 h-3.5" />
                Secretary Workspace
              </span>
            )}
            {currentRole === 'Member' && activeSimulatedMember && (
              <span className="flex items-center gap-1.5 bg-[#4E4E37] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-white/5">
                <User className="w-3.5 h-3.5 text-[#D4A373]" />
                {activeSimulatedMember.title}. {activeSimulatedMember.name} (Member)
              </span>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 bg-[#4E4E37] hover:bg-[#3D3D33] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide text-white transition-all cursor-pointer shadow-sm animate-pulse-subtle"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. Primary Navigation Tabs (Only for Admin & Secretary) */}
      {renderTabNavigation()}

      {/* 3. Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Render Viewport */}
        {currentRole === 'Member' ? (
          // Authenticated Member View: ONLY can access their own record
          activeSimulatedMember ? (
            <div className="space-y-4">
              <div className="bg-[#5A5A40] text-white p-5 rounded-2xl shadow-sm space-y-1">
                <h3 className="text-lg font-serif font-bold">
                  Welcome back, {activeSimulatedMember.title}. {activeSimulatedMember.name}!
                </h3>
                <p className="text-xs text-[#FAF9F6]/90 leading-relaxed">
                  You are logged into your personalized Member dashboard. You have exclusive access to review your attendance details, performance indexes, and sick leave records.
                </p>
              </div>

              <NoticeboardCard
                members={members}
                notice={notice}
                onUpdateNotice={handleUpdateNotice}
                currentRole={currentRole}
                currentActorName={`${activeSimulatedMember.title}. ${activeSimulatedMember.name}`}
              />

              <MemberDetails
                member={activeSimulatedMember}
                activities={activities}
                sessions={sessions}
                isMemberOnlyView={true}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E6E4DD] p-12 text-center text-[#7A7A66] text-sm font-medium space-y-4">
              <p>Your member profile could not be retrieved from the active congregation registry.</p>
              <button
                onClick={() => {
                  setCurrentRole(null);
                  setSelectedMemberId(null);
                }}
                className="inline-flex items-center gap-1.5 bg-[#5A5A40] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#4E4E37]"
              >
                Return to Login
              </button>
            </div>
          )
        ) : (
          // Admin & Secretary Workspace views
          <div className="space-y-4">
            {selectedDetailMember ? (
              // Shared Member details subview
              <MemberDetails
                member={selectedDetailMember}
                activities={activities}
                sessions={sessions}
                onBack={() => setSelectedDetailMember(null)}
                onUpdateMember={handleUpdateMember}
                isMemberOnlyView={false}
              />
            ) : (
              // Standard primary tabs
              <>
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <NoticeboardCard
                      members={members}
                      notice={notice}
                      onUpdateNotice={handleUpdateNotice}
                      currentRole={currentRole}
                      currentActorName={
                        activeSimulatedMember
                          ? `${activeSimulatedMember.title}. ${activeSimulatedMember.name}`
                          : undefined
                      }
                    />

                    <AdminDashboard
                      members={members}
                      activities={activities}
                      sessions={sessions}
                    />
                    {currentRole === 'Admin' && (
                      <GoogleSyncPanel
                        members={members}
                        activities={activities}
                        sessions={sessions}
                        onImportData={(imported) => {
                          setMembers(imported.members);
                          setActivities(imported.activities);
                          setSessions(imported.sessions);
                        }}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'registry' && (
                  <MemberManagement
                    members={members}
                    onAddMember={handleAddMember}
                    onUpdateMember={handleUpdateMember}
                    onDeleteMember={handleDeleteMember}
                    onSelectMember={(m) => setSelectedDetailMember(m)}
                  />
                )}

                {activeTab === 'rollcall' && (
                  <AttendanceTaking
                    members={members}
                    activities={activities}
                    sessions={sessions}
                    onSaveSession={handleSaveSession}
                    onDeleteSession={handleDeleteSession}
                    onUpdateMember={handleUpdateMember}
                  />
                )}

                {activeTab === 'settings' && currentRole === 'Admin' && (
                  <SettingsPage
                    activities={activities}
                    onAddActivity={handleAddActivity}
                    onUpdateActivity={handleUpdateActivity}
                    onDeleteActivity={handleDeleteActivity}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-[#E6E4DD] py-5 text-center mt-auto">
        <p className="text-xs text-[#7A7A66] font-sans">
          Igbe Church of Christ Attendance Tracker • Secure Local Congregation Management • Standard UTC Time Sandbox
        </p>
      </footer>
    </div>
  );
}
