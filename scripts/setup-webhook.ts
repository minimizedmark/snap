#!/usr/bin/env npx tsx

/**
 * Quick script to create your SnapCalls Stripe webhook
 * Run: npx tsx scripts/setup-webhook.ts
 */

import { createSnapCallsWebhook } from '../src/lib/webhook-utils';

async function main() {
  console.log('Setting up SnapCalls Stripe webhook...\n');

  await createSnapCallsWebhook();

  console.log('\nDone! Copy the webhook secret to your .env file.');
  console.log('Tip: Test with `stripe trigger payment_intent.succeeded`');
}

main().catch(console.error);
