# Vercel Deployment Checklist

## Step 1: Authenticate with Vercel
```bash
vercel login
```
This will open your browser to sign in.

## Step 2: Deploy to Vercel

### Preview Deployment (for testing)
```bash
vercel
```

### Production Deployment
```bash
vercel --prod
```

## Step 3: Configure Environment Variables

After deployment, go to your Vercel dashboard and add these environment variables:

### Required Environment Variables:

1. **Supabase:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)

2. **Stripe:**
   - `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (starts with `pk_`)
   - `STRIPE_WEBHOOK_SECRET` - Webhook secret from Stripe dashboard (starts with `whsec_`)

3. **App Configuration:**
   - `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### How to Add Environment Variables in Vercel:

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable for:
   - **Production** (for `vercel --prod`)
   - **Preview** (for `vercel`)
   - **Development** (optional, for local dev)

## Step 4: Configure Stripe Webhook

After deployment, you need to set up the webhook endpoint in Stripe:

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Select events: `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 5: Update Stripe Checkout URLs

Make sure your Stripe checkout sessions use the correct production URL:

- Success URL: `https://your-app.vercel.app/checkout/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `https://your-app.vercel.app/p/[product]/main`

The code should automatically use `NEXT_PUBLIC_APP_URL` if set correctly.

## Step 6: Test the Deployment

1. Visit your deployed site
2. Test the affiliate link flow: `/go/[tracking-code]`
3. Test checkout flow
4. Complete a test payment
5. Verify webhook receives events (check Vercel function logs)

## Troubleshooting

### Webhook Not Working
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check Vercel function logs for webhook errors
- Ensure webhook URL in Stripe matches your Vercel domain

### Environment Variables Not Loading
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)
- Verify variables are set for the correct environment (Production/Preview)

### Database Connection Issues
- Verify Supabase environment variables are correct
- Check Supabase project is active
- Ensure service role key has proper permissions




