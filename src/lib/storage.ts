import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Recording } from "@/types";

const RECORDINGS_KEY = "voice-note-recordings";
const SETTINGS_KEY = "voice-note-settings";

type DeletionPolicy = "never" | "7" | "15" | "30";
export interface AppSettings {
  deletionPolicy: DeletionPolicy;
  trelloApiKey: string;
  trelloToken: string;
  geminiApiKey: string;
  dbIntegrationEnabled: boolean;
  autoSendToDB: boolean;
}

// --- LocalStorage Helper Functions ---

const _getRecordingsFromStorage = (): Recording[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(RECORDINGS_KEY);
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing recordings from localStorage:", error);
    return [];
  }
};

const _saveRecordingsToStorage = (recordings: Recording[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings));
};


// --- Public API for Storage ---

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { 
      deletionPolicy: "never",
      trelloApiKey: "",
      trelloToken: "",
      geminiApiKey: "",
      dbIntegrationEnabled: false,
      autoSendToDB: false,
    };
  }
  const data = localStorage.getItem(SETTINGS_KEY);
  const defaults = { 
      deletionPolicy: "never",
      trelloApiKey: "",
      trelloToken: "",
      geminiApiKey: "",
      dbIntegrationEnabled: false,
      autoSendToDB: false,
  };
  return data ? { ...defaults, ...JSON.parse(data) } : defaults;
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- Firestore Functions ---
export async function saveRecordingToDB(recording: Omit<Recording, 'audioDataUri'>): Promise<void> {
  const settings = getSettings();
  if (!settings.dbIntegrationEnabled || !db) {
    console.log("DB integration is disabled. Skipping Firestore save.");
    return;
  }
  try {
    const docRef = doc(db, "recordings", recording.id);
    await setDoc(docRef, recording);
    console.log("Recording saved to Firestore with ID: ", recording.id);
  } catch (error) {
    console.error("Error adding document to Firestore: ", error);
    throw new Error("Failed to save recording to database.");
  }
}

export async function deleteRecordingFromDB(id: string): Promise<void> {
  const settings = getSettings();
  if (!settings.dbIntegrationEnabled || !db) {
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
export async function getRecordings(): Promise<Recording[]> {
  const { dbIntegrationEnabled } = getSettings();

  if (dbIntegrationEnabled && db) {
    try {
      const q = query(collection(db, "recordings"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const recordings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recording));
      _saveRecordingsToStorage(recordings); // Sync to local
      return recordings;
    } catch (error) {
      console.error("Error fetching from Firestore, falling back to local storage.", error);
      return Promise.resolve(_getRecordingsFromStorage().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  } else {
    const recordings = _getRecordingsFromStorage();
    recordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.resolve(recordings);
  }
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const { dbIntegrationEnabled } = getSettings();
  if (dbIntegrationEnabled && db) {
      try {
        const docRef = doc(db, "recordings", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Recording;
        }
      } catch (error) {
        console.error("Error fetching doc from Firestore, falling back to local", error);
      }
  }
  const recordings = _getRecordingsFromStorage();
  return Promise.resolve(recordings.find(rec => rec.id === id));
}

export async function saveRecording(data: Omit<Recording, 'id' | 'date'>): Promise<Recording> {
  const settings = getSettings();
  
  const newRecording: Recording = {
    id: new Date().getTime().toString(),
    ...data,
    date: new Date().toISOString(),
  };

  const recordings = _getRecordingsFromStorage();
  const updatedRecordings = [...recordings, newRecording];
  _saveRecordingsToStorage(updatedRecordings);
  
  if (settings.dbIntegrationEnabled && settings.autoSendToDB) {
    const { audioDataUri, ...dataToSave } = newRecording;
    await saveRecordingToDB(dataToSave);
  }
  
  return Promise.resolve(newRecording);
}

export async function updateRecording(recording: Recording): Promise<Recording> {
  const settings = getSettings();
  
  // Always update local storage
  let recordings = _getRecordingsFromStorage();
  const index = recordings.findIndex(r => r.id === recording.id);
  if (index !== -1) {
    recordings[index] = recording;
  } else {
    recordings.push(recording);
  }
  _saveRecordingsToStorage(recordings);

  // Update firestore if enabled
  if (settings.dbIntegrationEnabled && db) {
    try {
      const { audioDataUri, ...dataToSave } = recording;
      const docRef = doc(db, "recordings", recording.id);
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error("Error updating document in Firestore: ", error);
    }
  }
  
  return recording;
}


export async function deleteRecording(id: string): Promise<void> {
  // Local
  const recordings = _getRecordingsFromStorage();
  const updatedRecordings = recordings.filter(rec => rec.id !== id);
  _saveRecordingsToStorage(updatedRecordings);

  // Firestore
  await deleteRecordingFromDB(id).catch(err => console.error("Could not delete from DB", err));

  return Promise.resolve();
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

  const recordings = _getRecordingsFromStorage();
  const recordingsToDelete = recordings.filter(rec => new Date(rec.date).getTime() < cutoffDate.getTime());
  const recordingsToKeep = recordings.filter(rec => new Date(rec.date).getTime() >= cutoffDate.getTime());

  if (recordingsToDelete.length > 0) {
    _saveRecordingsToStorage(recordingsToKeep);
    console.log(`Auto-deleted ${recordingsToDelete.length} old recordings from local storage.`);
    
    // Also delete from Firestore
    const settings = getSettings();
    if (settings.dbIntegrationEnabled && db) {
        const batch = writeBatch(db);
        recordingsToDelete.forEach(rec => {
            const docRef = doc(db, 'recordings', rec.id);
            batch.delete(docRef);
        });
        await batch.commit().catch(err => console.error("Error batch deleting from Firestore", err));
    }
  }
  return Promise.resolve();
}
