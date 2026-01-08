import { redirect } from 'next/navigation'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const affiliate = await getCurrentAffiliate()
  const adminStatus = await isAdmin()

  if (!affiliate) {
    redirect('/login')
  }

  // Check admin access - multiple ways to be admin
  const hasAdminAccess = adminStatus || affiliate.role === 'admin' || affiliate.is_admin === true
  
  if (!hasAdminAccess) {
    console.log('[Admin Layout] Access denied for:', affiliate.email, { role: affiliate.role, is_admin: affiliate.is_admin, adminStatus })
    redirect('/dashboard')
  }
  
  console.log('[Admin Layout] Access granted for:', affiliate.email)

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Admin Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link 
                href="/dashboard" 
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            </div>
            
            {/* Admin Nav */}
            <nav className="flex items-center gap-4">
              <Link 
                href="/admin/checkpoints"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Checkpoints
              </Link>
              <Link 
                href="/admin/checkpoints/review"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Review Queue
              </Link>
              <Link 
                href="/admin/courses"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Courses
              </Link>
              <Link 
                href="/admin/unlock-rules"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Unlock Rules
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main>
        {children}
      </main>
    </div>
  )
}

