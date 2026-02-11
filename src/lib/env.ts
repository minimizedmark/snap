/**
 * Environment variables validation and typing
 * Secure handling with production validation
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Gets a required environment variable
 * In production: throws error if missing
 * In development: returns dev fallback with warning
 */
function getRequiredEnv(key: string, devFallback: string): string {
  const value = process.env[key];
  
  if (!value) {
    if (isProduction) {
      // Don't throw here - collect all missing vars first
      return '';
    }
    
    // Development mode - use clearly labeled fallback
    console.warn(`⚠️  [ENV] Missing required env var: ${key} (using dev fallback)`);
    return `DEV_ONLY_${devFallback}`;
  }
  
  return value;
}

/**
 * Gets an optional environment variable with fallback
 */
function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Validates all required environment variables at startup
 * Throws a single error listing ALL missing vars in production
 */
export function validateEnv(): void {
  if (!isProduction) {
    console.log('🔧 [ENV] Running in development mode with fallbacks');
    return;
  }

  const requiredVars = [
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'NEXTAUTH_SECRET',
    'ADMIN_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'RESEND_API_KEY',
    'CRON_SECRET',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const errorMessage = `
❌ FATAL: Missing required environment variables in production:

${missing.map(key => `  - ${key}`).join('\n')}

Set these variables before deploying to production.
See README.md or .env.example for required configuration.
    `.trim();
    
    throw new Error(errorMessage);
  }

  console.log('✅ [ENV] All required environment variables validated');
}

// Validate on module load
validateEnv();

/**
 * Environment configuration object
 * Frozen to prevent runtime modification
 */
export const env = Object.freeze({
  // Database
  DATABASE_URL: getRequiredEnv('DATABASE_URL', 'postgresql://localhost:5432/snapcalls_dev'),
  
  // Encryption (32-byte hex key required — 64 hex chars)
  ENCRYPTION_KEY: getRequiredEnv('ENCRYPTION_KEY', '0000000000000000000000000000000000000000000000000000000000000000'),
  
  // NextAuth
  NEXTAUTH_SECRET: getRequiredEnv('NEXTAUTH_SECRET', 'nextauth-secret-dev-change-in-prod'),
  NEXTAUTH_URL: getOptionalEnv('NEXTAUTH_URL', 'http://localhost:3000'),
  APP_URL: getOptionalEnv('APP_URL', 'http://localhost:3000'),
  
  // Twilio
  TWILIO_ACCOUNT_SID: getRequiredEnv('TWILIO_ACCOUNT_SID', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  TWILIO_AUTH_TOKEN: getRequiredEnv('TWILIO_AUTH_TOKEN', 'your_auth_token_here_dev'),
  TWILIO_FROM_NUMBER: getOptionalEnv('TWILIO_FROM_NUMBER', '+15555551234'),
  
  // Stripe
  STRIPE_SECRET_KEY: getRequiredEnv('STRIPE_SECRET_KEY', 'sk_test_xxxxxxxxxxxxxxxxxxxxx'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: getOptionalEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_xxxxxxxxxxxxxxxxxxxxx'),
  STRIPE_BASIC_PRICE_ID: getOptionalEnv('STRIPE_BASIC_PRICE_ID', 'price_basic_xxxxxxxxxxxxx'),
  STRIPE_SNAPLINE_PRICE_ID: getOptionalEnv('STRIPE_SNAPLINE_PRICE_ID', 'price_snapline_xxxxxxxxxxxxx'),
  STRIPE_WEBHOOK_SECRET: getRequiredEnv('STRIPE_WEBHOOK_SECRET', 'whsec_xxxxxxxxxxxxxxxxxx'),
  
  // Email
  RESEND_API_KEY: getRequiredEnv('RESEND_API_KEY', 're_xxxxxxxxxxxxxxxxxxxx'),
  FROM_EMAIL: getOptionalEnv('FROM_EMAIL', 'dev@localhost'),
  
  // Admin
  ADMIN_PASSWORD: getRequiredEnv('ADMIN_PASSWORD', 'admin-dev-password-change-me'),
  ADMIN_EMAIL: getOptionalEnv('ADMIN_EMAIL', 'admin@localhost'),
  ADMIN_PHONE: getOptionalEnv('ADMIN_PHONE', '+15555550000'),
  
  // Cron
  CRON_SECRET: getRequiredEnv('CRON_SECRET', 'cron-secret-dev-change-in-prod'),
  
  // AI Services
  OPENAI_API_KEY: getOptionalEnv('OPENAI_API_KEY', ''), // Whisper-1 voicemail transcription
  DIALOGPT_ENDPOINT: getOptionalEnv('DIALOGPT_ENDPOINT', ''), // RunPod DialoGPT-medium endpoint
  RUNPOD_API_KEY: getOptionalEnv('RUNPOD_API_KEY', ''), // RunPod API key for auth
  
  // Node env
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),
  
  // Logging
  LOG_LEVEL: getOptionalEnv('LOG_LEVEL', 'info'),
});

export type EnvConfig = typeof env;
