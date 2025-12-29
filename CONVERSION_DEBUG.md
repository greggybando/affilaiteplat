# Conversion Tracking Debug Guide

## Quick Checklist

### 1. Did you come through an affiliate link?
**Required:** You MUST click an affiliate link first (e.g., `/go/XXXXX`) to set the `aff` cookie.

**Check:**
- Open browser DevTools → Application → Cookies
- Look for `aff` cookie with a tracking code
- If missing, conversions won't be tracked!

### 2. Is Stripe CLI running?
**Required:** For local development, Stripe CLI must forward webhooks.

**Check:**
```bash
# In a separate terminal, run:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Verify:**
- Terminal shows: "Ready! Your webhook signing secret is whsec_..."
- Copy this secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 3. Check Checkout API Logs
When you click "Get Instant Access", check your Next.js terminal for:

```
🍪 Cookies received: { affCode: 'XXXXX', ... }
🔍 Looking up affiliate link with tracking code: XXXXX
✅ Affiliate link found: { affiliateId: '...', affiliateLinkId: '...' }
💳 Creating Stripe checkout session...
🏷️  Metadata to include: { affiliate_id: '...', ... }
```

**If you see:**
- `affCode: '(not set)'` → You didn't come through an affiliate link
- `No affiliate link found` → Tracking code doesn't exist in database
- `affiliate_id: ''` → Affiliate lookup failed

### 4. Check Webhook Logs
After payment completes, check Next.js terminal for:

```
🔔 WEBHOOK RECEIVED
💰 Processing checkout.session.completed event
🏷️  Session metadata: { affiliate_id: '...', ... }
💾 Inserting conversion into database...
✅ CONVERSION RECORDED SUCCESSFULLY!
```

**If you see:**
- `No affiliate_id in metadata - skipping conversion` → No affiliate cookie was set
- `ERROR INSERTING CONVERSION` → Database issue (check error details)
- No webhook logs at all → Stripe CLI not running or webhook secret wrong

## Step-by-Step Test

1. **Create test affiliate link in Supabase:**
   ```sql
   -- First, get an affiliate ID
   SELECT id, email FROM affiliates LIMIT 1;
   
   -- Get a landing page ID
   SELECT id FROM landing_pages LIMIT 1;
   
   -- Create affiliate link (replace UUIDs)
   INSERT INTO affiliate_links (affiliate_id, landing_page_id, tracking_code)
   VALUES (
     'your-affiliate-uuid',
     'your-landing-page-uuid',
     'TEST123'
   );
   ```

2. **Click affiliate link:**
   ```
   http://localhost:3000/go/TEST123
   ```

3. **Verify cookies** (Browser DevTools → Application → Cookies):
   - `aff` = `TEST123`
   - `vid` = some ID
   - `product` = product slug

4. **Start Stripe CLI** (in separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the `whsec_...` secret to `.env.local`

5. **Click checkout button** and watch Next.js terminal for logs

6. **Complete test payment** in Stripe

7. **Check webhook logs** in Next.js terminal

8. **Verify in Supabase:**
   ```sql
   SELECT * FROM conversions ORDER BY converted_at DESC LIMIT 1;
   ```

## Common Issues & Fixes

### Issue: "No affiliate_id in metadata - skipping conversion"
**Cause:** User didn't come through affiliate link OR affiliate lookup failed

**Fix:**
1. Make sure you clicked `/go/XXXXX` first
2. Check browser cookies for `aff` cookie
3. Verify tracking code exists in `affiliate_links` table
4. Check checkout API logs for affiliate lookup errors

### Issue: No webhook logs at all
**Cause:** Stripe CLI not running OR webhook secret mismatch

**Fix:**
1. Start Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Copy the `whsec_...` secret
3. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Restart Next.js dev server

### Issue: "ERROR INSERTING CONVERSION"
**Cause:** Database constraint violation or missing data

**Fix:**
1. Check the error details in logs
2. Verify `affiliate_id` exists in `affiliates` table
3. Check `conversions` table schema matches
4. Ensure all required fields are present

### Issue: Cookies not being read
**Cause:** Cookies are httpOnly and might not be accessible

**Fix:**
- Cookies are correctly set as httpOnly (this is secure)
- The checkout API should be able to read them
- Check if cookies are being sent with requests
- Verify cookie path is `/` (not `/checkout`)

## Testing Direct Purchase (No Affiliate)

If you want to test WITHOUT an affiliate link:
- Just go directly to `/p/[product]/main`
- Click checkout
- Webhook will log: "No affiliate_id in metadata - this is a direct purchase"
- This is expected behavior - only affiliate conversions are tracked




