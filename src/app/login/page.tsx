'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [showAuth, setShowAuth] = useState(false)
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
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/auth/callback' } })
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

  if (!showAuth) return (
    <div className="land">
      <nav className="land-nav">
        <img src="/logo.png" style={{height:"36px",width:"auto"}} alt="RipOS"/>
        <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
          <span className="land-beta">Free beta</span>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}><a href='/legal/terms' style={{fontSize:'11px',color:'#52525b',textDecoration:'none'}}>Terms</a><a href='/legal/privacy' style={{fontSize:'11px',color:'#52525b',textDecoration:'none'}}>Privacy</a><button className="land-signin" onClick={()=>{setShowAuth(true);setMode('login')}}>Sign in</button></div>
          <button className="land-cta" onClick={()=>{setShowAuth(true);setMode('signup')}}>Sign up free →</button>
        </div>
      </nav>
      <section className="land-hero">
        <div className="land-tag">Built for Whatnot card breakers</div>
        <h1 className="land-headline">Stop guessing.<br/><span className="land-accent">Know your profit.</span></h1>
        <p className="land-sub">Whatnot tells you what you earned. RipOS tells you what you actually made — after stock costs, platform fees, and VAT. See what you actually made — in 30 seconds.</p>
        <button className="land-cta land-cta-lg" onClick={()=>{setShowAuth(true);setMode('signup')}}>See your real profit →</button>
        <p className="land-note">No credit card · Free during beta</p>
        <div className="land-preview">
          <div className="land-preview-card">
            <div className="land-preview-row">
              <div><p className="land-preview-label">Whatnot says you made</p><p className="land-preview-val land-grey">£2,840</p></div>
              <div className="land-arrow">→</div>
              <div><p className="land-preview-label">RipOS true profit</p><p className="land-preview-val land-green">£1,247</p></div>
            </div>
            <p className="land-preview-hint">After stock costs · platform fees · VAT</p>
          </div>
        </div>
      </section>
      <section className="land-section">
        <div className="land-inner">
          <h2 className="land-title">Sound familiar?</h2>
          <div className="land-problems">
            {[
              {icon:'📊',text:'You check Whatnot and see £2,800 — but have no idea what you actually kept after buying stock'},
              {icon:'📦',text:"You bought boxes three weeks ago and can't remember what you paid for them"},
              {icon:'🧾',text:"Tax time arrives and you're digging through bank statements and DMs"},
              {icon:'⏰',text:'You price packs by gut feel and hope you made money after fees'},
            ].map((p,i)=>(
              <div key={i} className="land-problem">
                <span style={{fontSize:'22px'}}>{p.icon}</span>
                <p className="land-problem-text">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="land-section land-dark">
        <div className="land-inner land-stats">
          <div className="land-stat"><p className="land-stat-val">30s</p><p className="land-stat-label">To import a month of streams</p></div>
          <div className="land-stat-div"/>
          <div className="land-stat"><p className="land-stat-val">£0</p><p className="land-stat-label">Cost during beta</p></div>
          <div className="land-stat-div"/>
          <div className="land-stat"><p className="land-stat-val">100%</p><p className="land-stat-label">Built for Whatnot sellers</p></div>
          <div className="land-stat-div"/>
          <div className="land-stat"><p className="land-stat-val">5min</p><p className="land-stat-label">To get fully set up</p></div>
        </div>
      </section>
      <section className="land-section land-cta-section">
        <div className="land-inner" style={{alignItems:'center',textAlign:'center'}}>
          <h2 className="land-title">Stop guessing.<br/>Know your numbers.</h2>
          <p className="land-sub">Free during beta. No credit card. Built for Whatnot card breakers.</p>
          <button className="land-cta land-cta-lg" onClick={()=>{setShowAuth(true);setMode('signup')}}>See your real profit →</button>
        </div>
      </section>
      <footer className="land-footer">
        <img src="/logo.png" style={{height:"28px",width:"auto"}} alt="RipOS"/>
        <button className="land-signin" onClick={()=>{setShowAuth(true);setMode('login')}}>Sign in</button>
      </footer>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .land{min-height:100vh;display:flex;flex-direction:column}
        .land-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);max-width:1100px;margin:0 auto;width:100%}
        .land-logo{font-size:18px;font-weight:500;color:#f4f4f5}.land-logo em{font-style:normal;color:#f59e0b}
        .land-beta{font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:3px 10px}
        .land-signin{background:none;border:none;color:#a1a1aa;font-size:13px;cursor:pointer;font-family:'DM Mono',monospace}
        .land-signin:hover{color:#f4f4f5}
        .land-cta{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Mono',monospace}
        .land-cta:hover{background:#d97706}
        .land-cta-lg{padding:14px 28px;font-size:15px;border-radius:10px}
        .land-hero{max-width:1100px;margin:0 auto;width:100%;padding:80px 24px 60px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px}
        .land-tag{font-size:12px;color:#f59e0b;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:5px 14px;text-transform:uppercase;letter-spacing:0.08em}
        .land-headline{font-family:'DM Serif Display',serif;font-size:clamp(36px,7vw,72px);font-weight:400;color:#f4f4f5;line-height:1.1}
        .land-accent{color:#f59e0b}
        .land-sub{font-size:16px;color:#b4b4b8;line-height:1.7;max-width:560px}
        .land-note{font-size:12px;color:#71717a}
        .land-preview{width:100%;max-width:480px}
        .land-preview-card{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px}
        .land-preview-row{display:flex;align-items:center;justify-content:center;gap:24px}
        .land-preview-label{font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .land-preview-val{font-family:'DM Serif Display',serif;font-size:36px}
        .land-grey{color:#52525b;text-decoration:line-through}
        .land-green{color:#4ade80}
        .land-arrow{font-size:24px;color:#f59e0b}
        .land-preview-hint{font-size:12px;color:#71717a;text-align:center}
        .land-section{padding:80px 24px;width:100%}
        .land-dark{background:#18181b;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06)}
        .land-cta-section{background:rgba(245,158,11,0.04);border-top:1px solid rgba(245,158,11,0.15)}
        .land-inner{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:32px}
        .land-title{font-family:'DM Serif Display',serif;font-size:clamp(28px,4vw,44px);font-weight:400;color:#f4f4f5;line-height:1.2}
        .land-problems{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .land-problem{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;gap:14px;align-items:flex-start}
        .land-problem-text{font-size:14px;color:#b4b4b8;line-height:1.6}
        .land-stats{flex-direction:row;align-items:center;justify-content:center}
        .land-stat{display:flex;flex-direction:column;gap:8px;padding:32px 40px;text-align:center}
        .land-stat-val{font-family:'DM Serif Display',serif;font-size:48px;color:#f59e0b}
        .land-stat-label{font-size:13px;color:#b4b4b8}
        .land-stat-div{width:1px;height:80px;background:rgba(255,255,255,0.08)}
        .land-footer{padding:32px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto;width:100%}
        @media(max-width:640px){.land-problems{grid-template-columns:1fr}.land-stats{flex-direction:column}.land-stat-div{display:none}}
      `}</style>
    </div>
  )

  return (
    <div className="rip-root">
      <div className="rip-bg"><div className="rip-grid"/><div className="rip-glow"/></div>
      <main className="rip-main">
        <div className="rip-card">
          <div className="rip-logo-wrap">
            <img src="/logo.png" style={{height:"32px",width:"auto"}} alt="RipOS"/>
          </div>
          <button className="rip-back" onClick={()=>setShowAuth(false)}>← Back to home</button>
          {sent ? (
            <div className="rip-sent">
              <p className="rip-sent-title">{mode === 'magic' ? 'Check your email' : 'Account created!'}</p>
              <p className="rip-sent-sub">{mode === 'magic' ? 'We sent you a magic link.' : 'You can now sign in.'}</p>
              <button className="rip-tab-active" onClick={()=>{setSent(false);setMode('login')}}>Sign in instead</button>
            </div>
          ) : (
            <>
              <div className="rip-tabs">
                <button className={mode==='login'?'rip-tab-active':'rip-tab'} onClick={()=>setMode('login')}>Sign in</button>
                <button className={mode==='signup'?'rip-tab-active':'rip-tab'} onClick={()=>setMode('signup')}>Sign up</button>
                <button className={mode==='magic'?'rip-tab-active':'rip-tab'} onClick={()=>setMode('magic')}>Magic link</button>
              </div>
              <form onSubmit={handleSubmit} className="rip-form">
                <div className="rip-field">
                  <label className="rip-label">Email address</label>
                  <input className="rip-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus/>
                </div>
                {mode !== 'magic' && (
                  <div className="rip-field">
                    <label className="rip-label">Password</label>
                    <input className="rip-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required/>
                  </div>
                )}
                {error && <p className="rip-error">{error}</p>}
                <button type="submit" className="rip-submit" disabled={loading}>
                  {loading ? 'Loading…' : mode==='login' ? 'Sign in' : mode==='signup' ? 'Create account' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .rip-root{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
        .rip-bg{position:absolute;inset:0;pointer-events:none}
        .rip-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:48px 48px}
        .rip-glow{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:700px;height:500px;background:radial-gradient(ellipse at center,rgba(245,158,11,0.08) 0%,transparent 70%)}
        .rip-main{position:relative;z-index:1;width:100%;max-width:400px}
        .rip-card{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:16px}
        .rip-logo-wrap{display:flex;align-items:center;gap:10px}
        .rip-logo-mark{width:36px;height:36px;background:#f59e0b;border-radius:9px;display:flex;align-items:center;justify-content:center}
        .rip-logo-inner{font-family:'DM Serif Display',serif;font-size:20px;color:#0e0e0f;font-weight:700}
        .rip-logo-text{font-size:18px;font-weight:500;color:#f4f4f5}.rip-logo-text em{font-style:normal;color:#f59e0b}
        .rip-back{background:none;border:none;color:#71717a;font-size:12px;cursor:pointer;font-family:'DM Mono',monospace;text-align:left;padding:0}
        .rip-back:hover{color:#f4f4f5}
        .rip-tabs{display:flex;gap:4px;background:#0e0e0f;border-radius:8px;padding:4px}
        .rip-tab{flex:1;background:none;border:none;color:#71717a;font-size:13px;padding:7px;cursor:pointer;border-radius:6px;font-family:'DM Mono',monospace}
        .rip-tab:hover{color:#f4f4f5}
        .rip-tab-active{flex:1;background:#18181b;border:none;color:#f4f4f5;font-size:13px;padding:7px;cursor:pointer;border-radius:6px;font-family:'DM Mono',monospace;font-weight:500}
        .rip-form{display:flex;flex-direction:column;gap:14px}
        .rip-field{display:flex;flex-direction:column;gap:6px}
        .rip-label{font-size:12px;color:#a1a1aa}
        .rip-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;font-family:'DM Mono',monospace;font-size:14px;color:#f4f4f5;outline:none;width:100%}
        .rip-input:focus{border-color:rgba(245,158,11,0.5)}
        .rip-error{font-size:12px;color:#f87171}
        .rip-submit{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:11px;font-family:'DM Mono',monospace;font-size:14px;font-weight:500;cursor:pointer;width:100%}
        .rip-submit:disabled{opacity:0.5;cursor:not-allowed}
        .rip-sent{display:flex;flex-direction:column;gap:10px}
        .rip-sent-title{font-size:16px;color:#f4f4f5;font-weight:500}
        .rip-sent-sub{font-size:13px;color:#71717a}
      `}</style>
    </div>
  )
}
