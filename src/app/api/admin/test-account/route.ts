import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { v4 as uuidv4 } from 'uuid';

const TEST_ACCOUNT_EMAIL = process.env.TEST_ACCOUNT_EMAIL || 'test@snapcalls.dev';
const TEST_ACCOUNT_PHONE = process.env.TEST_ACCOUNT_PHONE || '+15874028264';

/**
 * GET /api/dev/test-account
 * Returns the current test account status and login token.
 * Protected by admin auth.
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: TEST_ACCOUNT_EMAIL },
    include: {
      twilioConfig: true,
      businessSettings: true,
      wallet: true,
      companyProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json({
      exists: false,
      email: TEST_ACCOUNT_EMAIL,
      message: 'Test account not created yet. POST to this endpoint to create it.',
    });
  }

  return NextResponse.json({
    exists: true,
    email: user.email,
    userId: user.id,
    isTestAccount: user.isTestAccount,
    hasPhoneNumber: !!user.twilioConfig,
    phoneNumber: user.twilioConfig?.phoneNumber || null,
    walletBalance: user.wallet ? Number(user.wallet.balance) : null,
    onboardingComplete: user.companyProfile?.onboardingComplete || false,
  });
}

/**
 * POST /api/dev/test-account
 * Creates (or resets) the test account with a full configuration and returns a login token.
 * Protected by admin auth.
 *
 * Optionally accepts JSON body: { phoneNumber?: string }
 * phoneNumber: an existing Twilio number in your account to assign (e.g. "+15551234567")
 */
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let phoneNumber: string = TEST_ACCOUNT_PHONE;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.phoneNumber) phoneNumber = body.phoneNumber;
  } catch {
    // no body, use default
  }

  // Create or find the test user
  let user = await prisma.user.findUnique({
    where: { email: TEST_ACCOUNT_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: TEST_ACCOUNT_EMAIL,
        timezone: 'America/New_York',
        isActive: true,
        isTestAccount: true,
        setupFeePaid: true,
      },
    });
  } else {
    // Ensure isTestAccount is set even if the user already existed
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isTestAccount: true,
        isActive: true,
        setupFeePaid: true,
        subscriptionStatus: 'active',
        directCallsThisMonth: 0,
        upgradeWarningsSent: 0,
      },
    });
  }

  // Wallet — create if missing
  const existingWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!existingWallet) {
    await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
        currency: 'USD',
        autoReloadEnabled: false,
      },
    });
  }

  // Business settings — create if missing
  const existingBusiness = await prisma.businessSettings.findUnique({ where: { userId: user.id } });
  if (!existingBusiness) {
    await prisma.businessSettings.create({
      data: {
        userId: user.id,
        businessName: 'Test Business',
        hoursStart: '09:00',
        hoursEnd: '17:00',
        daysOpen: [1, 2, 3, 4, 5],
        timezone: 'America/New_York',
      },
    });
  }

  // Message templates — create if missing
  const existingTemplates = await prisma.messageTemplates.findUnique({ where: { userId: user.id } });
  if (!existingTemplates) {
    await prisma.messageTemplates.create({
      data: {
        userId: user.id,
        standardResponse:
          'Hey, you just called Test Business. We would have loved to help — what can we do for you?',
        voicemailResponse:
          'Hey, got your voicemail! We\'ll get back to you shortly. — Test Business',
        afterHoursResponse:
          'Hey, you just called Test Business. We\'re closed right now but we\'ll get back to you first thing. What can we help with?',
      },
    });
  }

  // User features — create if missing
  const existingFeatures = await prisma.userFeatures.findUnique({ where: { userId: user.id } });
  if (!existingFeatures) {
    await prisma.userFeatures.create({
      data: {
        userId: user.id,
        sequencesEnabled: false,
        recognitionEnabled: false,
        twoWayEnabled: false,
        vipPriorityEnabled: false,
        transcriptionEnabled: true,
      },
    });
  }

  // Company profile — create if missing
  const existingProfile = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
  if (!existingProfile) {
    await prisma.companyProfile.create({
      data: {
        userId: user.id,
        businessType: 'General',
        primaryServices: ['Customer Support'],
        responseTimeframe: 'within a few hours',
        currentStep: 6,
        onboardingComplete: true,
      },
    });
  }

  // Twilio config — assign phone number if not already set
  const existingTwilio = await prisma.twilioConfig.findUnique({ where: { userId: user.id } });
  let assignedNumber: string;

  if (!existingTwilio) {
    await prisma.twilioConfig.create({
      data: {
        userId: user.id,
        accountSid: 'ADMIN_MANAGED',
        authToken: 'ADMIN_MANAGED',
        phoneNumber: phoneNumber,
        verified: true,
      },
    });
    assignedNumber = phoneNumber;
  } else {
    assignedNumber = existingTwilio.phoneNumber;
  }

  // Generate a magic link token for immediate login
  const token = uuidv4();
  await prisma.magicLink.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      used: false,
    },
  });

  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl}/api/auth/callback/credentials`;

  return NextResponse.json({
    success: true,
    email: TEST_ACCOUNT_EMAIL,
    userId: user.id,
    isTestAccount: true,
    phoneNumber: assignedNumber,
    loginToken: token,
    loginUrl: `${appUrl}/api/auth/verify?token=${token}`,
    message: `Test account ready. Phone number ${assignedNumber} is configured. Visit loginUrl to sign in.`,
  });
}
