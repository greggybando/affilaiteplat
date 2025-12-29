# Cron Jobs Setup

This application includes two cron job endpoints that should be called periodically:

## Endpoints

### 1. Auto-Complete Battles
**URL:** `/api/cron/complete-battles`  
**Method:** GET  
**Frequency:** Every hour (recommended)

Automatically completes battles that have passed their `end_date`.

### 2. Auto-Decline Challenges
**URL:** `/api/cron/decline-challenges`  
**Method:** GET  
**Frequency:** Every hour (recommended)

Automatically declines challenges that have been pending for more than 48 hours.

## Security

Both endpoints support optional authentication via `CRON_SECRET` environment variable:

1. Set `CRON_SECRET` in your environment variables
2. Include `Authorization: Bearer <CRON_SECRET>` header in cron job requests

If `CRON_SECRET` is not set, the endpoints will work without authentication (less secure).

## Setup Options

### Option 1: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/complete-battles",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/decline-challenges",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Option 2: External Cron Service

Use a service like:
- **cron-job.org** (free)
- **EasyCron** (free tier available)
- **GitHub Actions** (if repo is on GitHub)

Example cron-job.org setup:
- URL: `https://your-domain.com/api/cron/complete-battles`
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Every hour

### Option 3: Manual Testing

You can manually trigger these endpoints:

```bash
# With authentication
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/complete-battles

# Without authentication (if CRON_SECRET not set)
curl https://your-domain.com/api/cron/complete-battles
```

## Response Format

Both endpoints return JSON:

```json
{
  "message": "Completed 2 of 3 battles",
  "completed": 2,
  "total": 3,
  "errors": ["Battle abc123: Invalid battle stats"]
}
```

