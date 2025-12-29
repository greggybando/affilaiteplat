#!/bin/bash

echo "Testing Webhook Endpoint..."
echo "================================"
echo ""

# Test 1: Check if server is running
echo "1. Checking if dev server is running..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ✅ Dev server is running on port 3000"
else
    echo "   ❌ Dev server is NOT running"
    echo "   Run: npm run dev"
    exit 1
fi

# Test 2: Check health endpoint
echo ""
echo "2. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ Health check passed"
    echo "   Response: $HEALTH"
else
    echo "   ⚠️  Health check returned: $HEALTH"
fi

# Test 3: Check webhook endpoint (should return missing signature)
echo ""
echo "3. Testing webhook endpoint..."
WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/webhooks/stripe -H "Content-Type: application/json" -d '{"test": "ping"}')
if echo "$WEBHOOK_RESPONSE" | grep -q "Missing signature"; then
    echo "   ✅ Webhook endpoint is accessible"
    echo "   Response: $WEBHOOK_RESPONSE"
else
    echo "   ⚠️  Unexpected response: $WEBHOOK_RESPONSE"
fi

# Test 4: Check if Stripe CLI might be running
echo ""
echo "4. Checking for Stripe CLI process..."
if pgrep -f "stripe listen" > /dev/null 2>&1; then
    echo "   ✅ Stripe CLI 'listen' process found"
else
    echo "   ⚠️  Stripe CLI 'listen' process NOT found"
    echo "   Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
fi

echo ""
echo "================================"
echo "Next steps:"
echo "1. Make sure you have TWO terminals running:"
echo "   Terminal 1: npm run dev"
echo "   Terminal 2: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo ""
echo "2. Complete a test purchase and watch BOTH terminals for logs"
echo "3. Check the Stripe CLI terminal for forwarded events"
echo "4. Check the Next.js terminal for webhook processing logs"




