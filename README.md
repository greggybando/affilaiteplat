# Affiliate Platform

Your internal affiliate tracking platform with Claude-generated landing pages.

## Features

- **7-day free trial** - Affiliates sign up without a card, get hooked, then pay $40/mo
- **Locked earnings** - Commissions earned during trial are frozen until they subscribe
- **Landing page system** - Push Claude-generated pages directly to the platform
- **One-click payouts** - Process affiliate payments via Stripe Connect or PayPal
- **Full tracking** - Clicks, conversions, attribution, all automatic

## Setup

### 1. Database (Supabase)

1. Create a new Supabase project
2. Run the `schema.sql` file in the SQL editor
3. Copy your credentials to `.env`

### 2. Stripe

1. Create a subscription product for affiliates ($40/mo)
2. Copy the Price ID to `STRIPE_AFFILIATE_PRICE_ID`
3. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
4. Enable events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_AFFILIATE_PRICE_ID=

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=generate-a-random-string

# Admin
ADMIN_EMAIL=your@email.com
```

### 4. Run

```bash
npm install
npm run dev
```

## Usage

### Creating Landing Pages

1. Go to Admin → Landing Pages
2. Select a product
3. Paste your Claude-generated HTML
4. Use these placeholders in your HTML:
   - `{{PRODUCT_NAME}}` - Product name
   - `{{PRODUCT_PRICE}}` - Formatted price
   - `{{STRIPE_PRICE_ID}}` - For checkout
   - `{{AFF_CODE}}` - Affiliate tracking code
   - `{{VISITOR_ID}}` - Visitor identifier

### Tracking Flow

1. Affiliate grabs link: `yourdomain.com/go/abc123`
2. Click tracked, cookies set, redirect to landing page
3. Customer purchases (you pass `aff` and `vid` to Stripe metadata)
4. Webhook fires, conversion attributed to affiliate
5. You process payouts in admin

### Adding Products

Currently via database directly. Add to `products` table:
- `name` - Product name
- `slug` - URL slug
- `price_cents` - Price in cents
- `commission_percent` - e.g., 30 for 30%
- `stripe_product_id` - Your Stripe product ID
- `stripe_price_id` - Your Stripe price ID

## Cron Jobs

Set up a daily cron to expire trials:

```sql
SELECT expire_trials();
```

This marks expired trials and locks their commissions.

## Architecture

```
/app
  /admin          # Your admin dashboard
    /pages        # Landing page management
    /payouts      # Process affiliate payments
  /portal         # Affiliate dashboard
  /api
    /auth         # Login/signup/logout
    /links        # Generate tracking links
    /webhooks     # Stripe webhooks
    /admin        # Admin-only endpoints
  /go/[code]      # Click tracking redirect
  /p/[product]/[page]  # Landing page renderer
```
