'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Handle PKCE code exchange (code in query params)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) setSessionReady(true)
        else setError('Reset link expired. Please request a new one.')
      })
      return
    }

    // Handle implicit flow (token in hash fragment)
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      // Supabase client auto-detects hash tokens
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setSessionReady(true)
      })
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true)
      }
    })

    // Also check if already has session (e.g. hash was auto-processed)
    setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setSessionReady(true)
      })
    }, 1000)

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard-home'), 2000)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:'DM Mono,monospace'}}>
      <div style={{maxWidth:'400px',width:'100%',background:'#18181b',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'32px'}}>
        <h1 style={{fontSize:'24px',color:'#f4f4f5',fontFamily:'DM Serif Display,serif',marginBottom:'8px'}}>Set new password</h1>
        <p style={{fontSize:'13px',color:'#71717a',marginBottom:'24px'}}>Choose a new password for your account.</p>
        {success ? (
          <div style={{padding:'16px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'8px',color:'#4ade80',fontSize:'13px'}}>
            ✓ Password updated! Redirecting...
          </div>
        ) : (
          <form onSubmit={handleReset} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#a1a1aa',marginBottom:'6px',display:'block'}}>New password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{background:'#0e0e0f',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'12px 14px',fontFamily:'DM Mono,monospace',fontSize:'16px',color:'#f4f4f5',outline:'none',width:'100%'}}/>
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#a1a1aa',marginBottom:'6px',display:'block'}}>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required style={{background:'#0e0e0f',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'12px 14px',fontFamily:'DM Mono,monospace',fontSize:'16px',color:'#f4f4f5',outline:'none',width:'100%'}}/>
            </div>
            {error && <p style={{fontSize:'12px',color:'#f87171'}}>{error}</p>}
            {!sessionReady && !error && <p style={{fontSize:'12px',color:'#f59e0b'}}>Verifying reset link...</p>}
            <button type="submit" disabled={loading || !sessionReady} style={{background:sessionReady?'#f59e0b':'#52525b',color:'#0e0e0f',border:'none',borderRadius:'8px',padding:'12px',fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:500,cursor:sessionReady?'pointer':'not-allowed',marginTop:'8px'}}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
