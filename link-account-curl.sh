#!/bin/bash
# Quick script to link grant@reelstacks.ai account
# Run this after deployment, or call the API endpoint directly

curl -X POST https://www.millionairelifedesign.com/api/affiliate/link-account \
  -H "Content-Type: application/json" \
  -H "Cookie: affiliate_token=YOUR_TOKEN_HERE" \
  -d '{
    "email": "grant@reelstacks.ai",
    "fp_promoter_id": "13602869"
  }'
