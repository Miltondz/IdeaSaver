
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import type { Recording } from "@/types";

const RECORDINGS_KEY = "voice-note-recordings";
const SETTINGS_KEY = "voice-note-settings";

type DeletionPolicy = "never" | "7" | "15" | "30";
export interface AppSettings {
  isPro: boolean;
  deletionPolicy: DeletionPolicy;
  trelloApiKey: string;
  trelloToken: string;
  aiApiKey: string;
  aiModel: string;
  cloudSyncEnabled: boolean;
  autoCloudSync: boolean;
}

// --- LocalStorage Helper Functions ---

const _getRecordingsFromStorage = (userId: string | null): Recording[] => {
  if (typeof window === "undefined" || !userId) return [];
  const data = localStorage.getItem(`${RECORDINGS_KEY}_${userId}`);
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing recordings from localStorage:", error);
    return [];
  }
};

export const getLocalRecordings = _getRecordingsFromStorage;

const _saveRecordingsToStorage = (recordings: Recording[], userId: string | null): void => {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${RECORDINGS_KEY}_${userId}`, JSON.stringify(recordings));
  } catch (error) {
    console.error("Error saving recordings to localStorage. Data may be too large.", error);
    // Potentially notify the user that storage is full
  }
};


// --- Public API for Storage ---

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { 
      isPro: false,
      deletionPolicy: "never",
      trelloApiKey: "",
      trelloToken: "",
      aiApiKey: "",
      aiModel: "gemini-2.0-flash",
      cloudSyncEnabled: false,
      autoCloudSync: false,
    };
  }
  const data = localStorage.getItem(SETTINGS_KEY);
  const defaults: AppSettings = { 
      isPro: false,
      deletionPolicy: "never",
      trelloApiKey: "",
      trelloToken: "",
      aiApiKey: "",
      aiModel: "gemini-2.0-flash",
      cloudSyncEnabled: false,
      autoCloudSync: false,
  };
  return data ? { ...defaults, ...JSON.parse(data) } : defaults;
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Dispatch a storage event to notify other tabs/windows
  window.dispatchEvent(new Event('storage'));
}

// --- Firestore Functions ---
export async function saveRecordingToDB(recording: Recording): Promise<void> {
  const settings = getSettings();
  if (!settings.cloudSyncEnabled || !db) {
    console.log("Cloud Sync is disabled. Skipping Firestore save.");
    return;
  }
  try {
    const docRef = doc(db, "recordings", recording.id);
    await setDoc(docRef, recording, { merge: true });
    console.log("Recording saved to Firestore with ID: ", recording.id);
  } catch (error) {
    console.error("Error adding document to Firestore: ", error);
    throw new Error("Failed to save recording to database.");
  }
}

export async function deleteRecordingFromDB(id: string): Promise<void> {
  const settings = getSettings();
  if (!settings.cloudSyncEnabled || !db) {
    return;
  }
  try {
    await deleteDoc(doc(db, "recordings", id));
  } catch (error) {
    console.error("Error deleting document from Firestore: ", error);
    throw error;
  }
}


// --- Hybrid Functions (Local Storage + Firestore) ---
export async function getRecordings(userId: string): Promise<Recording[]> {
  const { cloudSyncEnabled } = getSettings();

  if (cloudSyncEnabled && db) {
    try {
      const q = query(collection(db, "recordings"), where("userId", "==", userId), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const recordings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recording));
      // Sync local storage with what's in the cloud
      _saveRecordingsToStorage(recordings, userId);
      return recordings;
    } catch (error) {
      console.error("Error fetching from Firestore, falling back to local storage.", error);
      return Promise.resolve(_getRecordingsFromStorage(userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  } else {
    const recordings = _getRecordingsFromStorage(userId);
    recordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.resolve(recordings);
  }
}

export async function getRecording(id: string, userId: string): Promise<Recording | undefined> {
  const { cloudSyncEnabled } = getSettings();
  if (cloudSyncEnabled && db) {
      try {
        const docRef = doc(db, "recordings", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().userId === userId) {
          return { id: docSnap.id, ...docSnap.data() } as Recording;
        }
      } catch (error) {
        console.error("Error fetching doc from Firestore, falling back to local", error);
      }
  }
  // Fallback to local storage if not found in DB or if DB is disabled
  const recordings = _getRecordingsFromStorage(userId);
  return Promise.resolve(recordings.find(rec => rec.id === id));
}

export async function saveRecording(data: Omit<Recording, 'id' | 'date' | 'userId'>, userId: string): Promise<Recording> {
  const settings = getSettings();
  
  const newRecording: Recording = {
    id: new Date().getTime().toString(),
    userId: userId,
    ...data,
    date: new Date().toISOString(),
  };

  const recordings = _getRecordingsFromStorage(userId);
  
  // Always save to local storage first
  _saveRecordingsToStorage([...recordings, newRecording], userId);
  
  if (settings.cloudSyncEnabled && settings.autoCloudSync) {
    await saveRecordingToDB(newRecording);
  }
  
  return Promise.resolve(newRecording);
}

export async function updateRecording(recording: Recording, userId: string): Promise<Recording> {
  const settings = getSettings();
  
  let recordings = _getRecordingsFromStorage(userId);
  const index = recordings.findIndex(r => r.id === recording.id);

  if (index !== -1) {
    recordings[index] = recording;
  } else {
    recordings.push(recording);
  }
  _saveRecordingsToStorage(recordings, userId);

  if (settings.cloudSyncEnabled && db) {
    try {
      await saveRecordingToDB(recording);
    } catch (error) {
      console.error("Error updating document in Firestore: ", error);
    }
  }
  
  return recording;
}


export async function deleteRecording(id: string, userId: string): Promise<void> {
  const recordings = _getRecordingsFromStorage(userId);
  const updatedRecordings = recordings.filter(rec => rec.id !== id);
  _saveRecordingsToStorage(updatedRecordings, userId);

  await deleteRecordingFromDB(id).catch(err => console.error("Could not delete from DB", err));

  return Promise.resolve();
}

export async function applyDeletions(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  const { deletionPolicy, cloudSyncEnabled } = getSettings();
  if (deletionPolicy === "never") {
    return;
  }

  const daysToKeep = parseInt(deletionPolicy, 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  if (cloudSyncEnabled && db) {
      try {
          const q = query(collection(db, "recordings"), where("userId", "==", userId));
          const querySnapshot = await getDocs(q);
          const recordingsToDelete = querySnapshot.docs
              .map(d => ({ id: d.id, ...d.data() } as Recording))
              .filter(rec => new Date(rec.date).getTime() < cutoffDate.getTime());
          
          if (recordingsToDelete.length > 0) {
              console.log(`Auto-deleting ${recordingsToDelete.length} old recordings from cloud.`);
              const batch = writeBatch(db);
              recordingsToDelete.forEach(rec => batch.delete(doc(db, 'recordings', rec.id)));
              await batch.commit();
          }
      } catch (err) {
          console.error("Error applying deletions to Firestore", err);
      }
  }
  
  const localRecordings = _getRecordingsFromStorage(userId);
  const recordingsToKeep = localRecordings.filter(rec => new Date(rec.date).getTime() >= cutoffDate.getTime());
  
  if (localRecordings.length !== recordingsToKeep.length) {
      console.log(`Auto-deleting ${localRecordings.length - recordingsToKeep.length} old recordings from local storage.`);
      _saveRecordingsToStorage(recordingsToKeep, userId);
  }
}
