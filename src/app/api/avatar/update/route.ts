import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const avatarName = formData.get('avatarName') as string | null
    const avatarFile = formData.get('avatarFile') as File | null
    const signature = formData.get('signature') as string | null
    const bio = formData.get('bio') as string | null

    if (!avatarName || !avatarName.trim()) {
      return NextResponse.json({ error: 'Avatar name is required' }, { status: 400 })
    }

    let trimmedName = avatarName.trim()
    
    // Auto-capitalize first letter
    if (trimmedName.length > 0) {
      trimmedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)
    }

    // Validate avatar name
    if (trimmedName.length < 3 || trimmedName.length > 20) {
      return NextResponse.json(
        { error: 'Avatar name must be between 3 and 20 characters' },
        { status: 400 }
      )
    }

    // Check if name contains only alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      return NextResponse.json(
        { error: 'Avatar name can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Check if name is already taken (excluding current user)
    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('avatar_name', trimmedName)
      .neq('id', affiliate.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Avatar name is already taken' }, { status: 400 })
    }

    let avatarUrl: string | null = null

    // Handle file upload if provided
    if (avatarFile && avatarFile.size > 0) {
      try {
        // Validate file type
        if (!avatarFile.type.startsWith('image/')) {
          return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
        }

        // Validate file size (max 5MB)
        if (avatarFile.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 })
        }

        // Generate unique filename (always use jpg for cropped images)
        const fileName = `${affiliate.id}-${Date.now()}.jpg`
        const filePath = fileName // Store directly in bucket root, not in subfolder

        // Convert file to buffer
        const arrayBuffer = await avatarFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Check if bucket exists, create if not
        const { data: buckets } = await supabaseAdmin.storage.listBuckets()
        const avatarsBucket = buckets?.find((b) => b.name === 'avatars')
        
        if (!avatarsBucket) {
          console.error('Avatars bucket does not exist')
          return NextResponse.json(
            { error: 'Storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.' },
            { status: 500 }
          )
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('avatars')
          .upload(filePath, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          console.error('Error uploading avatar:', uploadError)
          console.error('Upload error details:', JSON.stringify(uploadError, null, 2))
          return NextResponse.json(
            { 
              error: 'Failed to upload image',
              details: uploadError.message || 'Unknown error'
            },
            { status: 500 }
          )
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatarUrl = urlData.publicUrl
      } catch (error: any) {
        console.error('Error processing avatar upload:', error)
        return NextResponse.json({ error: 'Failed to process image upload' }, { status: 500 })
      }
    }

    // Get current affiliate data to preserve avatar_url if not updating
    const { data: currentAffiliate } = await supabaseAdmin
      .from('affiliates')
      .select('avatar_url')
      .eq('id', affiliate.id)
      .single()

    const currentAffiliateData = currentAffiliate as any

    // Update affiliate record
    const updateData: any = {
      avatar_name: trimmedName,
    }

    // Preserve existing avatar_url if not uploading a new one
    if (avatarUrl) {
      updateData.avatar_url = avatarUrl
    } else if (currentAffiliateData?.avatar_url) {
      updateData.avatar_url = currentAffiliateData.avatar_url
    }

    if (signature !== null) {
      // Allow empty string to clear signature
      updateData.signature = signature.trim() || null
    }

    if (bio !== null) {
      // Allow empty string to clear bio, max 200 characters
      const trimmedBio = bio.trim()
      if (trimmedBio.length > 200) {
        return NextResponse.json({ error: 'Bio must be 200 characters or less' }, { status: 400 })
      }
      updateData.bio = trimmedBio || null
    }

    console.log('Updating affiliate with data:', {
      affiliateId: affiliate.id,
      hasAvatarUrl: !!updateData.avatar_url,
      hasSignature: updateData.signature !== undefined,
      signatureLength: updateData.signature?.length || 0
    })

    const { error: updateError } = await (supabaseAdmin
      .from('affiliates') as any)
      .update(updateData)
      .eq('id', affiliate.id)

    if (updateError) {
      console.error('Error updating avatar:', updateError)
      console.error('Update error details:', JSON.stringify(updateError, null, 2))
      // Check if it's a column doesn't exist error
      if (updateError.code === '42703' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database column not found. Please run the signature migration in Supabase.',
          details: updateError.message 
        }, { status: 500 })
      }
      return NextResponse.json({ 
        error: 'Failed to update avatar',
        details: updateError.message || 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      avatarName: trimmedName,
      avatarUrl,
    })
  } catch (error: any) {
    console.error('Avatar update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

