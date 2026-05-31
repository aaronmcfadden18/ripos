'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
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
              <div className="rip-headline-wrap">
                <h1 className="rip-headline">Your card operation,<br />centralized.</h1>
                <p className="rip-sub">Track streams, profit, and inventory — without the spreadsheet chaos.</p>
              </div>
              <form onSubmit={handleMagicLink} className="rip-form">
                <div className="rip-field">
                  <label htmlFor="email" className="rip-label">Email address</label>
                  <input id="email" type="email" placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} required className="rip-input" />
                </div>
                {error && <p className="rip-error" role="alert">{error}</p>}
                <button type="submit" disabled={loading || !email} className="rip-btn-primary">
                  {loading ? <span className="rip-spinner" /> : 'Send magic link'}
                </button>
              </form>
              <p className="rip-fine">No password needed. We'll email you a one-click sign-in link.</p>
            </>
          ) : (
            <div className="rip-sent">
              <div className="rip-sent-icon">✦</div>
              <h2 className="rip-sent-title">Check your inbox</h2>
              <p className="rip-sent-body">We sent a magic link to <strong>{email}</strong>. Click it to sign in.</p>
              <button className="rip-btn-ghost" onClick={() => { setSent(false); setEmail('') }}>Use a different email</button>
            </div>
          )}
        </div>
        <p className="rip-tagline">Built for breakers. Designed to ship.</p>
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        .rip-root { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0e0e0f; font-family:'DM Mono',monospace; position:relative; overflow:hidden; padding:24px; }
        .rip-bg { position:absolute; inset:0; pointer-events:none; }
        .rip-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px); background-size:48px 48px; }
        .rip-glow { position:absolute; top:-180px; left:50%; transform:translateX(-50%); width:600px; height:400px; background:radial-gradient(ellipse at center,rgba(245,158,11,0.10) 0%,transparent 70%); }
        .rip-main { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:20px; width:100%; max-width:400px; }
        .rip-card { width:100%; background:#18181b; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:36px 32px; animation:rip-fadein 0.5s ease both; }
        @keyframes rip-fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .rip-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
        .rip-logo-mark { width:34px; height:34px; background:#f59e0b; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .rip-logo-inner { font-family:'DM Serif Display',serif; font-size:18px; color:#0e0e0f; }
        .rip-logo-text { font-size:17px; font-weight:500; color:#f4f4f5; }
        .rip-logo-text em { font-style:normal; color:#f59e0b; }
        .rip-headline { font-family:'DM Serif Display',serif; font-size:26px; line-height:1.2; color:#f4f4f5; margin:0 0 8px; font-weight:400; }
        .rip-sub { font-size:13px; color:#71717a; margin:0 0 24px; line-height:1.6; }
        .rip-form { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
        .rip-field { display:flex; flex-direction:column; gap:6px; }
        .rip-label { font-size:12px; color:#a1a1aa; }
        .rip-input { background:#0e0e0f; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:10px 14px; font-family:'DM Mono',monospace; font-size:14px; color:#f4f4f5; outline:none; width:100%; box-sizing:border-box; }
        .rip-input:focus { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,0.12); }
        .rip-error { font-size:12px; color:#f87171; padding:8px 12px; background:rgba(248,113,113,0.08); border-radius:6px; border:1px solid rgba(248,113,113,0.2); }
        .rip-btn-primary { background:#f59e0b; color:#0e0e0f; border:none; border-radius:8px; padding:11px 16px; font-family:'DM Mono',monospace; font-size:14px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; min-height:42px; width:100%; }
        .rip-btn-primary:hover:not(:disabled) { background:#d97706; }
        .rip-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .rip-spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(14,14,15,0.3); border-top-color:#0e0e0f; border-radius:50%; animation:rip-spin 0.7s linear infinite; }
        @keyframes rip-spin { to{transform:rotate(360deg)} }
        .rip-fine { font-size:11px; color:#52525b; text-align:center; margin:0; }
        .rip-sent { text-align:center; padding:8px 0; }
        .rip-sent-icon { font-size:32px; color:#f59e0b; margin-bottom:16px; }
        .rip-sent-title { font-family:'DM Serif Display',serif; font-size:22px; font-weight:400; color:#f4f4f5; margin:0 0 10px; }
        .rip-sent-body { font-size:13px; color:#71717a; line-height:1.6; margin:0 0 24px; }
        .rip-sent-body strong { color:#a1a1aa; }
        .rip-btn-ghost { background:transparent; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:9px 16px; font-family:'DM Mono',monospace; font-size:13px; color:#71717a; cursor:pointer; }
        .rip-tagline { font-size:11px; color:#3f3f46; margin:0; }
      `}</style>
    </div>
  )
}
