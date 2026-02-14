import Stripe from 'stripe';

/**
 * Creates a Stripe webhook endpoint for SnapCalls.
 *
 * Registers a webhook that listens for payment and subscription events
 * at /api/webhooks/stripe.
 *
 * Requires STRIPE_SECRET_KEY and APP_URL environment variables.
 */
export async function createSnapCallsWebhook() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Add it to your .env file.');
  }

  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) {
    throw new Error('APP_URL (or NEXTAUTH_URL) is not set. Add it to your .env file.');
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });

  const webhookUrl = `${appUrl}/api/webhooks/stripe`;

  // Check if a webhook for this URL already exists
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((wh) => wh.url === webhookUrl);

  if (match) {
    console.log(`Webhook already exists for ${webhookUrl}`);
    console.log(`  ID:     ${match.id}`);
    console.log(`  Status: ${match.status}`);
    console.log(`  Secret: (use the secret from when it was first created)`);
    return match;
  }

  const webhook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ],
    description: 'SnapCalls webhook',
  });

  console.log(`Webhook created successfully!`);
  console.log(`  URL:    ${webhook.url}`);
  console.log(`  ID:     ${webhook.id}`);
  console.log(`  Secret: ${webhook.secret}`);
  console.log(`\nAdd this to your .env file:`);
  console.log(`  STRIPE_WEBHOOK_SECRET=${webhook.secret}`);

  return webhook;
}
