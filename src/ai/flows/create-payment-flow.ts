'use server';
/**
 * @fileOverview A flow for creating payment orders with the Flow payment gateway.
 *
 * - createPayment - A function that handles the payment creation process.
 * - CreatePaymentInput - The input type for the createPayment function.
 * - CreatePaymentOutput - The return type for the createPayment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createPaymentOrder } from '@/lib/flow';

// --- TEMPORARY DEBUGGING STEP ---
// Hardcoding the URL to bypass any potential issues with the .env file.
// The correct URL was identified from previous error messages.
// This should be reverted to use process.env.NEXT_PUBLIC_APP_URL once the .env loading issue is resolved.
const APP_URL = "https://3000-idx-b-f8a69e7e-b7d6-4441-9498-89ea9331003f.europe-west1.google.com";

if (!APP_URL) {
    throw new Error("Application URL is not set. This is a critical configuration error.");
}

const CreatePaymentInputSchema = z.object({
  userId: z.string().describe('The unique ID of the user initiating the payment.'),
  userEmail: z.string().email().describe('The email of the user.'),
  plan: z.enum(['monthly', 'yearly']).describe('The selected subscription plan.'),
  planName: z.string().describe('The display name of the plan.'),
  amount: z.number().describe('The amount to be charged.'),
  currency: z.string().default('CLP').describe('The currency of the charge.'),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

const CreatePaymentOutputSchema = z.object({
  redirectUrl: z.string().describe('The URL to redirect the user to for payment.'),
});
export type CreatePaymentOutput = z.infer<typeof CreatePaymentOutputSchema>;

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
  return createPaymentFlow(input);
}

const createPaymentFlow = ai.defineFlow(
  {
    name: 'createPaymentFlow',
    inputSchema: CreatePaymentInputSchema,
    outputSchema: CreatePaymentOutputSchema,
  },
  async (input) => {
    // The commerceOrder must be unique and <= 45 chars.
    // Format: is-{m|y}-{userId}-{timestamp_base36}
    // Example: is-m-28charsFirebaseUID-k1fsl0a1k -> 3+1+1+28+1+9 = 43 chars
    const planChar = input.plan.charAt(0);
    const shortTimestamp = Date.now().toString(36);
    const commerceOrder = `is-${planChar}-${input.userId}-${shortTimestamp}`;

    const paymentDetails = {
        commerceOrder,
        subject: `Idea Saver Pro - ${input.planName}`,
        amount: input.amount,
        currency: input.currency,
        email: input.userEmail,
        urlConfirmation: `${APP_URL}/api/flow/confirm`,
        urlReturn: `${APP_URL}/payment/status`,
        // For Flow in Chile, 9 = All payment methods
        paymentMethod: 9
    };
    
    const flowResponse = await createPaymentOrder(paymentDetails);
    const redirectUrl = `${flowResponse.url}?token=${flowResponse.token}`;

    return { redirectUrl };
  }
);
