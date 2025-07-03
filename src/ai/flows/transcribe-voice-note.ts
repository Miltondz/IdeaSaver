
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
    // The googleAI() plugin is configured in `src/ai/genkit.ts` and will use the GOOGLE_API_KEY from .env
    // The user can override the model via the settings page.
    const modelToUse = (input.aiModel && input.aiModel.includes('/')) 
      ? input.aiModel 
      : `googleai/${input.aiModel || 'gemini-2.0-flash'}`;
    
    const [providerName] = modelToUse.split('/');
    if (providerName !== 'googleai') {
        // This is a safeguard. The UI should ideally prevent this.
        throw new Error(`Provider "${providerName}" is not supported or configured. Please use a 'googleai' model or update the application to include the necessary plugin.`);
    }

    const {output} = await prompt(input, { model: modelToUse });
    return output!;
  }
);
