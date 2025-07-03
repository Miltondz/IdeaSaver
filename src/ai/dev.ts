import { config } from 'dotenv';
config();

import '@/ai/flows/transcribe-voice-note.ts';
import '@/ai/flows/name-transcription-flow.ts';
import '@/ai/flows/expand-note-flow.ts';
import '@/ai/flows/summarize-note-flow.ts';
