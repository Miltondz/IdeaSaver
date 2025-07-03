// import {
//   collection,
//   query,
//   orderBy,
//   getDocs,
//   getDoc,
//   addDoc,
//   deleteDoc,
//   doc,
//   where,
//   writeBatch,
// } from "firebase/firestore";
// import { db } from "./firebase";
import type { Recording } from "@/types";

const RECORDINGS_KEY = "voice-note-recordings";
const SETTINGS_KEY = "voice-note-settings";

type DeletionPolicy = "never" | "7" | "15" | "30";
interface AppSettings {
  deletionPolicy: DeletionPolicy;
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
// We keep the async/Promise structure to avoid breaking the components that use these functions.

export async function getRecordings(): Promise<Recording[]> {
  const recordings = _getRecordingsFromStorage();
  // Sort by date descending to show newest first
  recordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return Promise.resolve(recordings);
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const recordings = _getRecordingsFromStorage();
  const recording = recordings.find(rec => rec.id === id);
  return Promise.resolve(recording);
}

export async function saveRecording(data: Omit<Recording, 'id' | 'date'> & { audioDataUri?: string }): Promise<Recording> {
  console.log("saveRecording (localStorage): Function called.");
  const recordings = _getRecordingsFromStorage();
  
  const newRecording: Recording = {
    id: new Date().getTime().toString(), // Simple unique ID
    ...data,
    date: new Date().toISOString(),
  };

  const updatedRecordings = [...recordings, newRecording];
  _saveRecordingsToStorage(updatedRecordings);
  
  console.log("saveRecording (localStorage): Recording saved.", newRecording);
  return Promise.resolve(newRecording);
}


export async function deleteRecording(id: string): Promise<void> {
  try {
    const recordings = _getRecordingsFromStorage();
    const updatedRecordings = recordings.filter(rec => rec.id !== id);
    _saveRecordingsToStorage(updatedRecordings);
    return Promise.resolve();
  } catch (error) {
    console.error("Error deleting recording from localStorage: ", error);
    throw new Error("Failed to delete recording from localStorage.");
  }
}


// Settings remain in localStorage
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

  try {
    const recordings = _getRecordingsFromStorage();
    const filteredRecordings = recordings.filter(rec => {
      return new Date(rec.date).getTime() >= cutoffDate.getTime();
    });

    const deletedCount = recordings.length - filteredRecordings.length;
    if (deletedCount > 0) {
        _saveRecordingsToStorage(filteredRecordings);
        console.log(`Auto-deleted ${deletedCount} old recordings.`);
    }
  } catch (error) {
    console.error("Error applying deletions from localStorage: ", error);
  }
  return Promise.resolve();
}
