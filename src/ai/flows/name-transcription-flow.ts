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
  prompt: `You are an expert at summarizing and titling text. Based on the following transcription, create a concise and descriptive title. The title should be between 3 and 5 words. The title must be in the same language as the original transcription.

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
    const {output} = await prompt(input);
    return output!;
  }
);
