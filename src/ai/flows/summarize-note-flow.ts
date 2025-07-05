
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
import { resolveModel } from '../utils';

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
    const modelToUse = resolveModel(input.aiModel);
    const {output} = await prompt(input, { model: modelToUse });
    return output!;
  }
);
