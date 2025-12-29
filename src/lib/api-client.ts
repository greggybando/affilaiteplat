// Client-side API helper that automatically includes auth token
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('affiliate_token') : null

  // Add Authorization header if token exists
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Include credentials to send cookies
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })
}




