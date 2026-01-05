# Affiliate Platform System - Full Context Document

## Overview
This is a comprehensive affiliate marketing platform built with Next.js, Supabase, and Stripe. Affiliates can promote products (like an ADHD Productivity Course) and platform subscriptions, earning commissions on sales. The platform includes click tracking, conversion attribution, commission management, and recurring revenue from subscription referrals.

---

## Core Database Schema

### Main Tables

#### `affiliates`
- Platform users who can promote products
- 7-day trial, then $40/month subscription
- Fields: `id`, `email`, `password_hash`, `name`, `status` (trial/active/expired/cancelled), `payout_method` (paypal/stripe), `stripe_customer_id`, `stripe_subscription_id`, `trial_ends_at`

#### `products`
- Products affiliates can promote
- Fields: `id`, `name`, `slug`, `description`, `price_cents`, `commission_percent`, `stripe_product_id`, `stripe_price_id`, `is_active`

#### `landing_pages`
- Landing pages for products (can have multiple variants for A/B testing)
- Fields: `id`, `product_id`, `name`, `slug`, `content` (HTML/React), `variant_name`, `is_active`, `meta_title`, `meta_description`

#### `affiliate_links`
- Unique tracking links per affiliate per landing page
- Fields: `id`, `affiliate_id`, `landing_page_id`, `tracking_code` (unique 8-char code), `custom_slug`

#### `clicks`
- Tracks every click on affiliate links
- Fields: `id`, `affiliate_link_id`, `ip_address`, `user_agent`, `referer`, `visitor_id`, `clicked_at`

#### `conversions`
- Successful sales attributed to affiliates
- Fields: `id`, `affiliate_id`, `affiliate_link_id`, `product_id`, `stripe_payment_intent_id`, `order_amount_cents`, `commission_cents`, `status` (pending/approved/locked/paid/refunded), `visitor_id`, `attributed_click_id`, `converted_at`, `approved_at`, `paid_at`

#### `payouts`
- Batch payments to affiliates
- Fields: `id`, `affiliate_id`, `amount_cents`, `payout_method`, `stripe_transfer_id`, `paypal_batch_id`, `status` (pending/processing/completed/failed), `conversion_ids[]`

### Subscription Referral System (Additional Tables)

#### `subscription_referrals`
- Tracks when affiliates refer new platform subscribers
- Fields: `id`, `referrer_id`, `referred_id`, `referral_code`, `subscription_id` (Stripe), `commission_percent` (50%), `status` (pending/active/cancelled/expired), `first_commission_paid_at`, `last_commission_paid_at`

#### `subscription_commissions`
- Recurring commission payments for subscription referrals
- Fields: `id`, `referral_id`, `referrer_id`, `subscription_id`, `amount_cents`, `subscription_amount_cents`, `commission_percent`, `period_start`, `period_end`, `status` (pending/approved/paid/cancelled), `paid_at`

#### `referral_codes`
- Unique referral codes for platform subscription referrals
- Fields: `id`, `affiliate_id`, `code` (unique, 8 chars uppercase), `is_active`

### Views

#### `affiliate_stats`
- Aggregated stats view for dashboard
- Includes: `total_links`, `total_clicks`, `total_conversions`, `pending_cents`, `approved_cents`, `locked_cents`, `paid_cents`

---

## Key Features

### 1. Product Promotion System
- Affiliates can generate unique tracking links for any active landing page
- Each link has a unique 8-character tracking code (nanoid)
- Links format: `https://domain.com/go/{tracking_code}`
- Click tracking with IP, user agent, referer, and visitor ID (cookie-based)

### 2. Conversion Attribution
- Uses visitor ID cookies to attribute conversions to clicks
- 30-day attribution window
- Handles multiple clicks (last-click wins)
- Stripe webhook creates conversion records

### 3. Commission System
- **Product Sales**: One-time commission based on `commission_percent` of product price
- **Platform Subscriptions**: 50% recurring commission on $40/month subscription = $20/month per active referral
- Commission status flow: `pending` → `approved` (after refund window) → `paid` (after payout)
- Locked commissions if affiliate's trial expires (unlocks when they resubscribe)

### 4. Subscription Referral System
- Affiliates generate unique referral codes (e.g., "SNUXYTPU")
- Referral URL: `https://domain.com/signup?ref={code}`
- Signup flow captures referral code and creates `subscription_referrals` record
- Stripe webhook creates recurring commissions when subscription is created/updated
- Monthly recurring revenue (MRR) tracking

### 5. Payout System
- Affiliates request payouts for approved commissions
- Supports PayPal and Stripe payouts
- Admin processes payouts manually
- Tracks payout status and external payment IDs

---

## API Routes

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/signup` - Signup (captures referral codes from URL)
- `POST /api/auth/logout` - Logout

### Affiliate Links
- `POST /api/links/generate` - Generate unique tracking link for a landing page
  - Requires: `landing_page_id`, `affiliate_id` (optional, from auth)
  - Returns: `{ link: { id, tracking_code, url } }`

### Referral System
- `POST /api/referral/generate` - Generate referral code for platform subscriptions
  - Returns: `{ code, url }`
- `GET /api/referral/stats` - Get referral statistics
  - Returns: `{ referralCode, activeReferrals, monthlyRecurringRevenue, pendingCommissions, paidCommissions, totalEarned }`

### Products & Landing Pages
- `GET /api/products` - List active products
- `GET /p/[product]/[page]` - Render landing page (server-side)

### Click Tracking
- `GET /go/[tracking_code]` - Redirects to landing page, records click, sets visitor cookie

### Conversions & Commissions
- Handled via Stripe webhook (see below)

### Payouts
- `POST /api/payouts/request` - Request payout for approved commissions
  - Requires: `affiliate_id`
  - Validates payout method is configured
  - Returns payout request details

### Leaderboard
- `GET /api/leaderboard` - Get top 10 affiliates by earnings
  - Fake earnings for top 4: Rank 1 = $87,848, Rank 2 = $65,000, Rank 3 = $45,000, Rank 4 = $30,000
  - Returns: `{ leaderboard: [{ rank, affiliateId, avatarName, avatarUrl, totalRevenue, conversions, earnings }] }`

### Stats
- Uses `affiliate_stats` view for dashboard stats
- Includes: clicks, conversions, conversion rate, pending/approved/paid commissions

---

## Stripe Webhook Integration

### Webhook Route: `POST /api/webhooks/stripe`

Handles multiple event types:

#### `checkout.session.completed`
- **Product Purchase**: Creates conversion record, attributes to affiliate via metadata
- **Platform Subscription**: Updates affiliate status, activates subscription referral if applicable

#### `customer.subscription.created`
- Creates recurring commission for subscription referrals
- Sets referral status to 'active'

#### `customer.subscription.updated`
- Updates recurring commissions based on subscription status
- Handles cancellations, reactivations

#### `payment_intent.succeeded`
- Creates conversion record for product purchases
- Calculates commission based on product settings

#### `charge.refunded`
- Updates conversion status to 'refunded'
- Claws back commission

### Webhook Metadata
Stripe checkout sessions include:
- `affiliate_id` - ID of referring affiliate
- `affiliate_link_id` - Specific link used
- `click_id` - Click that led to conversion
- `visitor_id` - Cookie-based visitor identifier
- `product_id` - Product being purchased
- `affiliate_code` - Referral code for subscriptions

---

## Frontend Components

### Main Dashboard (`/affiliate`)
**File**: `src/app/affiliate/page.tsx`

Structure:
1. **VideoBanner** - Minimizable tutorial video at top
2. **StatsCards** - Shows: Total Clicks, Conversions, Pending, Ready to Pay, Total Earned
3. **ProductList** - Unified product suite with:
   - Platform Subscription (recurring revenue)
   - ADHD Productivity Course (one-time commissions)

### ProductList Component
**File**: `src/app/affiliate/components/ProductList.tsx`

Features:
- Single unified box containing all products
- Each product has:
  - Small icon (40x40px) on left (💰 for subscription, 🧠 for ADHD course)
  - Product name and description
  - Commission percentage on right
  - Links section below

**Platform Subscription**:
- Shows `SimpleReferralLink` component
- Displays referral URL in input field with copy/external link buttons
- Description: "Earn 50% recurring commission on monthly subscriptions ($20/month per active referral). 10 sales = $200/month passive"

**Product Landing Pages**:
- Shows all active landing pages for the product
- Each landing page shows:
  - Page name
  - Full tracking URL in input field
  - Copy and external link buttons
- "Generate Link" button if link doesn't exist yet

### StatsCards Component
**File**: `src/app/affiliate/components/StatsCards.tsx`

Displays 5 stat cards:
- Total Clicks (gray)
- Conversions with conversion rate % (gray)
- Pending commissions (yellow)
- Ready to Pay / Approved commissions (green)
- Total Earned / Paid commissions (green)

Also shows commission boost banner if active.

### Navigation
**File**: `src/app/affiliate/components/PortalNav.tsx`

Navigation items:
- Dashboard (`/affiliate`)
- Leaderboard (`/affiliate/leaderboard`)
- Watch List (`/affiliate/watchlist`)
- Pods (`/affiliate/pods`)
- Training (`/affiliate/training`)
- What's Working (`/affiliate/whats-working`)
- Payouts (`/affiliate/payouts`)
- Settings (`/affiliate/settings`)

### Other Pages
- **Leaderboard**: Shows top 10 affiliates with fake earnings for top 4
- **Watch List**: Track specific affiliates
- **Payouts**: Request payouts, view payout history
- **Settings**: Configure payout method, account settings

---

## User Flows

### 1. Affiliate Signup Flow
1. User visits `/signup?ref={referral_code}`
2. Signup page reads `ref` query param and stores in cookie
3. User creates account
4. `POST /api/auth/signup` creates affiliate record
5. If referral code exists, creates `subscription_referrals` record with status 'pending'
6. User gets 7-day trial

### 2. Generate Product Link Flow
1. Affiliate goes to `/affiliate` dashboard
2. Clicks on product (e.g., ADHD Course)
3. Sees landing pages list
4. Clicks "Generate Link" for a landing page
5. `POST /api/links/generate` creates `affiliate_links` record
6. Returns tracking URL: `https://domain.com/go/{tracking_code}`
7. Link displayed in input field with copy/external link buttons

### 3. Customer Click & Purchase Flow
1. Customer clicks affiliate link: `https://domain.com/go/{tracking_code}`
2. `GET /go/[tracking_code]` route:
   - Looks up `affiliate_links` by tracking code
   - Creates `clicks` record
   - Sets visitor cookie with unique ID
   - Redirects to landing page: `/p/{product_slug}/{page_slug}`
3. Customer views landing page
4. Customer clicks "Buy" → goes to `/checkout`
5. Checkout creates Stripe session with metadata (affiliate_id, click_id, visitor_id, etc.)
6. Customer completes payment
7. Stripe webhook `checkout.session.completed` fires
8. Webhook creates `conversions` record with:
   - `affiliate_id` from metadata
   - `commission_cents` calculated from product settings
   - `status = 'pending'`
   - `attributed_click_id` from metadata

### 4. Subscription Referral Flow
1. Affiliate generates referral code via `POST /api/referral/generate`
2. Gets referral URL: `https://domain.com/signup?ref={code}`
3. New user signs up with referral code
4. `subscription_referrals` record created with status 'pending'
5. New user subscribes to platform ($40/month)
6. Stripe webhook `customer.subscription.created` fires
7. Webhook:
   - Updates `subscription_referrals.status = 'active'`
   - Creates first `subscription_commissions` record ($20 commission)
   - Sets `first_commission_paid_at`
8. Each month, Stripe webhook `customer.subscription.updated` fires
9. Creates new `subscription_commissions` record for that billing period
10. MRR accumulates as more referrals stay active

### 5. Commission Approval Flow
1. Conversion created with `status = 'pending'`
2. After refund window (typically 7-30 days), admin approves
3. Status changes to `approved`
4. Commission shows in "Ready to Pay" on dashboard
5. Affiliate requests payout
6. Admin processes payout via `/api/admin/payouts/process`
7. Status changes to `paid`, `paid_at` timestamp set

### 6. Payout Request Flow
1. Affiliate goes to `/affiliate/payouts`
2. Clicks "Request Payout"
3. `POST /api/payouts/request` validates:
   - Payout method configured (PayPal or Stripe)
   - Has approved commissions
4. Creates payout request
5. Admin processes manually via admin dashboard

---

## Business Logic

### Commission Calculation
- **Product Sales**: `commission_cents = (order_amount_cents * commission_percent) / 100`
- **Subscription Referrals**: `commission_cents = (subscription_amount_cents * 50) / 100` = $20 per month

### Commission Status Lifecycle
1. **pending**: Just converted, within refund window
2. **approved**: Past refund window, ready for payout
3. **locked**: Affiliate's trial expired, commission frozen until they resubscribe
4. **paid**: Commission paid out
5. **refunded**: Customer refunded, commission clawed back

### Attribution Logic
- Uses visitor ID cookie (set on first click, expires in 30 days)
- Last-click attribution (most recent click wins)
- 30-day attribution window
- If multiple affiliates click, last one gets credit

### Subscription Referral Logic
- Each user can only be referred once (UNIQUE constraint on `referred_id`)
- Referral code must be active (`is_active = true`)
- Commission is 50% of $40/month = $20/month per active referral
- Commissions created monthly when subscription renews
- If subscription cancels, commissions stop
- If subscription reactivates, commissions resume

---

## Environment Variables

Required:
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `NEXT_PUBLIC_APP_URL` - Base URL for links (e.g., `https://affiliate-platform-three.vercel.app`)
- `NEXT_PUBLIC_AFFILIATE_TUTORIAL_VIDEO` - YouTube/Video URL for tutorial banner
- Supabase connection strings (via `@/lib/supabase`)

---

## Key Files Reference

### Backend
- `src/app/api/links/generate/route.ts` - Generate tracking links
- `src/app/api/referral/generate/route.ts` - Generate referral codes
- `src/app/api/referral/stats/route.ts` - Get referral statistics
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `src/app/api/payouts/request/route.ts` - Request payouts
- `src/app/api/leaderboard/route.ts` - Leaderboard data
- `src/app/api/auth/signup/route.ts` - Signup with referral capture

### Frontend
- `src/app/affiliate/page.tsx` - Main dashboard
- `src/app/affiliate/components/ProductList.tsx` - Product listing UI
- `src/app/affiliate/components/StatsCards.tsx` - Stats display
- `src/app/affiliate/components/SimpleReferralLink.tsx` - Referral link generator UI
- `src/app/affiliate/components/VideoBanner.tsx` - Tutorial video banner
- `src/app/affiliate/components/PortalNav.tsx` - Navigation
- `src/app/affiliate/leaderboard/page.tsx` - Leaderboard page

### Database
- `schema.sql` - Main database schema
- `subscription-referral-migration.sql` - Subscription referral tables

---

## Current State & Recent Changes

### Recent Updates
1. **Unified Product UI**: Platform Subscription and ADHD Course now use same UI pattern - full URL input fields with copy/external link buttons
2. **Product Suite Design**: All products in single unified box, scrollable, cohesive design
3. **Subscription Referral Stats**: Added to main dashboard showing active referrals and MRR
4. **Fake Leaderboard Earnings**: Top 4 entries show fake earnings for social proof

### Active Products
1. **Platform Subscription** - 50% recurring commission, $20/month per active referral
2. **ADHD Productivity Course** - One-time commission (typically 50% of product price)

### UI Features
- Dark theme with gray-900/gray-800 color scheme
- Green accents for commissions/earnings
- Responsive design
- Hover effects on interactive elements
- Copy-to-clipboard functionality
- External link previews

---

## Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: Cookie-based sessions with JWT tokens

---

This document provides complete context for understanding and working with the affiliate platform system.

