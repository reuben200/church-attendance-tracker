import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { Member, Activity, AttendanceSession, HouseFellowshipNotice } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)");

// Collection names
const MEMBERS_COLLECTION = 'members';
const ACTIVITIES_COLLECTION = 'activities';
const SESSIONS_COLLECTION = 'sessions';
const NOTICES_COLLECTION = 'notices';

/**
 * Members APIs
 */
export async function getMembersFromFirestore(): Promise<Member[]> {
  const querySnapshot = await getDocs(collection(db, MEMBERS_COLLECTION));
  const list: Member[] = [];
  querySnapshot.forEach((docSnap) => {
    list.push(docSnap.data() as Member);
  });
  return list;
}

export async function addMemberToFirestore(member: Member): Promise<void> {
  await setDoc(doc(db, MEMBERS_COLLECTION, member.id), member);
}

export async function updateMemberInFirestore(id: string, data: Partial<Member>): Promise<void> {
  await updateDoc(doc(db, MEMBERS_COLLECTION, id), data);
}

export async function deleteMemberFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERS_COLLECTION, id));
}

/**
 * Activities APIs
 */
export async function getActivitiesFromFirestore(): Promise<Activity[]> {
  const querySnapshot = await getDocs(collection(db, ACTIVITIES_COLLECTION));
  const list: Activity[] = [];
  querySnapshot.forEach((docSnap) => {
    list.push(docSnap.data() as Activity);
  });
  return list;
}

export async function addActivityToFirestore(activity: Activity): Promise<void> {
  await setDoc(doc(db, ACTIVITIES_COLLECTION, activity.id), activity);
}

export async function updateActivityInFirestore(id: string, data: Partial<Activity>): Promise<void> {
  await updateDoc(doc(db, ACTIVITIES_COLLECTION, id), data);
}

export async function deleteActivityFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, ACTIVITIES_COLLECTION, id));
}

/**
 * Sessions APIs
 */
export async function getSessionsFromFirestore(): Promise<AttendanceSession[]> {
  const querySnapshot = await getDocs(collection(db, SESSIONS_COLLECTION));
  const list: AttendanceSession[] = [];
  querySnapshot.forEach((docSnap) => {
    list.push(docSnap.data() as AttendanceSession);
  });
  return list;
}

export async function addSessionToFirestore(session: AttendanceSession): Promise<void> {
  await setDoc(doc(db, SESSIONS_COLLECTION, session.id), session);
}

export async function updateSessionInFirestore(id: string, data: Partial<AttendanceSession>): Promise<void> {
  await updateDoc(doc(db, SESSIONS_COLLECTION, id), data);
}

export async function deleteSessionFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, SESSIONS_COLLECTION, id));
}

/**
 * Noticeboard APIs
 */
export async function getHouseFellowshipNoticeFromFirestore(): Promise<HouseFellowshipNotice | null> {
  const querySnapshot = await getDocs(collection(db, NOTICES_COLLECTION));
  let notice: HouseFellowshipNotice | null = null;
  querySnapshot.forEach((docSnap) => {
    if (docSnap.id === 'house_fellowship') {
      notice = docSnap.data() as HouseFellowshipNotice;
    }
  });
  return notice;
}

export async function saveHouseFellowshipNoticeInFirestore(notice: HouseFellowshipNotice): Promise<void> {
  await setDoc(doc(db, NOTICES_COLLECTION, 'house_fellowship'), notice);
}
