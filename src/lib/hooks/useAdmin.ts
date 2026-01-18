export function useAdmin(affiliate: any): boolean {
  return affiliate?.role === 'admin' || affiliate?.role === 'moderator'
}

