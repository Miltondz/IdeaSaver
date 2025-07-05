
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


const _getSettingsFromCache = (userId: string): AppSettings | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(getSettingsKey(userId));
    return data ? JSON.parse(data) : null;
};

const _saveSettingsToCache = (settings: AppSettings, userId: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
    // Dispatch a storage event to notify other tabs/windows
    window.dispatchEvent(new Event('storage'));
};

const defaultSettings: Omit<AppSettings, 'monthlyCreditsLastUpdated'> = { 
    isPro: false,
    planSelected: false,
    deletionPolicy: "never",
    aiModel: "gemini-1.5-flash-latest",
    cloudSyncEnabled: false,
    autoCloudSync: false,
    aiCredits: 0,
    proTrialEndsAt: undefined,
    proTrialUsed: false,
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
    // Return cached or default settings if no user or DB connection
    return _getSettingsFromCache(userId || '') || getInitialSettings();
  }

  try {
    const docRef = doc(db, "settings", userId);
    const docSnap = await getDoc(docRef);
    let settings: AppSettings;

    if (docSnap.exists()) {
      settings = { ...getInitialSettings(), ...docSnap.data() } as AppSettings;
    } else {
      // First time user, or no settings in DB yet
      settings = _getSettingsFromCache(userId) || getInitialSettings();
    }
    
    // Check for pro trial expiration
    if (settings.isPro && settings.proTrialEndsAt) {
        const trialEndDate = new Date(settings.proTrialEndsAt);
        if (new Date() > trialEndDate) {
            settings.isPro = false;
            settings.cloudSyncEnabled = false;
            settings.autoCloudSync = false;
            settings.proTrialEndsAt = undefined;
            // Save the new state
            await saveSettings(settings, userId); 
        }
    }

    // Monthly credit refresh logic for Free users who have completed onboarding
    if (settings.planSelected && !settings.isPro) {
        const lastUpdate = new Date(settings.monthlyCreditsLastUpdated);
        const now = new Date();
        // Check if the last update was in a previous month (of any year)
        if (now.getFullYear() > lastUpdate.getFullYear() || now.getMonth() > lastUpdate.getMonth()) {
            settings.aiCredits += 2;
            settings.monthlyCreditsLastUpdated = now.toISOString();
            // Save immediately to DB and cache
            await saveSettings(settings, userId); 
        }
    }

    _saveSettingsToCache(settings, userId);
    return settings;

  } catch (error) {
    console.error("Error fetching settings from Firestore, falling back to cache.", error);
    return _getSettingsFromCache(userId) || getInitialSettings();
  }
}

export async function saveSettings(settings: AppSettings, userId: string): Promise<void> {
  if (!userId) return;

  _saveSettingsToCache(settings, userId);

  if (!db) {
    console.warn("Firestore not available. Settings saved locally only.");
    return;
  }
  
  try {
    const firestoreSettings = { ...settings };
    // Firestore doesn't allow `undefined` fields. We need to remove them.
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
    // The settings are already saved locally, so the app can continue.
    // We might want to add a retry mechanism here in a real-world app.
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

    // Delete settings
    batch.delete(settingsDocRef);

    // Find and delete all recordings
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
    // Create a copy of the recording and remove the audio data before saving to DB
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

      // Create a map of local recordings for quick lookup of audio data
      const localMap = new Map<string, Recording>(localRecordings.map(rec => [rec.id, rec]));

      // Merge cloud (text) and local (audio) data
      const mergedRecordings = cloudRecordings.map(cloudRec => {
        const localRec = localMap.get(cloudRec.id);
        return {
          ...cloudRec, // Cloud data is the source of truth for text
          audioDataUri: localRec?.audioDataUri, // But audio comes from local
        };
      });
      
      // Add any recordings that are only available locally (e.g., recorded while offline)
      localRecordings.forEach(localRec => {
        if (!mergedRecordings.some(m => m.id === localRec.id)) {
            mergedRecordings.push(localRec);
        }
      });

      // Sort recordings by date descending
      mergedRecordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Sync the fully merged result back to local storage
      _saveRecordingsToStorage(mergedRecordings, userId);
      return mergedRecordings;

    } catch (error) {
      console.error("Error fetching from Firestore, falling back to local storage.", error);
      return Promise.resolve(localRecordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  } else {
    // If cloud sync is off, just return local recordings
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
  // Fallback to local storage if not found in DB or if DB is disabled
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
  
  // Always save to local storage first, with audio
  _saveRecordingsToStorage([...recordings, newRecording], userId);
  
  if (settings.cloudSyncEnabled && settings.autoCloudSync) {
    // saveRecordingToDB will strip audio before sending
    await saveRecordingToDB(newRecording);
  }
  
  return Promise.resolve(newRecording);
}

export async function updateRecording(recording: Recording, userId: string): Promise<Recording> {
    const settings = await getSettings(userId);
    const allLocalRecordings = _getRecordingsFromStorage(userId);
    const existingRecording = allLocalRecordings.find(r => r.id === recording.id);

    // Create the final updated object, preserving the existing local audio URI 
    // if the incoming update doesn't have one.
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
        // saveRecordingToDB will handle stripping the audio data before saving to Firestore
        await saveRecordingToDB(updatedRecording);
    }

    return updatedRecording;
}


export async function deleteRecording(id: string, userId: string): Promise<void> {
  const settings = await getSettings(userId);
  
  if (settings.cloudSyncEnabled && db) {
      // If cloud sync is enabled, we must delete from the DB first.
      // If this fails, it will throw and the local deletion will not occur.
      await deleteRecordingFromDB(id, userId);
  }

  // If the DB deletion was successful, or if cloud sync is off, proceed with local deletion.
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
