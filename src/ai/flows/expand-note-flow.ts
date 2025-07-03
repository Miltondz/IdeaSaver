
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
  prompt: `You are an expert writer. Your most important task is to write your response in the SAME LANGUAGE as the original transcription provided below. Do not translate it to English.

Your task is to take the following raw transcription of a voice note and expand it into a well-structured and detailed document. Elaborate on the key ideas, provide additional context or examples where appropriate, and organize the content logically with paragraphs and markdown headings.

The goal is to transform a rough idea into a more complete piece of text, maintaining the original language.

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
