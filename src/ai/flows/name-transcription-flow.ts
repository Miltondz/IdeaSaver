
'use server';
/**
 * @fileOverview An AI agent for naming transcriptions.
 *
 * - nameTranscription - A function that handles the transcription naming process.
 * - NameTranscriptionInput - The input type for the nameTranscription function.
 * - NameTranscriptionOutput - The return type for the nameTranscription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NameTranscriptionInputSchema = z.object({
  transcription: z.string().describe('The transcription to be named.'),
  aiModel: z.string().optional(),
});
export type NameTranscriptionInput = z.infer<typeof NameTranscriptionInputSchema>;

const NameTranscriptionOutputSchema = z.object({
  name: z.string().describe('A short, descriptive title for the transcription, between 3 and 5 words.'),
});
export type NameTranscriptionOutput = z.infer<typeof NameTranscriptionOutputSchema>;

export async function nameTranscription(input: NameTranscriptionInput): Promise<NameTranscriptionOutput> {
  return nameTranscriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'nameTranscriptionPrompt',
  input: {schema: NameTranscriptionInputSchema},
  output: {schema: NameTranscriptionOutputSchema},
  prompt: `You are an expert at summarizing text. Your most important task is to create a title in the SAME LANGUAGE as the original transcription. Do not translate.

Based on the following transcription, create a concise and descriptive title. The title should be between 3 and 5 words.

Transcription:
{{{transcription}}}
`,
});

const nameTranscriptionFlow = ai.defineFlow(
  {
    name: 'nameTranscriptionFlow',
    inputSchema: NameTranscriptionInputSchema,
    outputSchema: NameTranscriptionOutputSchema,
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
