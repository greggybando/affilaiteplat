# Checkout Debugging Guide

## Current Setup

The checkout flow requires:
1. **Product in database** with `stripe_price_id` set
2. **STRIPE_SECRET_KEY** in environment (you have this: `sk_live_...`)
3. **STRIPE_AFFILIATE_PRICE_ID** in environment (you have this: `price_1SeyxHFezb0U5tB1KwnRw6r7`)

## How Checkout Works

1. User clicks "Buy" button on landing page → goes to `/checkout`
2. `/checkout` page calls `/api/checkout` POST
3. `/api/checkout` route:
   - Gets product from database (by slug from cookie or first active product)
   - Uses `product.stripe_price_id` to create Stripe checkout session
   - Falls back to `STRIPE_AFFILIATE_PRICE_ID` if product doesn't have one
   - Creates Stripe session with affiliate tracking metadata
   - Returns `sessionId`
4. Frontend redirects to Stripe checkout using `sessionId`
5. After payment, Stripe redirects to `/checkout/success`
6. Webhook at `/api/webhooks/stripe` records conversion

## Common Issues & Fixes

### Issue 1: "Product not found or not configured"
**Fix**: Ensure product exists in database with:
- `slug = 'adhd-course'`
- `is_active = true`
- `stripe_price_id = 'price_1SeyxHFezb0U5tB1KwnRw6r7'` (or your product's price ID)

**SQL to check/fix**:
```sql
SELECT id, name, slug, stripe_price_id, is_active 
FROM products 
WHERE slug = 'adhd-course';

-- If missing, update it:
UPDATE products 
SET stripe_price_id = 'price_1SeyxHFezb0U5tB1KwnRw6r7'
WHERE slug = 'adhd-course';
```

### Issue 2: "Stripe price ID not found"
**Possible causes**:
- Price ID doesn't exist in Stripe
- Using test mode key with live price ID (or vice versa)
- Price ID is archived/deleted in Stripe

**Fix**: 
1. Check Stripe dashboard → Products → find your product → verify price ID
2. Ensure `STRIPE_SECRET_KEY` matches the mode (test vs live)
3. Verify price is active (not archived)

### Issue 3: "Stripe authentication failed"
**Fix**: Check `STRIPE_SECRET_KEY`:
- Must start with `sk_test_` (test mode) or `sk_live_` (live mode)
- Must be complete (not truncated)
- Must match the mode of your price IDs

### Issue 4: Checkout works but conversion not tracked
**Fix**: Check webhook:
1. Webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
2. Webhook secret: `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. Events enabled: `checkout.session.completed`

## Testing Checklist

- [ ] Product exists in database with `stripe_price_id`
- [ ] `STRIPE_SECRET_KEY` is set and valid
- [ ] `STRIPE_AFFILIATE_PRICE_ID` is set (as fallback)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- [ ] `NEXT_PUBLIC_APP_URL` is set
- [ ] Webhook endpoint configured in Stripe
- [ ] Webhook secret matches `STRIPE_WEBHOOK_SECRET`

## Debug Steps

1. **Check server logs** when clicking checkout:
   - Look for "Creating Stripe checkout session with:" log
   - Check for any error messages

2. **Check browser console** (F12):
   - Look for fetch errors
   - Check the error message from API

3. **Test Stripe API directly**:
   ```bash
   stripe checkout sessions create \
     --payment-method-types card \
     --line-items price=price_1SeyxHFezb0U5tB1KwnRw6r7,quantity=1 \
     --mode payment \
     --success-url "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}" \
     --cancel-url "http://localhost:3000/p/adhd-course/main"
   ```

4. **Verify product in database**:
   - Check Supabase dashboard
   - Ensure product has correct `stripe_price_id`

## Current Code Behavior

The checkout route now:
- ✅ Uses `product.stripe_price_id` from database
- ✅ Falls back to `STRIPE_AFFILIATE_PRICE_ID` if product missing price ID
- ✅ Provides detailed error messages
- ✅ Logs all important information for debugging
- ✅ Handles missing products gracefully
- ✅ Validates Stripe configuration













