'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const BRAND_BLUE = '#0133FF'
const LOGO_URL = '/smartrep-logo-hvid.png'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password skal have mindst 6 tegn')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords matcher ikke')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/invite/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('smartrep_token', data.token)
        setSuccess(true)
        setTimeout(() => router.push('/'), 1500)
      }
    } catch (err) {
      setError('Der opstod en fejl. Prøv igen.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ugyldigt link</h1>
          <p className="text-gray-600">Linket mangler eller er forkert.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Adgangskode oprettet</h1>
          <p className="text-gray-600">Du omdirigeres til portalen...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4" style={{ color: BRAND_BLUE }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-[#0133ff] py-8 px-6 text-center">
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 w-auto mx-auto" />
        </div>
        <div className="p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Opret din adgangskode</h1>
          <p className="text-gray-600 mb-6">Du er inviteret til SMARTREP Kundeportalen. Vælg et password for at logge ind.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password (min. 6 tegn)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Indtast password"
                required
                minLength={6}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bekræft password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Gentag password"
                required
                disabled={submitting}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Opret adgangskode og log ind'}
            </button>
          </form>
        </div>
        <div className="bg-[#1a1a2e] py-4 px-6 text-center">
          <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Øvrige brands under SMARTREP</span>
          <div className="flex justify-center gap-3 text-sm">
            <a href="https://www.alupleje.dk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">Alupleje</a>
            <span className="text-gray-500">•</span>
            <a href="https://www.colorup.dk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">COLOR:UP</a>
            <span className="text-gray-500">•</span>
            <a href="https://www.coating.dk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">Coating.dk</a>
          </div>
        </div>
      </div>
    </div>
  )
}
