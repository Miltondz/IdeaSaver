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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set in the environment variables.");
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
    // The commerceOrder must be unique for each payment attempt.
    const commerceOrder = `ideas-pro-${input.plan}-${input.userId}-${Date.now()}`;

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
