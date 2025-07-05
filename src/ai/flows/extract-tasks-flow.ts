
'use server';
/**
 * @fileOverview An AI agent for extracting tasks from a transcription.
 *
 * - extractTasks - A function that handles extracting tasks from a note.
 * - ExtractTasksInput - The input type for the extractTasks function.
 * - ExtractTasksOutput - The return type for the extractTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { resolveModel } from '../utils';

const ExtractTasksInputSchema = z.object({
  transcription: z.string().describe('The transcription from which to extract tasks.'),
  aiModel: z.string().optional(),
});
export type ExtractTasksInput = z.infer<typeof ExtractTasksInputSchema>;

const ExtractTasksOutputSchema = z.object({
  tasks: z.string().describe('A markdown-formatted list of actionable tasks or a to-do list based on the transcription.'),
});
export type ExtractTasksOutput = z.infer<typeof ExtractTasksOutputSchema>;

export async function extractTasks(input: ExtractTasksInput): Promise<ExtractTasksOutput> {
  return extractTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTasksPrompt',
  input: {schema: ExtractTasksInputSchema},
  output: {schema: ExtractTasksOutputSchema},
  prompt: `You are an expert at identifying action items. Your most important task is to write your response in the SAME LANGUAGE as the original transcription provided below. Do not translate it to English.

Your task is to analyze the following transcription and extract a clear, actionable to-do list. Format the output as a markdown checklist. If no specific tasks are mentioned, create a list of logical next steps based on the content.

Original Transcription:
{{{transcription}}}
`,
});

const extractTasksFlow = ai.defineFlow(
  {
    name: 'extractTasksFlow',
    inputSchema: ExtractTasksInputSchema,
    outputSchema: ExtractTasksOutputSchema,
  },
  async (input) => {
    const modelToUse = await resolveModel(input.aiModel);
    const {output} = await prompt(input, { model: modelToUse });
    return output!;
  }
);
