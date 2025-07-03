import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Recording } from "@/types";

const RECORDINGS_COLLECTION = "recordings";
const SETTINGS_KEY = "voice-note-settings";

type DeletionPolicy = "never" | "7" | "15" | "30";
interface AppSettings {
  deletionPolicy: DeletionPolicy;
}

// Recordings are now in Firestore
export async function getRecordings(): Promise<Recording[]> {
  if (typeof window === "undefined") return [];
  try {
    const recordingsCol = collection(db, RECORDINGS_COLLECTION);
    const q = query(recordingsCol, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const recordings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recording));
    return recordings;
  } catch (error) {
    console.error("Error fetching recordings: ", error);
    // Returning empty array and letting toast handle user notification
    return [];
  }
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const docRef = doc(db, RECORDINGS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Recording;
    } else {
      console.log("No such document!");
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching recording: ", error);
    return undefined;
  }
}

export async function saveRecording(data: Omit<Recording, 'id' | 'date'>): Promise<Recording> {
  const newRecordingData = {
    ...data,
    date: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, RECORDINGS_COLLECTION), newRecordingData);
    return { id: docRef.id, ...newRecordingData };
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error("Failed to save recording to the database.");
  }
}

export async function deleteRecording(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RECORDINGS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw new Error("Failed to delete recording from the database.");
  }
}


// Settings remain in localStorage for now
export function getSettings(): AppSettings {
  if (typeof window === "undefined") return { deletionPolicy: "never" };
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { deletionPolicy: "never" };
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function applyDeletions(): Promise<void> {
  if (typeof window === "undefined") return;

  const { deletionPolicy } = getSettings();
  if (deletionPolicy === "never") {
    return;
  }

  const daysToKeep = parseInt(deletionPolicy, 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffISO = cutoffDate.toISOString();

  try {
    const recordingsCol = collection(db, RECORDINGS_COLLECTION);
    const q = query(recordingsCol, where("date", "<", cutoffISO));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Auto-deleted ${querySnapshot.size} old recordings.`);
  } catch (error) {
    console.error("Error applying deletions: ", error);
  }
}
