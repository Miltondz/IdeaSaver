import type { Recording } from "@/types";

const RECORDINGS_KEY = "voice-note-recordings";

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
