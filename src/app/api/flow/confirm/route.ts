
import { type NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/flow';
import { getSettings, saveSettings } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    if (!token) {
      console.error('Flow confirmation: Token is missing from POST body');
      return NextResponse.json({ error: 'Token is missing' }, { status: 400 });
    }
    
    console.log(`Flow confirmation: Received token ${token}`);
    const paymentStatus = await getPaymentStatus(token);

    // Status 2 means paid
    if (paymentStatus.status === 2) {
      console.log(`Flow confirmation: Payment successful for token ${token}`);
      const commerceOrder = paymentStatus.commerceOrder;
      
      // Parse the custom commerceOrder format: is-{m|y}-{userId}-{timestamp}
      const parts = commerceOrder.split('-');
      let userId: string | undefined;
      let planType: 'monthly' | 'yearly' | undefined;

      if (parts.length === 4 && parts[0] === 'is') {
        userId = parts[2];
        planType = parts[1] === 'm' ? 'monthly' : 'yearly';
      }

      if (userId && planType) {
        console.log(`Flow confirmation: Upgrading user ${userId} to Pro (${planType})`);
        const settings = await getSettings(userId);
        
        const subscriptionEndDate = new Date();
        if (planType === 'yearly') {
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        } else {
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        }

        const newSettings = {
          ...settings,
          isPro: true,
          planSelected: true,
          cloudSyncEnabled: true,
          autoCloudSync: true,
          subscriptionEndsAt: subscriptionEndDate.toISOString(),
          proTrialEndsAt: undefined, // Clear any old trial data
          proTrialUsed: true, // Mark as paid to prevent any future trial logic
        };

        await saveSettings(newSettings, userId);
        console.log(`Flow confirmation: User ${userId} successfully upgraded.`);
      } else {
        console.error(`Flow confirmation: Could not parse userId and planType from commerceOrder: ${commerceOrder}`);
      }
    } else {
      console.log(`Flow confirmation: Payment status for token ${token} is not 'paid' (status: ${paymentStatus.status}). No action taken.`);
    }
    
    // Acknowledge receipt to Flow
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Flow confirmation webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
