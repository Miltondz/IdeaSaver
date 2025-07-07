
import {
  collection,
  query,
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
  planSelected: boolean;
  deletionPolicy: DeletionPolicy;
  aiModel: string;
  cloudSyncEnabled: boolean;
  autoCloudSync: boolean;
  aiCredits: number;
  monthlyCreditsLastUpdated: string; // ISO string
  proTrialEndsAt?: string;
  proTrialUsed?: boolean;
  subscriptionEndsAt?: string;
}

const getSettingsKey = (userId: string) => `${SETTINGS_KEY}_${userId}`;
const getRecordingsKey = (userId: string) => `${RECORDINGS_KEY}_${userId}`;


const _getRecordingsFromStorage = (userId: string | null): Recording[] => {
  if (typeof window === "undefined" || !userId) return [];
  const data = localStorage.getItem(getRecordingsKey(userId));
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
    localStorage.setItem(getRecordingsKey(userId), JSON.stringify(recordings));
  } catch (error) {
    console.error("Error saving recordings to localStorage. Data may be too large.", error);
  }
};

export const getSettingsFromCache = (userId: string): AppSettings | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(getSettingsKey(userId));
    return data ? JSON.parse(data) : null;
};

export const saveSettingsToCache = (settings: AppSettings, userId: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
    window.dispatchEvent(new Event('storage'));
};

export const defaultSettings: Omit<AppSettings, 'monthlyCreditsLastUpdated'> = { 
    isPro: false,
    planSelected: false,
    deletionPolicy: "never",
    aiModel: "gemini-1.5-flash-latest",
    cloudSyncEnabled: false,
    autoCloudSync: false,
    aiCredits: 0,
    proTrialEndsAt: undefined,
    proTrialUsed: false,
    subscriptionEndsAt: undefined,
};

// --- Public API for Storage ---

export function clearUserLocalStorage(userId: string) {
    if (typeof window === "undefined" || !userId) return;
    localStorage.removeItem(getSettingsKey(userId));
    localStorage.removeItem(getRecordingsKey(userId));
}

export async function getSettings(userId?: string | null): Promise<AppSettings> {
  const getInitialSettings = (): AppSettings => ({
      ...defaultSettings,
      monthlyCreditsLastUpdated: new Date().toISOString(),
  });

  if (!userId || !db) {
    return getSettingsFromCache(userId || '') || getInitialSettings();
  }

  try {
    const docRef = doc(db, "settings", userId);
    const docSnap = await getDoc(docRef);
    let settings: AppSettings;

    if (docSnap.exists()) {
      settings = { ...getInitialSettings(), ...docSnap.data() } as AppSettings;
    } else {
      settings = getSettingsFromCache(userId) || getInitialSettings();
    }
    
    saveSettingsToCache(settings, userId);
    return settings;

  } catch (error) {
    console.error("Error fetching settings from Firestore, falling back to cache.", error);
    return getSettingsFromCache(userId) || getInitialSettings();
  }
}

export async function saveSettings(settings: AppSettings, userId: string): Promise<void> {
  if (!userId) return;

  saveSettingsToCache(settings, userId);

  if (!db) {
    console.warn("Firestore not available. Settings saved locally only.");
    return;
  }
  
  try {
    const firestoreSettings = { ...settings };
    Object.keys(firestoreSettings).forEach(key => {
      const k = key as keyof AppSettings;
      if (firestoreSettings[k] === undefined) {
        delete firestoreSettings[k];
      }
    });
    
    const docRef = doc(db, "settings", userId);
    await setDoc(docRef, firestoreSettings, { merge: true });
  } catch(error) {
    console.error("Failed to save settings to Firestore:", error);
  }
}

// --- Firestore Functions ---
export async function deleteUserData(userId: string): Promise<void> {
    if (!db) {
        console.error("Firestore not available. Cannot delete user data.");
        throw new Error("Database not connected.");
    }
    
    const recordingsQuery = query(collection(db, "recordings"), where("userId", "==", userId));
    const settingsDocRef = doc(db, "settings", userId);

    const batch = writeBatch(db);

    batch.delete(settingsDocRef);

    const recordingsSnapshot = await getDocs(recordingsQuery);
    recordingsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

export async function saveRecordingToDB(recording: Recording): Promise<void> {
  const settings = await getSettings(recording.userId);
  if (!settings.cloudSyncEnabled || !db) {
    console.log("Cloud Sync is disabled. Skipping Firestore save.");
    return;
  }
  try {
    const { audioDataUri, ...dbData } = recording;
    const docRef = doc(db, "recordings", recording.id);
    await setDoc(docRef, dbData, { merge: true });
    console.log("Recording text data saved to Firestore with ID: ", recording.id);
  } catch (error) {
    console.error("Error adding document to Firestore: ", error);
    throw new Error("Failed to save recording to database.");
  }
}

export async function deleteRecordingFromDB(id: string, userId: string): Promise<void> {
  const settings = await getSettings(userId);
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
  const { cloudSyncEnabled } = await getSettings(userId);
  const localRecordings = _getRecordingsFromStorage(userId);

  if (cloudSyncEnabled && db) {
    try {
      const q = query(collection(db, "recordings"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const cloudRecordings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recording));

      const localMap = new Map<string, Recording>(localRecordings.map(rec => [rec.id, rec]));

      const mergedRecordings = cloudRecordings.map(cloudRec => {
        const localRec = localMap.get(cloudRec.id);
        return {
          ...cloudRec,
          audioDataUri: localRec?.audioDataUri,
        };
      });
      
      localRecordings.forEach(localRec => {
        if (!mergedRecordings.some(m => m.id === localRec.id)) {
            mergedRecordings.push(localRec);
        }
      });

      mergedRecordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      _saveRecordingsToStorage(mergedRecordings, userId);
      return mergedRecordings;

    } catch (error) {
      console.error("Error fetching from Firestore, falling back to local storage.", error);
      return Promise.resolve(localRecordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  } else {
    const recordings = _getRecordingsFromStorage(userId);
    recordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.resolve(recordings);
  }
}


export async function getRecording(id: string, userId: string): Promise<Recording | undefined> {
  const { cloudSyncEnabled } = await getSettings(userId);
  if (cloudSyncEnabled && db) {
      try {
        const docRef = doc(db, "recordings", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().userId === userId) {
          const cloudData = { id: docSnap.id, ...docSnap.data() } as Recording;
          const localData = _getRecordingsFromStorage(userId).find(r => r.id === id);
          return { ...cloudData, audioDataUri: localData?.audioDataUri };
        }
      } catch (error) {
        console.error("Error fetching doc from Firestore, falling back to local", error);
      }
  }
  const recordings = _getRecordingsFromStorage(userId);
  return Promise.resolve(recordings.find(rec => rec.id === id));
}

export async function saveRecording(data: Omit<Recording, 'id' | 'date' | 'userId'>, userId: string): Promise<Recording> {
  const settings = await getSettings(userId);
  
  const newRecording: Recording = {
    id: new Date().getTime().toString(),
    userId: userId,
    ...data,
    date: new Date().toISOString(),
  };

  const recordings = _getRecordingsFromStorage(userId);
  
  _saveRecordingsToStorage([...recordings, newRecording], userId);
  
  if (settings.cloudSyncEnabled && settings.autoCloudSync) {
    await saveRecordingToDB(newRecording);
  }
  
  return Promise.resolve(newRecording);
}

export async function updateRecording(recording: Recording, userId: string): Promise<Recording> {
    const settings = await getSettings(userId);
    const allLocalRecordings = _getRecordingsFromStorage(userId);
    const existingRecording = allLocalRecordings.find(r => r.id === recording.id);

    const updatedRecording: Recording = {
        ...recording,
        audioDataUri: recording.audioDataUri || existingRecording?.audioDataUri,
    };

    const index = allLocalRecordings.findIndex(r => r.id === recording.id);
    if (index !== -1) {
        allLocalRecordings[index] = updatedRecording;
    } else {
        allLocalRecordings.push(updatedRecording);
    }
    _saveRecordingsToStorage(allLocalRecordings, userId);

    if (settings.cloudSyncEnabled) {
        await saveRecordingToDB(updatedRecording);
    }

    return updatedRecording;
}


export async function deleteRecording(id: string, userId: string): Promise<void> {
  const settings = await getSettings(userId);
  
  if (settings.cloudSyncEnabled && db) {
      await deleteRecordingFromDB(id, userId);
  }

  const recordings = _getRecordingsFromStorage(userId);
  const updatedRecordings = recordings.filter(rec => rec.id !== id);
  _saveRecordingsToStorage(updatedRecordings, userId);

  return Promise.resolve();
}

export async function applyDeletions(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  const { deletionPolicy, cloudSyncEnabled } = await getSettings(userId);
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
