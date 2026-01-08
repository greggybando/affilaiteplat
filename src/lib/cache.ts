/**
 * Response Caching Utilities
 * 
 * Provides cache headers for API responses to reduce load
 */

export interface CacheOptions {
  /** Cache duration in seconds */
  maxAge?: number
  /** Stale-while-revalidate duration in seconds */
  staleWhileRevalidate?: number
  /** Whether to allow CDN caching */
  public?: boolean
  /** Whether to prevent caching */
  noStore?: boolean
}

/**
 * Default cache configurations for different types of data
 */
export const CACHE_CONFIGS = {
  // Never cache (user-specific, sensitive data)
  private: {
    noStore: true,
  },
  // Short cache for frequently changing data (1 minute)
  short: {
    maxAge: 60,
    staleWhileRevalidate: 30,
    public: true,
  },
  // Medium cache for semi-static data (5 minutes)
  medium: {
    maxAge: 300,
    staleWhileRevalidate: 60,
    public: true,
  },
  // Long cache for mostly static data (1 hour)
  long: {
    maxAge: 3600,
    staleWhileRevalidate: 300,
    public: true,
  },
  // Very long cache for static data (1 day)
  static: {
    maxAge: 86400,
    staleWhileRevalidate: 3600,
    public: true,
  },
} as const

export type CacheConfigType = keyof typeof CACHE_CONFIGS

/**
 * Generate Cache-Control header value
 */
export function getCacheControl(options: CacheOptions = {}): string {
  if (options.noStore) {
    return 'no-store, no-cache, must-revalidate'
  }

  const parts: string[] = []

  if (options.public) {
    parts.push('public')
  } else {
    parts.push('private')
  }

  if (options.maxAge !== undefined) {
    parts.push(`max-age=${options.maxAge}`)
  }

  if (options.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
  }

  return parts.join(', ')
}

/**
 * Get cache headers for a response
 */
export function getCacheHeaders(
  configOrOptions: CacheConfigType | CacheOptions = 'private'
): HeadersInit {
  const options = typeof configOrOptions === 'string' 
    ? CACHE_CONFIGS[configOrOptions] 
    : configOrOptions

  return {
    'Cache-Control': getCacheControl(options),
    'CDN-Cache-Control': getCacheControl(options),
    'Vercel-CDN-Cache-Control': getCacheControl(options),
  }
}

/**
 * Add cache headers to a NextResponse
 */
export function withCacheHeaders(
  headers: Headers,
  configOrOptions: CacheConfigType | CacheOptions = 'private'
): void {
  const cacheHeaders = getCacheHeaders(configOrOptions)
  
  for (const [key, value] of Object.entries(cacheHeaders)) {
    headers.set(key, value)
  }
}

