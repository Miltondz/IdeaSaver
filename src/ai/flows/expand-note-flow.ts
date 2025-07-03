'use server';
/**
 * @fileOverview An AI agent for expanding on transcriptions.
 *
 * - expandNote - A function that handles expanding a note.
 * - ExpandNoteInput - The input type for the expandNote function.
 * - ExpandNoteOutput - The return type for the expandNote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpandNoteInputSchema = z.object({
  transcription: z.string().describe('The transcription to be expanded.'),
  aiModel: z.string().optional(),
});
export type ExpandNoteInput = z.infer<typeof ExpandNoteInputSchema>;

const ExpandNoteOutputSchema = z.object({
  expandedDocument: z.string().describe('A well-structured document expanding on the original transcription. It should have paragraphs and headings.'),
});
export type ExpandNoteOutput = z.infer<typeof ExpandNoteOutputSchema>;

export async function expandNote(input: ExpandNoteInput): Promise<ExpandNoteOutput> {
  return expandNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expandNotePrompt',
  input: {schema: ExpandNoteInputSchema},
  output: {schema: ExpandNoteOutputSchema},
  prompt: `You are an expert writer and thought partner. Your task is to take the following raw transcription of a voice note and expand it into a well-structured and detailed document.
Elaborate on the key ideas, provide additional context or examples where appropriate, and organize the content logically with paragraphs and markdown headings. The expanded document must be in the same language as the original transcription. The goal is to transform a rough idea into a more complete piece of text.

Original Transcription:
{{{transcription}}}
`,
});

const expandNoteFlow = ai.defineFlow(
  {
    name: 'expandNoteFlow',
    inputSchema: ExpandNoteInputSchema,
    outputSchema: ExpandNoteOutputSchema,
  },
  async (input) => {
    const model = (input.aiModel && input.aiModel.includes('/')) 
      ? input.aiModel 
      : `googleai/${input.aiModel || 'gemini-2.0-flash'}`;

    const {output} = await prompt(input, { model });
    return output!;
  }
);
