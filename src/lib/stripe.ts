import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!STRIPE_SECRET_KEY) {
  console.warn('⚠️  Stripe secret key not configured');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

/**
 * Creates a Stripe customer
 */
export async function createStripeCustomer(email: string): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    metadata: {
      source: 'snapback',
    },
  });

  return customer.id;
}

/**
 * Creates a payment intent for wallet deposit
 */
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  metadata?: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    metadata: {
      ...metadata,
      type: 'wallet_deposit',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Attaches a payment method to a customer
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<void> {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * Charges a customer's saved payment method
 */
export async function chargePaymentMethod(
  customerId: string,
  paymentMethodId: string,
  amount: number,
  description: string
): Promise<string> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    description,
    metadata: {
      type: 'auto_reload',
    },
    return_url: `${process.env.APP_URL}/wallet`,
  });

  return paymentIntent.id;
}

/**
 * Validates Stripe webhook signature
 */
export function validateStripeWebhook(payload: string, signature: string): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Gets payment method details
 */
export async function getPaymentMethod(paymentMethodId: string) {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

/**
 * Lists customer's payment methods
 */
export async function listPaymentMethods(customerId: string) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Detaches a payment method from a customer
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  await stripe.paymentMethods.detach(paymentMethodId);
}
