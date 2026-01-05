'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Users, FileText, AlertTriangle, Settings, X, Mail, Send, Calendar, Eye } from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardClientProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
    role: string
  }
}

export function AdminDashboardClient({ affiliate }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'members' | 'posts' | 'settings' | 'broadcast'>('reports')
  const [stats, setStats] = useState({
    totalMembers: 0,
    newMembers: 0,
    totalPosts: 0,
    newPosts: 0,
    pendingReports: 0,
    engagementRate: 0
  })
  const [reports, setReports] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Broadcast composer state
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastAudience, setBroadcastAudience] = useState('all')
  const [broadcastScheduled, setBroadcastScheduled] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false)
  const [recipientCount, setRecipientCount] = useState(0)
  
  // Admin email preferences
  const [adminEmailPrefs, setAdminEmailPrefs] = useState({
    notify_reports: true,
    notify_auto_hidden: true,
    notify_new_members: false,
    daily_digest: false
  })

  useEffect(() => {
    fetchStats()
    if (activeTab === 'reports') fetchReports()
    if (activeTab === 'members') fetchMembers()
    if (activeTab === 'broadcast') {
      fetchBroadcasts()
      calculateRecipientCount()
    }
  }, [activeTab, broadcastAudience])

  useEffect(() => {
    calculateRecipientCount()
  }, [broadcastAudience])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/community/admin/stats')
      const data = await res.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/community/reports')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/community/admin/members')
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/email/broadcast')
      const data = await res.json()
      setBroadcasts(data.broadcasts || [])
    } catch (error) {
      console.error('Error fetching broadcasts:', error)
    }
  }

  const calculateRecipientCount = async () => {
    // This is a simplified count - in production, you'd want to actually query the database
    // For now, we'll estimate based on audience type
    try {
      const res = await fetch('/api/community/admin/stats')
      const data = await res.json()
      const stats = data.stats

      let count = 0
      switch (broadcastAudience) {
        case 'all':
          count = stats.totalMembers || 0
          break
        case 'active':
          count = Math.floor((stats.totalMembers || 0) * 0.3) // Estimate 30% active
          break
        case 'new':
          count = stats.newMembers || 0
          break
        case 'role_member':
          count = Math.floor((stats.totalMembers || 0) * 0.9) // Estimate 90% members
          break
        case 'role_mod':
          count = 5 // Estimate
          break
        case 'role_admin':
          count = 2 // Estimate
          break
      }
      setRecipientCount(count)
    } catch (error) {
      console.error('Error calculating recipient count:', error)
    }
  }

  const handleSendTestEmail = async () => {
    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/email/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: broadcastSubject,
          body_html: broadcastBody,
          body_text: broadcastBody.replace(/<[^>]*>/g, ''),
          audience: broadcastAudience,
          send_test: true
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert('Test email sent! Check your inbox.')
      } else {
        alert(`Failed to send test: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to send test email')
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handleSendBroadcast = async () => {
    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/email/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: broadcastSubject,
          body_html: broadcastBody,
          body_text: broadcastBody.replace(/<[^>]*>/g, ''),
          audience: broadcastAudience,
          scheduled_for: broadcastScheduled || null
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert(`Broadcast created! ${data.broadcast.recipient_count} recipients.`)
        setBroadcastSubject('')
        setBroadcastBody('')
        setBroadcastAudience('all')
        setBroadcastScheduled('')
        setShowBroadcastConfirm(false)
        fetchBroadcasts()
      } else {
        alert(`Failed to create broadcast: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to create broadcast')
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handleResolveReport = async (reportId: string, action: string, body: any) => {
    try {
      const res = await fetch(`/api/community/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
      })

      if (!res.ok) throw new Error('Failed to resolve report')

      fetchReports()
      fetchStats()
    } catch (error) {
      console.error('Error resolving report:', error)
      alert('Failed to resolve report. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage your community</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-500" />
              <span className="text-xs text-green-600 font-semibold">+{stats.newMembers} this week</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalMembers}</div>
            <div className="text-sm text-slate-500">Total Members</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-purple-500" />
              <span className="text-xs text-green-600 font-semibold">+{stats.newPosts} this week</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalPosts}</div>
            <div className="text-sm text-slate-500">Total Posts</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              {stats.pendingReports > 0 && (
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.pendingReports}</div>
            <div className="text-sm text-slate-500">Pending Reports</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.engagementRate}</div>
            <div className="text-sm text-slate-500">Engagement Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-slate-200">
            <div className="flex gap-1 px-6">
              {[
                { id: 'reports', label: 'Reports', icon: AlertTriangle },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'posts', label: 'Posts', icon: FileText },
                { id: 'broadcast', label: 'Email Broadcast', icon: Mail },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No reports to review
                  </div>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {report.status}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                              {report.reason}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Reported by {report.reporter?.name} • {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {report.post && (
                        <div className="bg-slate-50 rounded p-3 mb-3">
                          <p className="font-semibold text-sm mb-1">{report.post.title}</p>
                          <p className="text-sm text-slate-600 line-clamp-2">{report.post.content}</p>
                        </div>
                      )}
                      {report.details && (
                        <p className="text-sm text-slate-600 mb-3">{report.details}</p>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveReport(report.id, 'resolve', { deleteContent: true })}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete Content
                          </button>
                          <button
                            onClick={() => handleResolveReport(report.id, 'dismiss', {})}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-2">
                {members.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No members found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Member</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Posts</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {members.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                    {member.name[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-slate-900">{member.name}</div>
                                  <div className="text-xs text-slate-500">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                member.role === 'moderator' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{member.postsCount}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                member.status === 'active' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="text-center py-12 text-slate-500">
                Posts management coming soon
              </div>
            )}

            {activeTab === 'broadcast' && (
              <div className="space-y-6">
                {/* Broadcast Composer */}
                <div className="border border-slate-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Compose Broadcast</h3>
                  
                  <div className="space-y-4">
                    {/* Audience Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        To
                      </label>
                      <select
                        value={broadcastAudience}
                        onChange={(e) => setBroadcastAudience(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">All members</option>
                        <option value="active">Active members (posted/commented in last 30 days)</option>
                        <option value="new">New members (joined last 7 days)</option>
                        <option value="role_member">Members only</option>
                        <option value="role_mod">Moderators only</option>
                        <option value="role_admin">Admins only</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Estimated recipients: {recipientCount}
                      </p>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={broadcastSubject}
                        onChange={(e) => setBroadcastSubject(e.target.value)}
                        placeholder="Email subject line"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        value={broadcastBody}
                        onChange={(e) => setBroadcastBody(e.target.value)}
                        placeholder="Write your message here. You can use HTML for formatting."
                        rows={10}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        HTML is supported. Use &lt;p&gt; for paragraphs, &lt;strong&gt; for bold, &lt;a href="..."&gt; for links.
                      </p>
                    </div>

                    {/* Schedule */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Schedule (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={broadcastScheduled}
                        onChange={(e) => setBroadcastScheduled(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Leave empty to send immediately
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={handleSendTestEmail}
                        disabled={!broadcastSubject || !broadcastBody || sendingBroadcast}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Send Test to Me
                      </button>
                      <button
                        onClick={() => setShowBroadcastConfirm(true)}
                        disabled={!broadcastSubject || !broadcastBody || sendingBroadcast}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                      >
                        <Send className="w-4 h-4" />
                        {broadcastScheduled ? 'Schedule' : 'Send Now'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Broadcast History */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Broadcast History</h3>
                  {broadcasts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border border-slate-200 rounded-lg">
                      No broadcasts yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {broadcasts.map(broadcast => (
                        <div key={broadcast.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900">{broadcast.subject}</h4>
                              <p className="text-sm text-slate-600">
                                To: {broadcast.audience} • {broadcast.recipient_count} recipients
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              broadcast.status === 'sent' ? 'bg-green-100 text-green-700' :
                              broadcast.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                              broadcast.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                              broadcast.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {broadcast.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Sent by {broadcast.admin?.name} • {new Date(broadcast.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">Admin Email Preferences</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">Email me on new reports</p>
                      <p className="text-sm text-slate-500">Get instant email when a new report is submitted</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminEmailPrefs.notify_reports}
                      onChange={(e) => setAdminEmailPrefs({ ...adminEmailPrefs, notify_reports: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">Email me on auto-hidden posts</p>
                      <p className="text-sm text-slate-500">Get notified when a post is automatically hidden</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminEmailPrefs.notify_auto_hidden}
                      onChange={(e) => setAdminEmailPrefs({ ...adminEmailPrefs, notify_auto_hidden: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">Email me on new members</p>
                      <p className="text-sm text-slate-500">Get notified when a new member joins</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminEmailPrefs.notify_new_members}
                      onChange={(e) => setAdminEmailPrefs({ ...adminEmailPrefs, notify_new_members: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">Daily admin digest</p>
                      <p className="text-sm text-slate-500">Receive a daily summary of admin activity</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminEmailPrefs.daily_digest}
                      onChange={(e) => setAdminEmailPrefs({ ...adminEmailPrefs, daily_digest: e.target.checked })}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <button
                    onClick={async () => {
                      // TODO: Implement admin email preferences API
                      alert('Admin email preferences saved!')
                    }}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast Confirmation Modal */}
      {showBroadcastConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBroadcastConfirm(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirm Broadcast</h3>
            <p className="text-slate-600 mb-4">
              You're about to email <strong>{recipientCount}</strong> members.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              <strong>Subject:</strong> {broadcastSubject}
            </p>
            <p className="text-sm text-red-600 mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBroadcastConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBroadcast}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

