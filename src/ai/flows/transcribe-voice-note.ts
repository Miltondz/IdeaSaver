'use server';
/**
 * @fileOverview A voice note transcription AI agent.
 *
 * - transcribeVoiceNote - A function that handles the voice note transcription process.
 * - TranscribeVoiceNoteInput - The input type for the transcribeVoiceNote function.
 * - TranscribeVoiceNoteOutput - The return type for the transcribeVoiceNote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeVoiceNoteInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The voice note as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  aiModel: z.string().optional(),
  aiApiKey: z.string().optional(),
});
export type TranscribeVoiceNoteInput = z.infer<typeof TranscribeVoiceNoteInputSchema>;

const TranscribeVoiceNoteOutputSchema = z.object({
  transcription: z.string().describe('The transcription of the voice note.'),
});
export type TranscribeVoiceNoteOutput = z.infer<typeof TranscribeVoiceNoteOutputSchema>;

export async function transcribeVoiceNote(input: TranscribeVoiceNoteInput): Promise<TranscribeVoiceNoteOutput> {
  return transcribeVoiceNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transcribeVoiceNotePrompt',
  input: {schema: TranscribeVoiceNoteInputSchema},
  output: {schema: TranscribeVoiceNoteOutputSchema},
  prompt: `You are a transcription service that converts audio to text.

  Transcribe the audio provided in the following data URI to text:
  {{media url=audioDataUri}}`,
});

const transcribeVoiceNoteFlow = ai.defineFlow(
  {
    name: 'transcribeVoiceNoteFlow',
    inputSchema: TranscribeVoiceNoteInputSchema,
    outputSchema: TranscribeVoiceNoteOutputSchema,
  },
  async input => {
    const modelToUse = (input.aiModel && input.aiModel.includes('/')) 
      ? input.aiModel 
      : `googleai/${input.aiModel || 'gemini-2.0-flash'}`;
    
    const [providerName] = modelToUse.split('/');
    if (providerName !== 'googleai') {
        throw new Error(`Provider "${providerName}" is not configured. Please install the required Genkit plugin.`);
    }

    let originalGoogleKey: string | undefined;

    if (input.aiApiKey) {
      if (providerName === 'googleai') {
        originalGoogleKey = process.env.GOOGLE_API_KEY;
        process.env.GOOGLE_API_KEY = input.aiApiKey;
      }
    }

    try {
      const {output} = await prompt(input, { model: modelToUse });
      return output!;
    } finally {
      if (input.aiApiKey) {
          if (providerName === 'googleai') {
            process.env.GOOGLE_API_KEY = originalGoogleKey;
          }
      }
    }
  }
);
