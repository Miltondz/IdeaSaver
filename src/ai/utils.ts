'use server';

/**
 * @fileOverview Utilities for AI flows.
 */

/**
 * Resolves the AI model to use for a Genkit flow.
 * It defaults to 'gemini-1.5-flash-latest' if no model is provided.
 * It also ensures that only the 'googleai' provider is used.
 * @param aiModel - The model identifier from user settings.
 * @returns The fully qualified model name string.
 */
export async function resolveModel(aiModel: string | undefined | null): Promise<string> {
    const defaultModel = 'gemini-1.5-flash-latest';
    
    const modelToUse = (aiModel && aiModel.includes('/')) 
      ? aiModel 
      : `googleai/${aiModel || defaultModel}`;

    const [providerName] = modelToUse.split('/');
    if (providerName !== 'googleai') {
        // This is a safeguard. The UI should ideally prevent this.
        throw new Error(`Provider "${providerName}" is not supported or configured. Please use a 'googleai' model or update the application to include the necessary plugin.`);
    }
    
    return modelToUse;
}
