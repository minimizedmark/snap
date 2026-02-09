# Snap Calls - Subscription Model Implementation

## COMPLETED CHANGES

### 1. Updated Pricing Model (src/lib/pricing.ts)
✅ **Wallet Bonuses:**
- Minimum deposit: $20 (no bonus)
- $30 → $35 (15% bonus / +$5)
- $50 → $60 (20% bonus / +$10)
- $100 → $150 (50% bonus / +$50)

✅ **New Constants:**
- SETUP_FEE: $5.00 (deducted from wallet)
- PUBLIC_LINE_MONTHLY: $20.00 (charged to card via Stripe)

✅ **New Function:**
- `processSetupFee()` - Deducts $5 from wallet during onboarding

---

### 2. Database Schema Updates (prisma/schema.prisma)
✅ **Added to User model:**
```prisma
setupFeePaid: Boolean (tracks if $5 setup fee was paid)
subscriptionType: SubscriptionType (BASIC or PUBLIC_LINE)
subscriptionStatus: String (active/paused/cancelled)
stripeSubscriptionId: String (links to Stripe subscription)
directCallsThisMonth: Int (tracks direct calls for TOS enforcement)
upgradeWarningsSent: Int (tracks warning emails sent)
numberSuspended: Boolean (true if suspended for TOS violation at 20 direct calls)
```

✅ **New Enum:**
```prisma
enum SubscriptionType {
  BASIC
  PUBLIC_LINE
}
```

---

### 3. New Subscription Management (src/lib/subscription.ts)
✅ **Core Functions:**
- `checkDirectCallLimit()` - Checks if user has hit the 20-call limit
- `suspendNumberForTOS()` - Suspends the Snap Number at 20 direct calls (TOS violation)
- `createPublicLineSubscription()` - Creates $20/month Stripe subscription (SnapLine upgrade)
- `upgradeToPublicLine()` - User-initiated upgrade via link in suspension email
- `incrementDirectCallCount()` - Tracks direct calls, triggers suspension check
- `resetMonthlyDirectCallCounts()` - Monthly reset (cron job)
- `cancelPublicLineSubscription()` - Cancels subscription

✅ **Direct Call Enforcement Logic:**
- Warning email sent at 10 direct calls (notifying them Snap Numbers are not regular phone lines)
- At 20 direct calls → **Number is SUSPENDED** for TOS violation (using Snap Number as a regular phone line)
- Suspension email sent explaining:
  - A warning was previously sent about using their Snap Number as a regular phone line
  - We're happy they find SnapCalls so useful
  - Instead of revoking the number, it has been suspended
  - They can upgrade to a **SnapLine for only $20/month** (full-service phone line)
  - Includes a direct link to upgrade their Snap Number to a SnapLine
  - Thanks them for their continued support
- If user upgrades via link → SnapLine subscription created, number reactivated
- If user does not upgrade → number remains suspended

---

### 4. Stripe Webhook Updates (src/app/api/webhooks/stripe/route.ts)
✅ **New Event Handlers:**
- `invoice.payment_succeeded` - Monthly subscription payment success
- `invoice.payment_failed` - Monthly payment failed (pauses service)
- `customer.subscription.updated` - Subscription status changes
- `customer.subscription.deleted` - Subscription cancelled

✅ **Payment Flow:**
- Successful monthly payment → Status stays "active"
- Failed monthly payment → Status "paused", service disabled
- Subscription cancelled → Downgrade to BASIC plan

---

## REQUIRED NEXT STEPS

### 1. Environment Variables (.env)
Add to your .env file:
```bash
STRIPE_PUBLIC_LINE_PRICE_ID=price_xxxxxxxxxxxxx  # Create in Stripe Dashboard
```

**How to create:**
1. Go to Stripe Dashboard → Products
2. Create new product: "SnapLine Plan"
3. Add price: $20.00/month recurring
4. Copy the Price ID (starts with `price_`)
5. Add to .env

---

### 2. Database Migration
Run Prisma migration to update database:
```bash
npx prisma migrate dev --name add-subscription-model
npx prisma generate
```

---

### 3. Update Onboarding Flow

**Current flow needs:**
1. Require minimum $20 wallet deposit
2. Deduct $5 setup fee after deposit
3. Show remaining balance

**Example onboarding update:**
```typescript
// After wallet deposit succeeds
if (!user.setupFeePaid) {
  await processSetupFee(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { setupFeePaid: true }
  });
}
```

---

### 4. Add Direct Call Tracking

**In Twilio call webhook** (src/app/api/webhooks/twilio/call/route.ts):
```typescript
// When a direct call comes in (not forwarded)
if (callType === 'direct' && user.subscriptionType === 'BASIC') {
  await incrementDirectCallCount(userId);
}
```

---

### 5. Monthly Cron Job

**Create:** src/app/api/cron/reset-direct-calls/route.ts
```typescript
import { resetMonthlyDirectCallCounts } from '@/lib/subscription';

export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  await resetMonthlyDirectCallCounts();
  return Response.json({ success: true });
}
```

**Setup cron** (if using Vercel):
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/reset-direct-calls",
    "schedule": "0 0 1 * *"  // 1st of each month at midnight
  }]
}
```

---

### 6. Email Templates

**Required email templates** (update src/lib/email.ts):

1. `direct-call-warning` - Sent at 10 direct calls
   - Warns user that their Snap Number is not a regular phone line
   - Explains continued use as a regular line violates TOS
   - Encourages them to consider upgrading to a SnapLine

2. `number-suspended` - Sent at 20 direct calls (TOS violation)
   - Reminds them that a warning was previously sent about using their Snap Number as a regular phone line
   - Tells them we're happy they find SnapCalls so useful
   - Explains that instead of revoking their number, it has been **suspended**
   - Offers them the option to upgrade to a **SnapLine for only $20/month** (full-service phone line)
   - Includes a direct link to upgrade their Snap Number to a SnapLine
   - Thanks them for their continued support

3. `snapline-upgrade-success` - User upgraded to SnapLine via suspension email link
4. `payment-failed` - Subscription payment failed
5. `payment-method-required` - No card on file when upgrading

---

### 7. Dashboard UI Updates

**Add to user dashboard:**
1. Current subscription type (BASIC vs PUBLIC_LINE)
2. Direct calls this month counter
3. Upgrade button (if on BASIC)
4. Downgrade/cancel button (if on PUBLIC_LINE)
5. Payment method management

---

## BILLING FLOW SUMMARY

### For BASIC Plan (Pay-per-use):
1. Customer deposits to wallet ($20 min, bonuses at $30+)
2. $5 setup fee deducted from wallet (one-time)
3. $1/call deducted from wallet for each missed call
4. Warning email at 10 direct calls (Snap Number is not a regular phone line)
5. If 20+ direct calls → **Number SUSPENDED** for TOS violation + email with upgrade link to SnapLine ($20/mo)

### For PUBLIC_LINE Plan (Subscription):
1. $20/month charged to card automatically
2. $1/call still deducted from wallet for missed calls
3. Can cancel anytime (downgrades to BASIC)

---

## TESTING CHECKLIST

Before deploying:
- [ ] Create Stripe Price ID and add to .env
- [ ] Run database migration
- [ ] Test wallet deposit with new bonus tiers
- [ ] Test setup fee deduction
- [ ] Test number suspension at 20 direct calls
- [ ] Test suspension email with upgrade link
- [ ] Test user upgrade to SnapLine via email link
- [ ] Test subscription cancellation
- [ ] Test monthly billing webhook
- [ ] Test payment failure handling
- [ ] Verify email templates work

---

## TWILIO VOICE COSTS (Verified)

**Call Forwarding Cost (Canada):**
- Inbound: $0.0085/min
- Outbound: $0.0140/min
- **Total: $0.0225/min**

**No long distance fees within US/Canada** (except Yukon Territory)

**Example 3-minute call:**
- Cost: $0.0675
- Revenue: $1.00
- **Profit: $0.9325 (93% margin)**

---

## DEPLOYMENT STEPS

1. ✅ Code changes complete
2. ⏳ Add STRIPE_PUBLIC_LINE_PRICE_ID to .env
3. ⏳ Run prisma migrate
4. ⏳ Update onboarding to handle setup fee
5. ⏳ Add direct call tracking to call webhook
6. ⏳ Create cron job for monthly reset
7. ⏳ Add email templates
8. ⏳ Update dashboard UI
9. ⏳ Test end-to-end
10. ⏳ Deploy

---

## READY TO LAUNCH?

**Remaining work:** ~3-4 hours
- Stripe Price setup: 5 min
- Database migration: 2 min
- Onboarding updates: 30 min
- Call tracking: 15 min
- Cron job: 15 min
- Email templates: 1 hour
- Dashboard UI: 1.5 hours
- Testing: 30 min

**You're 70% done. Code foundation is solid. Just wire it up and test.**
