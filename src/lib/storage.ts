import type { Recording } from "@/types";

const RECORDINGS_KEY = "voice-note-recordings";
const SETTINGS_KEY = "voice-note-settings";

type DeletionPolicy = "never" | "7" | "15" | "30";
interface AppSettings {
  deletionPolicy: DeletionPolicy;
}

function getRecordingsFromStorage(): Recording[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(RECORDINGS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveRecordingsToStorage(recordings: Recording[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings));
}

export function getRecordings(): Recording[] {
  const recordings = getRecordingsFromStorage();
  return recordings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRecording(id: string): Recording | undefined {
  return getRecordingsFromStorage().find(r => r.id === id);
}

export async function saveRecording(data: Omit<Recording, 'id' | 'date'>): Promise<Recording> {
  const recordings = getRecordingsFromStorage();
  const newRecording: Recording = {
    ...data,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  saveRecordingsToStorage([newRecording, ...recordings]);
  return newRecording;
}

export function deleteRecording(id: string): void {
  const recordings = getRecordingsFromStorage();
  const filteredRecordings = recordings.filter(r => r.id !== id);
  saveRecordingsToStorage(filteredRecordings);
}

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return { deletionPolicy: "never" };
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { deletionPolicy: "never" };
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function applyDeletions(): void {
  if (typeof window === "undefined") return;

  const { deletionPolicy } = getSettings();
  if (deletionPolicy === "never") {
    return;
  }

  const daysToKeep = parseInt(deletionPolicy, 10);
  const recordings = getRecordingsFromStorage();
  const now = new Date();
  
  const filteredRecordings = recordings.filter(r => {
    const recordingDate = new Date(r.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysToKeep);
    return recordingDate >= cutoffDate;
  });

  if (filteredRecordings.length < recordings.length) {
      console.log(`Auto-deleted ${recordings.length - filteredRecordings.length} old recordings.`);
      saveRecordingsToStorage(filteredRecordings);
  }
}
