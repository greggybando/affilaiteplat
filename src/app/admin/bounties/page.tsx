import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { BountiesClient } from './BountiesClient'

async function getPods() {
  const { data } = await (supabaseAdmin
    .from('pods') as any)
    .select('id, name')
    .order('name', { ascending: true })
  return (data || []) as Array<{ id: string; name: string }>
}

async function getProducts() {
  const { data } = await (supabaseAdmin
    .from('products') as any)
    .select('id, name')
    .order('name', { ascending: true })
  return (data || []) as Array<{ id: string; name: string }>
}

async function getBounties() {
  const { data } = await (supabaseAdmin
    .from('bounties') as any)
    .select(`
      *,
      target_pod:pods!bounties_target_pod_id_fkey (
        id,
        name
      ),
      product:products (
        id,
        name
      ),
      claimed_by_pod:pods!bounties_claimed_by_pod_id_fkey (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })
  return (data || []) as any[]
}

export default async function AdminBountiesPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/login')
  }

  const [pods, products, bounties] = await Promise.all([
    getPods(),
    getProducts(),
    getBounties(),
  ])

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Bounties</h1>
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
              ← Back to Dashboard
            </Link>
            <Link href="/api/auth/logout" prefetch={false} className="text-gray-400 hover:text-white text-sm">
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BountiesClient pods={pods} products={products} initialBounties={bounties} />
      </main>
    </div>
  )
}

