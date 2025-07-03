
'use server';
/**
 * @fileOverview An AI agent for summarizing transcriptions.
 *
 * - summarizeNote - A function that handles summarizing a note.
 * - SummarizeNoteInput - The input type for the summarizeNote function.
 * - SummarizeNoteOutput - The return type for the summarizeNote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeNoteInputSchema = z.object({
  transcription: z.string().describe('The transcription to be summarized.'),
  aiModel: z.string().optional(),
});
export type SummarizeNoteInput = z.infer<typeof SummarizeNoteInputSchema>;

const SummarizeNoteOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the transcription, about 1-2 sentences long.'),
});
export type SummarizeNoteOutput = z.infer<typeof SummarizeNoteOutputSchema>;

export async function summarizeNote(input: SummarizeNoteInput): Promise<SummarizeNoteOutput> {
  return summarizeNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeNotePrompt',
  input: {schema: SummarizeNoteInputSchema},
  output: {schema: SummarizeNoteOutputSchema},
  prompt: `You are an expert at summarizing text. Your most important task is to write your response in the SAME LANGUAGE as the original transcription provided below. Do not translate it to English.

Your task is to take the following raw transcription of a voice note and create a concise summary. The summary should be about 1-2 sentences long, capturing the main point of the note.

Original Transcription:
{{{transcription}}}
`,
});

const summarizeNoteFlow = ai.defineFlow(
  {
    name: 'summarizeNoteFlow',
    inputSchema: SummarizeNoteInputSchema,
    outputSchema: SummarizeNoteOutputSchema,
  },
  async (input) => {
    // The googleAI() plugin is configured in `src/ai/genkit.ts` and will use the GOOGLE_API_KEY from .env
    // The user can override the model via the settings page.
    const modelToUse = (input.aiModel && input.aiModel.includes('/')) 
      ? input.aiModel 
      : `googleai/${input.aiModel || 'gemini-1.5-flash-latest'}`;

    const [providerName] = modelToUse.split('/');
    if (providerName !== 'googleai') {
        // This is a safeguard. The UI should ideally prevent this.
        throw new Error(`Provider "${providerName}" is not supported or configured. Please use a 'googleai' model or update the application to include the necessary plugin.`);
    }

    const {output} = await prompt(input, { model: modelToUse });
    return output!;
  }
);
