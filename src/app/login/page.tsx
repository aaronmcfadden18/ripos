'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError(error.message)
      else setSent(true)
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSent(true)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard-home')
    setLoading(false)
  }

  return (
    <div className="rip-root">
      <div className="rip-bg">
        <div className="rip-grid" />
        <div className="rip-glow" />
      </div>
      <main className="rip-main">
        <div className="rip-card">
          <div className="rip-logo-wrap">
            <div className="rip-logo-mark"><span className="rip-logo-inner">R</span></div>
            <span className="rip-logo-text">Rip<em>OS</em></span>
          </div>
          {!sent ? (
            <>
              <div className="rip-tabs">
                <button className={`rip-tab${mode==='login'?' rip-tab-active':''}`} onClick={()=>setMode('login')}>Sign in</button>
                <button className={`rip-tab${mode==='signup'?' rip-tab-active':''}`} onClick={()=>setMode('signup')}>Sign up</button>
                <button className={`rip-tab${mode==='magic'?' rip-tab-active':''}`} onClick={()=>setMode('magic')}>Magic link</button>
              </div>
              <form onSubmit={handleSubmit} className="rip-form">
                <div className="rip-field">
                  <label className="rip-label">Email address</label>
                  <input type="email" placeholder="you@example.com" value={email}
                    onChange={e=>setEmail(e.target.value)} required className="rip-input" />
                </div>
                {mode !== 'magic' && (
                  <div className="rip-field">
                    <label className="rip-label">Password</label>
                    <input type="password" placeholder="••••••••" value={password}
                      onChange={e=>setPassword(e.target.value)} required className="rip-input" />
                  </div>
                )}
                {error && <p className="rip-error">{error}</p>}
                <button type="submit" disabled={loading || !email} className="rip-btn-primary">
                  {loading ? <span className="rip-spinner" /> : mode==='login' ? 'Sign in' : mode==='signup' ? 'Create account' : 'Send magic link'}
                </button>
              </form>
            </>
          ) : (
            <div className="rip-sent">
              <div className="rip-sent-icon">✦</div>
              <h2 className="rip-sent-title">{mode==='signup' ? 'Account created!' : 'Check your inbox'}</h2>
              <p className="rip-sent-body">{mode==='signup' ? 'You can now sign in with your email and password.' : `We sent a magic link to ${email}.`}</p>
              <button className="rip-btn-ghost" onClick={()=>{setSent(false);setMode('login')}}>Back to sign in</button>
            </div>
          )}
        </div>
        <p className="rip-tagline"><a href="/home" style={{color:"#52525b",fontSize:"12px",textDecoration:"none",fontFamily:"DM Mono,monospace"}}>← Back to home</a></p>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        .rip-root{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e0e0f;font-family:'DM Mono',monospace;position:relative;overflow:hidden;padding:24px}
        .rip-bg{position:absolute;inset:0;pointer-events:none}
        .rip-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:48px 48px}
        .rip-glow{position:absolute;top:-180px;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse at center,rgba(245,158,11,0.10) 0%,transparent 70%)}
        .rip-main{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:20px;width:100%;max-width:400px}
        .rip-card{width:100%;background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px}
        .rip-logo-wrap{display:flex;align-items:center;gap:10px;margin-bottom:28px}
        .rip-logo-mark{width:34px;height:34px;background:#f59e0b;border-radius:8px;display:flex;align-items:center;justify-content:center}
        .rip-logo-inner{font-family:'DM Serif Display',serif;font-size:18px;color:#0e0e0f}
        .rip-logo-text{font-size:17px;font-weight:500;color:#f4f4f5}
        .rip-logo-text em{font-style:normal;color:#f59e0b}
        .rip-tabs{display:flex;gap:4px;margin-bottom:24px;background:#0e0e0f;border-radius:8px;padding:4px}
        .rip-tab{flex:1;background:none;border:none;padding:7px;font-family:'DM Mono',monospace;font-size:12px;color:#52525b;cursor:pointer;border-radius:6px}
        .rip-tab-active{background:#18181b;color:#f4f4f5;border:1px solid rgba(255,255,255,0.08)}
        .rip-form{display:flex;flex-direction:column;gap:12px}
        .rip-field{display:flex;flex-direction:column;gap:6px}
        .rip-label{font-size:12px;color:#a1a1aa}
        .rip-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;font-family:'DM Mono',monospace;font-size:14px;color:#f4f4f5;outline:none;width:100%;box-sizing:border-box}
        .rip-input:focus{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.12)}
        .rip-error{font-size:12px;color:#f87171;padding:8px 12px;background:rgba(248,113,113,0.08);border-radius:6px;border:1px solid rgba(248,113,113,0.2)}
        .rip-btn-primary{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:11px 16px;font-family:'DM Mono',monospace;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:42px;width:100%;margin-top:4px}
        .rip-btn-primary:hover:not(:disabled){background:#d97706}
        .rip-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
        .rip-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(14,14,15,0.3);border-top-color:#0e0e0f;border-radius:50%;animation:rip-spin 0.7s linear infinite}
        @keyframes rip-spin{to{transform:rotate(360deg)}}
        .rip-sent{text-align:center;padding:8px 0}
        .rip-sent-icon{font-size:32px;color:#f59e0b;margin-bottom:16px}
        .rip-sent-title{font-family:'DM Serif Display',serif;font-size:22px;font-weight:400;color:#f4f4f5;margin:0 0 10px}
        .rip-sent-body{font-size:13px;color:#71717a;line-height:1.6;margin:0 0 24px}
        .rip-btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 16px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer}
        .rip-tagline{font-size:11px;color:#3f3f46;margin:0}
      `}</style>
    </div>
  )
}
