# Testing Subscription Affiliate Referrals

This guide explains how to test the subscription referral system end-to-end.

## Overview

The subscription referral system allows affiliates to refer new users to subscribe to the platform itself, earning 50% recurring commission ($20/month per active referral).

## Testing Flow

### Step 1: Generate a Referral Code (as Affiliate)

1. **Login as an affiliate** at `/affiliate`
2. **Navigate to the affiliate dashboard** - you should see the "Platform Subscription" product section
3. **Generate a referral code**:
   - The referral link should be visible in the "Platform Subscription" section
   - If not visible, you can manually call: `POST /api/referral/generate`
   - This creates a referral code in the `referral_codes` table

**Expected Result:**
- You get a referral URL like: `https://yourdomain.com/signup?ref=ABC12345`
- The code is stored in `referral_codes` table with `is_active = true`

### Step 2: Sign Up with Referral Code (as New User)

1. **Open the referral URL** in an incognito/private window:
   ```
   https://yourdomain.com/signup?ref=YOUR_CODE
   ```

2. **Complete signup** with a NEW email address (different from the affiliate's email)

**Expected Result:**
- A new affiliate record is created in `affiliates` table
- A `subscription_referrals` record is created with:
  - `referrer_id` = the affiliate who generated the code
  - `referred_id` = the new user's affiliate ID
  - `referral_code` = the code used
  - `status` = 'pending'
  - `subscription_id` = NULL (will be set when they subscribe)

**Verify in Database:**
```sql
SELECT * FROM subscription_referrals 
WHERE referral_code = 'YOUR_CODE' 
ORDER BY created_at DESC;
```

### Step 3: Subscribe to Platform (as New User)

1. **Login as the new user** you just created
2. **Subscribe to the platform**:
   - Go through the subscription checkout flow
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete the payment

**Expected Result:**
- Stripe webhook `checkout.session.completed` fires
- The `subscription_referrals` record is updated:
  - `status` = 'active'
  - `subscription_id` = Stripe subscription ID
  - `first_commission_paid_at` = current timestamp
- A `subscription_commissions` record is created:
  - `amount_cents` = 2000 (50% of $40 = $20)
  - `subscription_amount_cents` = 4000 ($40)
  - `commission_percent` = 50
  - `status` = 'approved'
  - `period_start` = current date
  - `period_end` = 30 days from now

**Verify in Database:**
```sql
-- Check referral is active
SELECT * FROM subscription_referrals 
WHERE referral_code = 'YOUR_CODE';

-- Check first commission was created
SELECT * FROM subscription_commissions 
WHERE referral_id = (
  SELECT id FROM subscription_referrals 
  WHERE referral_code = 'YOUR_CODE'
);
```

### Step 4: Check Referral Stats (as Affiliate)

1. **Login as the original affiliate**
2. **Go to `/affiliate` dashboard**
3. **Check the "Platform Subscription" section**:
   - Should show "Active Referrals: 1"
   - Should show "MRR: $20" (Monthly Recurring Revenue)

**Or check via API:**
```bash
GET /api/referral/stats
```

**Expected Response:**
```json
{
  "referralCode": "YOUR_CODE",
  "activeReferrals": 1,
  "totalCommissions": 2000,
  "pendingCommissions": 0,
  "paidCommissions": 0,
  "monthlyRecurringRevenue": 2000
}
```

### Step 5: Test Recurring Commissions (Monthly)

When the subscription renews monthly, Stripe sends `customer.subscription.updated` webhook:

**Expected Result:**
- A new `subscription_commissions` record is created for each billing period
- Each commission is $20 (50% of $40 subscription)

**To Test Manually:**
1. Use Stripe CLI to simulate webhook:
   ```bash
   stripe trigger customer.subscription.updated
   ```
2. Or manually trigger in Stripe Dashboard → Webhooks → Send test webhook

**Verify:**
```sql
SELECT * FROM subscription_commissions 
WHERE referrer_id = 'AFFILIATE_ID'
ORDER BY created_at DESC;
```

### Step 6: Test Subscription Cancellation

1. **Cancel the subscription** in Stripe Dashboard or via API
2. **Stripe sends** `customer.subscription.updated` with `status = 'canceled'`

**Expected Result:**
- `subscription_referrals.status` = 'cancelled'
- Future `subscription_commissions` records are marked as 'cancelled'
- No new commissions are created

## Database Queries for Testing

### Check All Referrals for an Affiliate
```sql
SELECT 
  sr.*,
  referrer.email as referrer_email,
  referred.email as referred_email
FROM subscription_referrals sr
JOIN affiliates referrer ON sr.referrer_id = referrer.id
JOIN affiliates referred ON sr.referred_id = referred.id
WHERE sr.referrer_id = 'YOUR_AFFILIATE_ID'
ORDER BY sr.created_at DESC;
```

### Check All Commissions for an Affiliate
```sql
SELECT 
  sc.*,
  sr.referral_code,
  referred.email as referred_email
FROM subscription_commissions sc
JOIN subscription_referrals sr ON sc.referral_id = sr.id
JOIN affiliates referred ON sr.referred_id = referred.id
WHERE sc.referrer_id = 'YOUR_AFFILIATE_ID'
ORDER BY sc.created_at DESC;
```

### Check Active Referrals Count
```sql
SELECT COUNT(*) as active_count
FROM subscription_referrals
WHERE referrer_id = 'YOUR_AFFILIATE_ID'
AND status = 'active';
```

### Check MRR (Monthly Recurring Revenue)
```sql
SELECT SUM(amount_cents) as mrr_cents
FROM subscription_commissions
WHERE referrer_id = 'YOUR_AFFILIATE_ID'
AND status = 'approved'
AND period_start >= date_trunc('month', CURRENT_DATE);
```

## Common Issues & Debugging

### Issue: Referral code not working
- **Check:** Is the code in `referral_codes` table with `is_active = true`?
- **Check:** Is the URL parameter `ref` being read correctly? (Check browser console)

### Issue: Referral not activating after subscription
- **Check:** Is the Stripe webhook configured correctly?
- **Check:** Webhook logs in Stripe Dashboard
- **Check:** Server logs for webhook processing errors
- **Verify:** `subscription_referrals` record exists before subscription

### Issue: Commissions not being created
- **Check:** Is the subscription status 'active' in Stripe?
- **Check:** Does `subscription_referrals` have `status = 'active'`?
- **Check:** Webhook is receiving `customer.subscription.created` or `customer.subscription.updated`

### Issue: Self-referral detected
- **Check:** The system prevents self-referrals (same email)
- **Solution:** Use a different email address for the referred user

## Stripe Test Cards

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

## Testing Checklist

- [ ] Generate referral code
- [ ] Sign up with referral code (new email)
- [ ] Verify `subscription_referrals` record created (status: pending)
- [ ] Subscribe to platform
- [ ] Verify referral activated (status: active)
- [ ] Verify first commission created ($20)
- [ ] Check stats show active referral and MRR
- [ ] Test recurring commission (monthly renewal)
- [ ] Test cancellation (commissions stop)

## API Endpoints

- `POST /api/referral/generate` - Generate referral code
- `GET /api/referral/stats` - Get referral statistics
- `POST /api/auth/signup` - Sign up with referral code (via `referral_code` param)
- Stripe Webhooks:
  - `checkout.session.completed` - First subscription payment
  - `customer.subscription.created` - Subscription created
  - `customer.subscription.updated` - Subscription updated (renewals, cancellations)


