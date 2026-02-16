/**
 * Test script: Greeting Recording & Retrieval
 *
 * Tests the full round-trip with your actual Twilio number:
 *   1. Set up the phone number (+15874028264) in the database
 *   2. Upload a greeting audio file to Supabase
 *   3. Save the URL to CompanyProfile
 *   4. Retrieve it via phone number lookup (same as incoming call webhook)
 *
 * Usage: npx tsx scripts/test-greeting.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const TWILIO_PHONE = '+15874028264';
const USER_ID = 'cmlm63hnl0000kw04op63qsos'; // mark@smartbizai.store

async function main() {
  console.log('\n=== Greeting Recording & Retrieval Test ===');
  console.log(`    Twilio number: ${TWILIO_PHONE}\n`);

  // --- Step 1: Ensure the phone number is in the database ---
  console.log('Step 1: Setting up Twilio phone number in database...');

  const existing = await prisma.twilioConfig.findUnique({
    where: { userId: USER_ID },
  });

  if (existing) {
    await prisma.twilioConfig.update({
      where: { userId: USER_ID },
      data: { phoneNumber: TWILIO_PHONE },
    });
    console.log(`  Updated existing TwilioConfig: ${existing.phoneNumber} → ${TWILIO_PHONE}`);
  } else {
    console.error('ERROR: No TwilioConfig found for user. Run onboarding first.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    include: { businessSettings: true, companyProfile: true },
  });

  console.log(`  User: ${user!.email}`);
  console.log(`  Business: ${user!.businessSettings?.businessName || '(not set)'}`);

  // --- Step 2: Upload a test greeting to Supabase ---
  console.log('\nStep 2: Uploading test greeting audio to Supabase...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Generate a simple WAV file (1 second of silence — valid audio)
  const sampleRate = 8000;
  const numSamples = sampleRate * 1;
  const wavBuffer = createTestWav(sampleRate, numSamples);

  const cleanPhone = TWILIO_PHONE.replace(/\+/g, '');
  const fileName = `greetings/${USER_ID}_${cleanPhone}.wav`;

  // Clean up any existing file
  await supabase.storage.from('audio').remove([fileName]);

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(fileName, wavBuffer, {
      contentType: 'audio/wav',
      upsert: true,
    });

  if (uploadError) {
    console.error('  Upload FAILED:', uploadError.message);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage
    .from('audio')
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;
  console.log(`  Uploaded: ${publicUrl}`);

  // --- Step 3: Save the greeting URL to CompanyProfile ---
  console.log('\nStep 3: Saving greeting URL to CompanyProfile...');

  await prisma.companyProfile.upsert({
    where: { userId: USER_ID },
    create: {
      userId: USER_ID,
      greetingAudioUrl: publicUrl,
      greetingScript: 'Thank you for calling! Please leave a message and we will get back to you shortly.',
    },
    update: {
      greetingAudioUrl: publicUrl,
      greetingScript: 'Thank you for calling! Please leave a message and we will get back to you shortly.',
    },
  });

  console.log('  Saved to database.');

  // --- Step 4: Retrieve greeting by phone number (simulates incoming call) ---
  console.log('\nStep 4: Retrieving greeting via phone number lookup (simulating incoming call to ${TWILIO_PHONE})...');

  const lookup = await prisma.twilioConfig.findFirst({
    where: { phoneNumber: TWILIO_PHONE },
    include: {
      user: {
        include: {
          companyProfile: true,
          businessSettings: true,
        },
      },
    },
  });

  if (!lookup?.user) {
    console.error('  FAIL: Phone number lookup returned no user');
    process.exit(1);
  }

  const result = {
    phoneNumber: TWILIO_PHONE,
    businessName: lookup.user.businessSettings?.businessName || null,
    greetingAudioUrl: lookup.user.companyProfile?.greetingAudioUrl || null,
    greetingScript: lookup.user.companyProfile?.greetingScript || null,
    hasCustomGreeting: !!lookup.user.companyProfile?.greetingAudioUrl,
  };

  console.log('  Response (same as GET /api/twilio/greeting/15874028264):');
  console.log(JSON.stringify(result, null, 4));

  // --- Step 5: Verify ---
  console.log('\n=== Results ===\n');

  const tests = [
    { name: 'Phone number in DB', pass: !!lookup },
    { name: 'Upload → Store', pass: !!publicUrl },
    { name: 'Store → Retrieve URL match', pass: result.greetingAudioUrl === publicUrl },
    { name: 'hasCustomGreeting = true', pass: result.hasCustomGreeting === true },
    { name: 'Greeting script saved', pass: !!result.greetingScript },
  ];

  let allPassed = true;
  for (const t of tests) {
    console.log(`  ${t.pass ? 'PASS ✓' : 'FAIL ✗'}  ${t.name}`);
    if (!t.pass) allPassed = false;
  }

  if (allPassed) {
    console.log('\n  All tests passed!');
    console.log(`  When someone calls ${TWILIO_PHONE}, the greeting at:`);
    console.log(`    ${publicUrl}`);
    console.log('  will play before recording their message.\n');
  } else {
    console.log('\n  Some tests failed. Check output above.\n');
    process.exit(1);
  }
}

/** Creates a minimal valid WAV file buffer (silence) */
function createTestWav(sampleRate: number, numSamples: number): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = numSamples * 2; // 16-bit mono

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);         // PCM
  header.writeUInt16LE(1, 22);         // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, Buffer.alloc(dataSize, 0)]);
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
