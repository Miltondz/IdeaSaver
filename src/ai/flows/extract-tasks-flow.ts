
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
