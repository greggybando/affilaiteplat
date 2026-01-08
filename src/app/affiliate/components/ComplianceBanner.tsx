'use client'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { ComplianceStatus } from '../hooks/useComplianceCheck'

export default function ComplianceBanner({ status, onFixAgreement, onFixTaxForm }: { 
  status: ComplianceStatus; 
  onFixAgreement: () => void; 
  onFixTaxForm: () => void;
}) {
  if (!status.hasBlockingIssues && status.warnings.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {status.blockingIssues.map((issue, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <span className="text-red-300">{issue}</span>
          </div>
          <button onClick={issue.includes('agreement') ? onFixAgreement : onFixTaxForm} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg">
            Fix Now
          </button>
        </div>
      ))}
      {status.warnings.map((warning, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-400" size={20} />
            <span className="text-yellow-300">{warning}</span>
          </div>
        </div>
      ))}
    </div>
  )
}



