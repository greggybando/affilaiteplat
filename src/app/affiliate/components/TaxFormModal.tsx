'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']

export default function TaxFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formType, setFormType] = useState<'w9' | 'w8ben' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [legalName, setLegalName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [taxClassification, setTaxClassification] = useState('individual')
  const [taxIdType, setTaxIdType] = useState<'ssn' | 'ein'>('ssn')
  const [taxId, setTaxId] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [certificationConfirmed, setCertificationConfirmed] = useState(false)
  const [electronicSignature, setElectronicSignature] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = formType === 'w9' ? {
      formType: 'w9', legalName, businessName, taxClassification, taxIdType, taxId,
      addressLine1, city, state, postalCode, certificationConfirmed, electronicSignature,
    } : {
      formType: 'w8ben', legalName, addressLine1, city, postalCode, country,
      certificationConfirmed, electronicSignature,
    }

    try {
      const res = await fetch('/api/tax-forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">{!formType ? 'Tax Information' : formType === 'w9' ? 'W-9 Form' : 'W-8BEN Form'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400">{error}</div>}

        {!formType ? (
          <div className="space-y-4">
            <p className="text-gray-300">Are you a US person for tax purposes?</p>
            <button onClick={() => setFormType('w9')} className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-left">
              <p className="font-medium text-white">Yes - W-9</p>
              <p className="text-sm text-gray-400">US citizens or residents</p>
            </button>
            <button onClick={() => setFormType('w8ben')} className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-left">
              <p className="font-medium text-white">No - W-8BEN</p>
              <p className="text-sm text-gray-400">Non-US individuals</p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Legal Name *" value={legalName} onChange={e => setLegalName(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
            
            {formType === 'w9' && (
              <>
                <input type="text" placeholder="Business Name (optional)" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300"><input type="radio" checked={taxIdType === 'ssn'} onChange={() => setTaxIdType('ssn')} /> SSN</label>
                  <label className="flex items-center gap-2 text-gray-300"><input type="radio" checked={taxIdType === 'ein'} onChange={() => setTaxIdType('ein')} /> EIN</label>
                </div>
                <input type="text" placeholder={taxIdType === 'ssn' ? 'SSN (XXX-XX-XXXX) *' : 'EIN (XX-XXXXXXX) *'} value={taxId} onChange={e => setTaxId(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
              </>
            )}

            <input type="text" placeholder="Street Address *" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
            
            <div className="grid grid-cols-3 gap-4">
              <input type="text" placeholder="City *" value={city} onChange={e => setCity(e.target.value)} required className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
              {formType === 'w9' ? (
                <select value={state} onChange={e => setState(e.target.value)} required className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                  <option value="">State *</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Country *" value={country} onChange={e => setCountry(e.target.value)} required className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
              )}
              <input type="text" placeholder="ZIP/Postal *" value={postalCode} onChange={e => setPostalCode(e.target.value)} required className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
            </div>

            <label className="flex items-center gap-3 text-gray-300">
              <input type="checkbox" checked={certificationConfirmed} onChange={e => setCertificationConfirmed(e.target.checked)} required />
              I certify this information is correct *
            </label>

            <input type="text" placeholder="Electronic Signature (type full name) *" value={electronicSignature} onChange={e => setElectronicSignature(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setFormType(null)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Back</button>
              <button type="submit" disabled={loading} className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg">
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}



