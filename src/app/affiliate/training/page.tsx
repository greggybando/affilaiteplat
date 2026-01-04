import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'

export default async function TrainingPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Training</h1>
        <p className="text-gray-400 mb-6">Training content coming soon!</p>
        
        <div className="space-y-6">
          <div className="border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Course Title</h2>
            <p className="text-gray-400 mb-4">Course description area</p>
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
              Video embed placeholder
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}




