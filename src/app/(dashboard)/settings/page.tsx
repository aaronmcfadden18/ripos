'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [storeName, setStoreName] = useState('')
  const [defaultPlatform, setDefaultPlatform] = useState('Whatnot')
  const [defaultFee, setDefaultFee] = useState('8')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: p } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      if (p) {
        setProfile(p)
        setStoreName(p.store_name ?? '')
        setDefaultPlatform(p.default_platform ?? 'Whatnot')
        setDefaultFee(p.default_fee_pct?.toString() ?? '8')
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('user_profiles').upsert({
      user_id: user.id,
      store_name: storeName.trim() || null,
      default_platform: defaultPlatform,
      default_fee_pct: parseFloat(defaultFee) || 8,
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePasswordChange = async () => {
    setPwError('')
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); setPwSaving(false); return }
    setPwSuccess(true)
    setNewPassword(''); setConfirmPassword(''); setCurrentPassword('')
    setPwSaving(false)
    setTimeout(() => setPwSuccess(false), 3000)
  }

  const [portalLoading, setPortalLoading] = useState(false)
  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) { window.location.href = data.url }
      else { alert(data.error || 'Could not open billing portal'); setPortalLoading(false) }
    } catch {
      alert('Could not open billing portal'); setPortalLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <div className="st">
      <div className="st-header">
        <Link href="/" className="st-back">← Dashboard</Link>
        <h1 className="st-title">Settings</h1>
        <p className="st-sub">{user.email}</p>
      </div>

      <div className="st-card">
        <h2 className="st-card-title">Store profile</h2>
        <div className="st-fields">
          <div className="st-field">
            <label className="st-label">Store name</label>
            <input className="st-input" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Wanted Poster Pulls" />
            <p className="st-hint">Shown on your dashboard and reports</p>
          </div>
          <div className="st-field">
            <label className="st-label">Default platform</label>
            <select className="st-select" value={defaultPlatform} onChange={e => setDefaultPlatform(e.target.value)}>
              <option>Whatnot</option>
              <option>eBay</option>
              <option>TikTok Live</option>
              <option>YouTube</option>
              <option>Instagram</option>
              <option>In-person</option>
              <option>Other</option>
            </select>
            <p className="st-hint">Pre-selected when logging a new stream</p>
          </div>
          <div className="st-field">
            <label className="st-label">Default platform fee (%)</label>
            <input className="st-input" type="number" min="0" max="100" step="0.1" value={defaultFee} onChange={e => setDefaultFee(e.target.value)} placeholder="8" />
            <p className="st-hint">Whatnot charges 8% + 2.9% processing</p>
          </div>
        </div>
        <div className="st-actions">
          <button className="st-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="st-card">
        <h2 className="st-card-title">Change password</h2>
        <div className="st-fields">
          <div className="st-field">
            <label className="st-label">New password</label>
            <input className="st-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="st-field">
            <label className="st-label">Confirm new password</label>
            <input className="st-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        {pwError && <p className="st-error">{pwError}</p>}
        {pwSuccess && <p className="st-success">Password updated successfully</p>}
        <div className="st-actions">
          <button className="st-save" onClick={handlePasswordChange} disabled={pwSaving || !newPassword || !confirmPassword}>
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>

      <div className="st-card">
        <h2 className="st-card-title">Subscription</h2>
        <p className="st-sub" style={{marginBottom:'4px'}}>Manage your plan, payment method, or cancel anytime.</p>
        <div className="st-actions">
          <button className="st-save" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? 'Opening…' : 'Manage subscription'}
          </button>
        </div>
      </div>

      <div className="st-card st-danger-card">
        <h2 className="st-card-title">Account</h2>
        <p className="st-sub" style={{marginBottom:'16px'}}>Signed in as {user.email}</p>
        <button className="st-signout" onClick={handleSignOut}>Sign out</button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .st{max-width:600px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .st-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .st-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .st-sub{font-size:13px;color:#52525b}
        .st-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px}
        .st-danger-card{border-color:rgba(248,113,113,0.15)}
        .st-card-title{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .st-fields{display:flex;flex-direction:column;gap:14px}
        .st-field{display:flex;flex-direction:column;gap:6px}
        .st-label{font-size:12px;color:#a1a1aa}
        .st-hint{font-size:11px;color:#3f3f46;margin-top:2px}
        .st-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%}
        .st-input:focus{border-color:rgba(245,158,11,0.5)}
        .st-select{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%;cursor:pointer}
        .st-select:focus{border-color:rgba(245,158,11,0.5)}
        .st-actions{display:flex;justify-content:flex-end}
        .st-save{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer}
        .st-save:disabled{opacity:0.5;cursor:not-allowed}
        .st-signout{background:none;border:1px solid rgba(248,113,113,0.3);border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;color:#f87171;cursor:pointer}
        .st-signout:hover{background:rgba(248,113,113,0.08)}
        .st-error{font-size:12px;color:#f87171;padding:10px 14px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);border-radius:8px}
        .st-success{font-size:12px;color:#4ade80;padding:10px 14px;background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:8px}
      `}</style>
    </div>
  )
}
