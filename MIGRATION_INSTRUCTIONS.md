# Migration: Drop UNIQUE(affiliate_id) Constraint

## Problem
The `group_chat_participants` table has an old `UNIQUE(affiliate_id)` constraint that prevents users from being in multiple group chats. This needs to be dropped to allow users to join up to 3 chats.

## Solution
Run the migration file `drop-unique-affiliate-id-constraint.sql` in your Supabase SQL editor.

## Steps

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the contents of `drop-unique-affiliate-id-constraint.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify**
   - The migration will drop the old `UNIQUE(affiliate_id)` constraint
   - It will ensure the new `(affiliate_id, group_chat_id)` unique index exists
   - Users will now be able to join up to 3 group chats (enforced by application code)

## Migration File Location
`drop-unique-affiliate-id-constraint.sql`

## What the Migration Does
- Finds the old unique constraint on `affiliate_id` alone
- Drops it safely
- Ensures the new composite unique index `(affiliate_id, group_chat_id)` exists
- This allows users to be in multiple chats (up to 3, enforced by API)

## After Migration
- Users can create and join multiple group chats
- The API enforces a maximum of 3 chats per user
- Error messages will no longer show the constraint violation


