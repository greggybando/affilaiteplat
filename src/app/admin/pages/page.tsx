import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { PageCreator } from './PageCreator'

async function getProducts() {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')
  return data || []
}

async function getLandingPages() {
  const { data } = await supabaseAdmin
    .from('landing_pages')
    .select(`
      id,
      name,
      slug,
      variant_name,
      is_active,
      created_at,
      product:products (
        id,
        name,
        slug
      )
    `)
    .order('created_at', { ascending: false })
  return data || []
}

export default async function AdminPagesPage() {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/login')
  }

  const [products, landingPages] = await Promise.all([
    getProducts(),
    getLandingPages(),
  ])

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Landing Pages</h1>
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Creator */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Page</h2>
          <PageCreator products={products} />
        </section>

        {/* Existing Pages */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            Existing Pages ({landingPages.length})
          </h2>
          <div className="grid gap-4">
            {landingPages.map((page: any) => (
              <div
                key={page.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-medium">{page.name}</h3>
                    {page.variant_name && (
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                        {page.variant_name}
                      </span>
                    )}
                    {!page.is_active && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {page.product?.name} · /p/{page.product?.slug}/{page.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`/p/${page.product?.slug}/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Preview
                  </a>
                  <Link
                    href={`/admin/pages/${page.id}/edit`}
                    className="text-sm text-green-400 hover:text-green-300"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
