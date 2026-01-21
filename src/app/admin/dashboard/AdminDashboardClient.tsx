'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Download,
  ArrowLeft,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardClientProps {
  affiliate: {
    id: string
    name: string
    role: string
  }
}

interface DashboardData {
  metrics: {
    newSignups: number
    churns: number
    churnRate: number
    estimatedMRR: number
    ltv: number
    avgSubscriptionLengthDays: number
    avgSubscriptionLengthMonths: number
    activeSubscribersCount: number
  }
  signupsByDay: Record<string, number>
  cancellations: Array<{
    id: string
    email: string
    name: string
    canceled_at: string
    subscription_start_date: string | null
    reason: string | null
    subscriptionLengthDays: number
    subscriptionLengthMonths: number
  }>
  period: string
}

export default function AdminDashboardClient({ affiliate }: AdminDashboardClientProps) {
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_90_days' | 'all_time'>('this_month')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dashboard?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch data')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCancellations = () => {
    if (!data?.cancellations.length) return

    const csv = [
      ['Email', 'Name', 'Cancel Date', 'Subscription Length (Days)', 'Subscription Length (Months)', 'Reason'].join(','),
      ...data.cancellations.map(c => [
        c.email,
        c.name,
        new Date(c.canceled_at).toLocaleDateString(),
        c.subscriptionLengthDays,
        c.subscriptionLengthMonths,
        c.reason || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cancellations-${period}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getMaxSignups = () => {
    if (!data?.signupsByDay) return 1
    const values = Object.values(data.signupsByDay)
    return Math.max(...values, 1)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-slate-400">Loading dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-red-400">Failed to load dashboard data</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-slate-400">Subscription metrics and cancellation tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="px-4 py-2 bg-[rgba(26,26,46,0.8)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="all_time">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* New Signups */}
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{data.metrics.newSignups}</div>
            <div className="text-sm text-slate-400">New Signups</div>
          </div>

          {/* Churns */}
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{data.metrics.churns}</div>
            <div className="text-sm text-slate-400">
              Churns ({data.metrics.churnRate}% rate)
            </div>
          </div>

          {/* Estimated MRR */}
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(data.metrics.estimatedMRR)}</div>
            <div className="text-sm text-slate-400">Estimated MRR</div>
          </div>

          {/* LTV */}
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(data.metrics.ltv)}</div>
            <div className="text-sm text-slate-400">Avg LTV</div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="text-2xl font-bold text-white mb-1">{data.metrics.activeSubscribersCount}</div>
            <div className="text-sm text-slate-400">Active Subscribers</div>
          </div>
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="text-2xl font-bold text-white mb-1">
              {data.metrics.avgSubscriptionLengthDays} days
            </div>
            <div className="text-sm text-slate-400">Avg Subscription Length</div>
            <div className="text-xs text-slate-500 mt-1">
              ({data.metrics.avgSubscriptionLengthMonths} months)
            </div>
          </div>
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <div className="text-2xl font-bold text-white mb-1">{formatCurrency(data.metrics.ltv)}</div>
            <div className="text-sm text-slate-400">LTV Calculation</div>
            <div className="text-xs text-slate-500 mt-1">
              {data.metrics.avgSubscriptionLengthMonths} months × $47/month
            </div>
          </div>
        </div>

        {/* Signups Chart */}
        {Object.keys(data.signupsByDay).length > 0 && (
          <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Signups by Day</h2>
            <div className="flex items-end gap-2 h-48">
              {Object.entries(data.signupsByDay)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => {
                  const max = getMaxSignups()
                  const height = (count / max) * 100
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500/40 to-cyan-500/20 rounded-t transition-all hover:from-cyan-500/60 hover:to-cyan-500/40"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                        title={`${date}: ${count} signups`}
                      />
                      <div className="text-xs text-slate-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Recent Cancellations */}
        <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Cancellations</h2>
            {data.cancellations.length > 0 && (
              <button
                onClick={exportCancellations}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>

          {data.cancellations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No cancellations in this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.1)]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Cancel Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Subscription Length</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cancellations.map((cancellation) => (
                    <tr
                      key={cancellation.id}
                      className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-white">{cancellation.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">{cancellation.email}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {new Date(cancellation.canceled_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {cancellation.subscriptionLengthDays > 0 ? (
                          <>
                            {cancellation.subscriptionLengthDays} days
                            <span className="text-slate-500 ml-1">
                              ({cancellation.subscriptionLengthMonths} months)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">
                        {cancellation.reason || <span className="text-slate-500">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

