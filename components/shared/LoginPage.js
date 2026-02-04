'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.post('/auth/login', { email, password })
      localStorage.setItem('smartrep_token', data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #0022cc 100%)` }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img src="https://customer-assets.emergentagent.com/job_clientflow-140/artifacts/13cklo26_SMARTREP_Cirkel_2_bla%CC%8A.png" alt="SMARTREP" className="h-20 mx-auto" />
          <div>
            <CardTitle className="text-2xl">Velkommen tilbage</CardTitle>
            <CardDescription>Log ind på SMARTREP portalen</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="din@email.dk" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND_BLUE }} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Log ind
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
