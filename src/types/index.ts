
export interface Recording {
  id: string;
  userId: string;
  name: string;
  transcription: string;
  audioDataUri?: string;
  audioMimeType?: string;
  date: string; // ISO string
  expandedTranscription?: string;
  summary?: string;
  projectPlan?: string;
  actionItems?: string;
}
