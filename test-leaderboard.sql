-- Test query to see what affiliate_stats returns
SELECT 
  affiliate_id,
  name,
  email,
  paid_cents,
  total_conversions,
  total_clicks,
  approved_cents
FROM affiliate_stats
WHERE total_conversions > 0
ORDER BY paid_cents DESC
LIMIT 10;
