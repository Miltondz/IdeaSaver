
'use server';
/**
 * @fileOverview An AI agent for expanding a transcription into a project plan.
 *
 * - expandAsProject - A function that handles expanding a note into a project plan.
 * - ExpandAsProjectInput - The input type for the expandAsProject function.
 * - ExpandAsProjectOutput - The return type for the expandAsProject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { resolveModel } from '../utils';

const ExpandAsProjectInputSchema = z.object({
  transcription: z.string().describe('The transcription to be expanded into a project plan.'),
  aiModel: z.string().optional(),
});
export type ExpandAsProjectInput = z.infer<typeof ExpandAsProjectInputSchema>;

const ExpandAsProjectOutputSchema = z.object({
  projectPlan: z.string().describe('A well-structured project plan based on the transcription, with sections like goals, milestones, and resources. It should use markdown for formatting.'),
});
export type ExpandAsProjectOutput = z.infer<typeof ExpandAsProjectOutputSchema>;

export async function expandAsProject(input: ExpandAsProjectInput): Promise<ExpandAsProjectOutput> {
  return expandAsProjectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expandAsProjectPrompt',
  input: {schema: ExpandAsProjectInputSchema},
  output: {schema: ExpandAsProjectOutputSchema},
  prompt: `You are an expert project manager. Your most important task is to write your response in the SAME LANGUAGE as the original transcription provided below. Do not translate it to English.

Your task is to take the following raw transcription of a voice note and expand it into a structured project plan. Use markdown for formatting. The plan should include sections like:
- Project Goals/Objectives
- Key Milestones or Phases
- Required Resources
- Potential Risks

Transform the rough idea into a clear, actionable project plan, maintaining the original language.

Original Transcription:
{{{transcription}}}
`,
});

const expandAsProjectFlow = ai.defineFlow(
  {
    name: 'expandAsProjectFlow',
    inputSchema: ExpandAsProjectInputSchema,
    outputSchema: ExpandAsProjectOutputSchema,
  },
  async (input) => {
    const modelToUse = resolveModel(input.aiModel);
    const {output} = await prompt(input, { model: modelToUse });
    return output!;
  }
);
