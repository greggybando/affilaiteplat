import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// POST - Create storage bucket and set up policies
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 })
    }
    
    const bucketExists = buckets?.some(b => b.id === 'course-files')
    
    if (bucketExists) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bucket already exists',
        bucketExists: true 
      })
    }

    // Create bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('course-files', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-zip-compressed'
      ]
    })
    
    if (createError) {
      console.error('Error creating bucket:', createError)
      return NextResponse.json({ 
        error: 'Failed to create bucket',
        details: createError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bucket created successfully',
      bucket: bucket 
    })
  } catch (error: any) {
    console.error('Error setting up storage:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

