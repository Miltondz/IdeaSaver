import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  writeBatch
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
  aiApiKey: string;
  aiModel: string;
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
      aiApiKey: "",
      aiModel: "gemini-2.0-flash",
      dbIntegrationEnabled: false,
      autoSendToDB: false,
    };
  }
  const data = localStorage.getItem(SETTINGS_KEY);
  const defaults: AppSettings = { 
      deletionPolicy: "never",
      trelloApiKey: "",
      trelloToken: "",
      aiApiKey: "",
      aiModel: "gemini-2.0-flash",
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
      // Firestore is the source of truth, but we keep local as a cache/fallback
      _saveRecordingsToStorage(recordings.map(({audioDataUri, ...rest}) => rest)); // Don't save audio data URI to local storage
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
  // Fallback to local storage if not found in DB or if DB is disabled
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
  // Don't save audio data URI to local storage to avoid size limits
  const { audioDataUri, ...localData } = newRecording;
  const updatedRecordings = [...recordings, localData];
  _saveRecordingsToStorage(updatedRecordings);
  
  if (settings.dbIntegrationEnabled && settings.autoSendToDB) {
    await saveRecordingToDB(localData);
  }
  
  // Return the full recording object including the data URI for immediate use
  return Promise.resolve(newRecording);
}

export async function updateRecording(recording: Recording): Promise<Recording> {
  const settings = getSettings();
  
  // Exclude audio data from local and DB storage
  const { audioDataUri, ...dataToSave } = recording;
  
  // Always update local storage
  let recordings = _getRecordingsFromStorage();
  const index = recordings.findIndex(r => r.id === recording.id);
  if (index !== -1) {
    recordings[index] = dataToSave;
  } else {
    recordings.push(dataToSave);
  }
  _saveRecordingsToStorage(recordings);

  // Update firestore if enabled
  if (settings.dbIntegrationEnabled && db) {
    try {
      const docRef = doc(db, "recordings", dataToSave.id);
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error("Error updating document in Firestore: ", error);
    }
  }
  
  // Return the full object for the UI
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

  const recordings = await getRecordings(); // Get from primary source (DB or local)
  
  const recordingsToDelete = recordings.filter(rec => new Date(rec.date).getTime() < cutoffDate.getTime());

  if (recordingsToDelete.length > 0) {
    console.log(`Auto-deleting ${recordingsToDelete.length} old recordings.`);
    
    // Use a batch delete for efficiency
    const { dbIntegrationEnabled } = getSettings();
    if (dbIntegrationEnabled && db) {
        try {
            const batch = writeBatch(db);
            recordingsToDelete.forEach(rec => {
                const docRef = doc(db, 'recordings', rec.id);
                batch.delete(docRef);
            });
            await batch.commit();
        } catch (err) {
            console.error("Error batch deleting from Firestore", err)
        }
    }
    
    // Also update local storage
    const localRecordings = _getRecordingsFromStorage();
    const recordingsToKeep = localRecordings.filter(rec => new Date(rec.date).getTime() >= cutoffDate.getTime());
    _saveRecordingsToStorage(recordingsToKeep);
  }
  return Promise.resolve();
}
