// Script to create Supabase storage bucket
// Run with: node scripts/setup-storage.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupStorage() {
  try {
    console.log('Creating storage bucket: course-files...')
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }
    
    const bucketExists = buckets?.some(b => b.id === 'course-files')
    
    if (bucketExists) {
      console.log('Bucket "course-files" already exists!')
    } else {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket('course-files', {
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
      
      if (error) {
        console.error('Error creating bucket:', error)
        return
      }
      
      console.log('✅ Bucket "course-files" created successfully!')
    }
    
    console.log('\n✅ Storage setup complete!')
    console.log('\nNext: Run the storage policies SQL in Supabase SQL Editor')
    console.log('See: setup-storage-bucket.sql')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

setupStorage()



