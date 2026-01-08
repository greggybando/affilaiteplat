import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Creates the user_module_unlocks table if it doesn't exist
export async function POST() {
  try {
    // Try to create the table using raw SQL
    const { error } = await (supabaseAdmin as any).rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS user_module_unlocks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          course_type VARCHAR(50) NOT NULL,
          module_id INTEGER NOT NULL,
          unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, course_type, module_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_user ON user_module_unlocks(user_id);
      `
    })

    if (error) {
      console.error('Error creating table via RPC:', error)
      
      // Try alternative: just check if table exists by querying it
      const { error: checkError } = await (supabaseAdmin as any)
        .from('user_module_unlocks')
        .select('id')
        .limit(1)
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist - need manual creation
        return NextResponse.json({
          success: false,
          message: 'Table does not exist. Please run the SQL migration manually.',
          sql: `
CREATE TABLE user_module_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_type VARCHAR(50) NOT NULL,
  module_id INTEGER NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_type, module_id)
);
CREATE INDEX idx_user_module_unlocks_user ON user_module_unlocks(user_id);
          `
        })
      } else if (!checkError) {
        return NextResponse.json({ success: true, message: 'Table already exists' })
      }
    }

    return NextResponse.json({ success: true, message: 'Table created or already exists' })

  } catch (error: any) {
    console.error('Error in setup:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Check if table exists
export async function GET() {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('user_module_unlocks')
      .select('id')
      .limit(1)

    if (error && error.code === '42P01') {
      return NextResponse.json({ exists: false, error: 'Table does not exist' })
    }

    return NextResponse.json({ exists: true, rowCount: data?.length || 0 })

  } catch (error: any) {
    return NextResponse.json({ exists: false, error: error.message })
  }
}

