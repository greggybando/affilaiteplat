/**
 * File Upload Utilities
 * 
 * Provides validation and size limits for file uploads
 */

// Max file sizes in bytes
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB for images
  video: 100 * 1024 * 1024, // 100MB for videos
  document: 10 * 1024 * 1024, // 10MB for documents
  avatar: 2 * 1024 * 1024, // 2MB for avatars
  attachment: 25 * 1024 * 1024, // 25MB for course attachments
  checkpoint: 10 * 1024 * 1024, // 10MB for checkpoint submissions
} as const

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  attachment: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  checkpoint: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
} as const

export type FileType = keyof typeof MAX_FILE_SIZES

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a file against size and type constraints
 */
export function validateFile(
  file: File | Blob,
  fileType: FileType
): ValidationResult {
  const maxSize = MAX_FILE_SIZES[fileType]
  const allowedTypes = ALLOWED_MIME_TYPES[fileType]

  // Check file size
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    const fileMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File is too large (${fileMB}MB). Maximum size is ${maxMB}MB.`
    }
  }

  // Check file type
  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type (${file.type}). Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Validate file from FormData
 */
export async function validateFormDataFile(
  formData: FormData,
  fieldName: string,
  fileType: FileType
): Promise<ValidationResult & { file?: File }> {
  const file = formData.get(fieldName) as File | null

  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  const validation = validateFile(file, fileType)
  if (!validation.valid) {
    return validation
  }

  return { valid: true, file }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

