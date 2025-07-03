
export interface Recording {
  id: string;
  userId: string;
  name: string;
  transcription: string;
  audioDataUri?: string;
  date: string; // ISO string
  expandedTranscription?: string;
}
