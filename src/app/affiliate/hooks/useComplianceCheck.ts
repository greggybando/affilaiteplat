'use client'
import { useState, useEffect } from 'react'

export interface ComplianceStatus {
  agreementAccepted: boolean
  taxFormStatus: string
  taxFormRequired: boolean
  hasBlockingIssues: boolean
  blockingIssues: string[]
  warnings: string[]
}

export function useComplianceCheck() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const [agreementRes, taxRes] = await Promise.all([
          fetch('/api/agreement'),
          fetch('/api/tax-forms'),
        ])
        const [agreement, tax] = await Promise.all([agreementRes.json(), taxRes.json()])

        const blockingIssues: string[] = []
        const warnings: string[] = []

        if (!agreement.acceptance?.accepted) blockingIssues.push('Affiliate agreement not accepted')
        if (tax.status === 'required') blockingIssues.push('Tax form required before payout')
        else if (tax.status === 'recommended') warnings.push('Tax form recommended - approaching $600')

        setStatus({
          agreementAccepted: agreement.acceptance?.accepted || false,
          taxFormStatus: tax.status,
          taxFormRequired: tax.status === 'required',
          hasBlockingIssues: blockingIssues.length > 0,
          blockingIssues,
          warnings,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  return { status, loading }
}



