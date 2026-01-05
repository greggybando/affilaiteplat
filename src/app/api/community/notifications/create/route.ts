import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications'

// API endpoint for creating notifications (can be called from other services)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createNotification(body)
    
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

