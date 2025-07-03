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
  aiApiKey: z.string().optional(),
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
