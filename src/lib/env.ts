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
    'ADMIN_PASSWORD_HASH',
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
  
  // Encryption (32-byte key required)
  // Dev fallback is a valid 64-char hex key so validateEncryptionKey() passes without .env.
  // Generate your own for production:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: getRequiredEnv('ENCRYPTION_KEY', '0c859f62bd84ae7a2d144dbe96722a4fdbf0d3a7888bf9d8976021b388512f6e'),
  
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
  // ADMIN_PASSWORD_HASH: SHA-256 hash of admin password.
  // Generate with: node -e "console.log(require('crypto').createHash('sha256').update('yourpassword').digest('hex'))"
  ADMIN_PASSWORD_HASH: getRequiredEnv('ADMIN_PASSWORD_HASH', ''),
  ADMIN_EMAIL: getOptionalEnv('ADMIN_EMAIL', 'admin@localhost'),
  ADMIN_PHONE: getOptionalEnv('ADMIN_PHONE', '+15555550000'),
  
  // AI Write Bot — OpenAI-compatible endpoint (self-hosted or cloud)
  // AI_BASE_URL: your model server base URL (e.g. http://localhost:11434/v1)
  // AI_MODEL: model name to call (e.g. "qwen3-4b", "llama3", "gpt-4o-mini")
  // AI_API_KEY: optional — only needed if your server requires auth
  AI_BASE_URL: getOptionalEnv('AI_BASE_URL', ''),
  AI_MODEL: getOptionalEnv('AI_MODEL', 'gpt-4o-mini'),
  AI_API_KEY: getOptionalEnv('AI_API_KEY', ''),

  // OpenAI (for Whisper transcription only)
  OPENAI_API_KEY: getOptionalEnv('OPENAI_API_KEY', ''),

  // Cron
  CRON_SECRET: getRequiredEnv('CRON_SECRET', 'cron-secret-dev-change-in-prod'),
  
  // Node env
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development'),
  
  // Logging
  LOG_LEVEL: getOptionalEnv('LOG_LEVEL', 'info'),
});

export type EnvConfig = typeof env;
