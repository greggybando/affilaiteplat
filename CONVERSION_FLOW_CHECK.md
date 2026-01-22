# Conversion Flow Verification

## Complete Flow Checklist

### ✅ 1. Affiliate Link Click (`/go/[code]`)
**File:** `src/app/go/[code]/route.ts`
- ✅ Sets `aff` cookie with tracking code
- ✅ Sets `vid` cookie with visitor ID
- ✅ Records click in `clicks` table
- ✅ Redirects to landing page

**Status:** Working correctly

### ✅ 2. Landing Page (`/p/[product]/[page]`)
**File:** `src/app/p/[product]/[page]/page.tsx`
- ✅ Reads HTML from `public/landing/adhd-course.html`
- ✅ Sets `product` cookie via `ProductCookieSetter`
- ✅ Buy buttons link to `/checkout`

**Status:** Working correctly

### ✅ 3. Checkout Page (`/checkout`)
**File:** `src/app/checkout/page.tsx`
- ✅ Client-side component
- ✅ Calls `/api/checkout` POST
- ✅ Redirects to Stripe checkout

**Status:** Working correctly

### ✅ 4. Checkout API (`/api/checkout/route.ts`)
**File:** `src/app/api/checkout/route.ts`
- ✅ Reads cookies: `aff`, `vid`, `product`
- ✅ Looks up affiliate link by tracking code
- ✅ Looks up click record
- ✅ Creates Stripe session with metadata:
  - `affiliate_id`
  - `affiliate_link_id`
  - `click_id`
  - `visitor_id`
  - `product_id`

**Status:** Enhanced with logging - check terminal for cookie values

### ✅ 5. Webhook Endpoint (`/api/webhooks/stripe/route.ts`)
**File:** `src/app/api/webhooks/stripe/route.ts`
- ✅ Receives `checkout.session.completed` event
- ✅ Extracts metadata from session
- ✅ Inserts into `conversions` table
- ✅ Updates affiliate stats (if RPC exists)

**Status:** Enhanced with comprehensive logging

### ⚠️ 6. Stripe CLI
**Command:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- ⚠️ Needs to be running in separate terminal
- ⚠️ Must show webhook signing secret (starts with `whsec_`)
- ⚠️ Must be added to `.env.local` as `STRIPE_WEBHOOK_SECRET`

**Status:** Should be running (started in background)

## Debugging Steps

### Step 1: Verify Cookies Are Set
1. Click an affiliate link: `/go/XXXXX`
2. Open browser DevTools → Application → Cookies
3. Verify you see:
   - `aff` = tracking code
   - `vid` = visitor ID
   - `product` = product slug

### Step 2: Check Checkout API Logs
When you click "Get Instant Access", check your Next.js terminal for:
```
🍪 Cookies received: { affCode: '...', visitorId: '...', productSlug: '...' }
🔍 Looking up affiliate link...
✅ Affiliate link found: { affiliateId: '...', affiliateLinkId: '...' }
💳 Creating Stripe checkout session...
🏷️  Metadata to include: { affiliate_id: '...', ... }
```

### Step 3: Verify Stripe Session Metadata
After checkout session is created, the metadata should be in Stripe dashboard:
- Go to Stripe Dashboard → Payments → Check the session
- Look at "Metadata" section
- Should see: `affiliate_id`, `affiliate_link_id`, `click_id`, `visitor_id`, `product_id`

### Step 4: Check Webhook Logs
After payment completes, check Next.js terminal for:
```
🔔 WEBHOOK RECEIVED
💰 Processing checkout.session.completed event
🏷️  Session metadata: { affiliate_id: '...', ... }
💾 Inserting conversion into database...
✅ CONVERSION RECORDED SUCCESSFULLY!
```

## Common Issues

### Issue: Cookies Not Being Read
**Symptom:** Checkout API logs show `affCode: '(not set)'`
**Fix:** 
- Cookies might be httpOnly and not accessible
- Check if cookies are being set with correct path (`/`)
- Verify cookies are being sent with requests

### Issue: Affiliate Link Not Found
**Symptom:** Logs show "No affiliate link found for tracking code"
**Fix:**
- Verify tracking code exists in `affiliate_links` table
- Check that `tracking_code` column matches the cookie value
- Ensure affiliate link is active

### Issue: Metadata Not in Stripe Session
**Symptom:** Webhook receives empty metadata
**Fix:**
- Check checkout API logs to see what metadata was sent
- Verify Stripe session creation succeeded
- Check Stripe dashboard to see actual session metadata

### Issue: Webhook Not Receiving Events
**Symptom:** No webhook logs appear
**Fix:**
- Verify Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check Stripe CLI terminal for forwarded events
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe CLI

### Issue: Conversion Insert Fails
**Symptom:** Webhook logs show "ERROR INSERTING CONVERSION"
**Fix:**
- Check the error details in logs
- Verify `conversions` table schema matches
- Check that `affiliate_id` exists in `affiliates` table
- Verify all required fields are present

## Testing the Full Flow

1. **Create test affiliate link:**
   ```sql
   INSERT INTO affiliate_links (affiliate_id, landing_page_id, tracking_code)
   VALUES ('affiliate-uuid', 'landing-page-uuid', 'TEST123');
   ```

2. **Click affiliate link:**
   ```
   http://localhost:3000/go/TEST123
   ```

3. **Verify cookies set** (Browser DevTools)

4. **Click "Get Instant Access"**

5. **Check Next.js terminal** for checkout API logs

6. **Complete test payment** in Stripe

7. **Check both terminals:**
   - Stripe CLI: Should show event forwarded
   - Next.js: Should show webhook processing logs

8. **Verify in Supabase:**
   ```sql
   SELECT * FROM conversions ORDER BY converted_at DESC LIMIT 1;
   ```




















