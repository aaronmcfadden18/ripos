'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PLATFORMS = ['Whatnot','eBay','TikTok Live','YouTube','Instagram','In-person','Other']

export default function NewStreamPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [platform, setPlatform] = useState('Whatnot')
  const [revenue, setRevenue] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const rev = parseFloat(revenue) || 0
  const cos = parseFloat(cost) || 0
  const profit = rev - cos
  const margin = rev > 0 ? ((profit/rev)*100).toFixed(1) : '0'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error: err } = await supabase.from('streams').insert({
      user_id: user.id, title: title.trim(), stream_date: date,
      platform, revenue: rev || null, inventory_cost: cos || null, notes: notes.trim() || null
    })
    if (err) { setError(err.message); setSaving(false) }
    else { router.push('/'); router.refresh() }
  }

  return (
    <div className="ns">
      <div className="ns-header">
        <button className="ns-back" onClick={() => router.back()}>← Back</button>
        <h1 className="ns-title">Log a stream</h1>
      </div>
      <div className="ns-layout">
        <form onSubmit={handleSubmit} className="ns-form">
          <div className="ns-section">
            <h2 className="ns-sh">Stream details</h2>
            <div className="ns-field">
              <label className="ns-label">Stream title *</label>
              <input className="ns-input" placeholder="e.g. One Piece OP-09 Box Break" value={title} onChange={e=>setTitle(e.target.value)} required />
            </div>
            <div className="ns-row2">
              <div className="ns-field">
                <label className="ns-label">Date</label>
                <input className="ns-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div className="ns-field">
                <label className="ns-label">Platform</label>
                <select className="ns-input" value={platform} onChange={e=>setPlatform(e.target.value)}>
                  {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="ns-section">
            <h2 className="ns-sh">Financials</h2>
            <div className="ns-row2">
              <div className="ns-field">
                <label className="ns-label">Revenue (£)</label>
                <input className="ns-input" type="number" min="0" step="0.01" placeholder="0.00" value={revenue} onChange={e=>setRevenue(e.target.value)} />
              </div>
              <div className="ns-field">
                <label className="ns-label">Inventory cost (£)</label>
                <input className="ns-input" type="number" min="0" step="0.01" placeholder="0.00" value={cost} onChange={e=>setCost(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="ns-section">
            <h2 className="ns-sh">Notes</h2>
            <div className="ns-field">
              <label className="ns-label">Notes (optional)</label>
              <textarea className="ns-input ns-textarea" placeholder="Anything worth remembering..." value={notes} onChange={e=>setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          {error && <p className="ns-error">{error}</p>}
          <div className="ns-actions">
            <button type="button" className="ns-ghost" onClick={()=>router.back()}>Cancel</button>
            <button type="submit" className="ns-submit" disabled={saving}>{saving ? 'Saving…' : 'Save stream'}</button>
          </div>
        </form>
        <div className="ns-panel">
          <p className="ns-panel-label">Live profit</p>
          <p className="ns-panel-profit" style={{color: profit===0&&rev===0?'#52525b':profit>=0?'#4ade80':'#f87171'}}>
            £{profit.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}
          </p>
          <p className="ns-panel-margin" style={{color: profit>=0?'#4ade80':'#f87171'}}>{rev>0?`${margin}% margin`:'Enter revenue to calculate'}</p>
          <div className="ns-panel-divider"/>
          <div className="ns-panel-row"><span>Revenue</span><span>£{rev.toFixed(2)}</span></div>
          <div className="ns-panel-row"><span>Cost</span><span>− £{cos.toFixed(2)}</span></div>
          <div className="ns-panel-row ns-panel-total"><span>Profit</span><span style={{color:profit>=0?'#4ade80':'#f87171'}}>£{profit.toFixed(2)}</span></div>
          <div className="ns-panel-divider"/>
          <div className="ns-bar-track"><div className="ns-bar-fill" style={{width:`${Math.min(Math.abs(parseFloat(margin)),100)}%`,background:profit>=0?'#4ade80':'#f87171'}}/></div>
          <p className="ns-tip">💡 Healthy margin is 25–40%</p>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .ns{max-width:900px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
        .ns-header{display:flex;align-items:center;gap:16px}
        .ns-back{background:none;border:1px solid rgba(255,255,255,0.08);color:#71717a;font-family:'DM Mono',monospace;font-size:12px;padding:7px 12px;border-radius:7px;cursor:pointer}
        .ns-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5}
        .ns-layout{display:grid;grid-template-columns:1fr 260px;gap:20px;align-items:start}
        .ns-form{display:flex;flex-direction:column;gap:16px}
        .ns-section{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
        .ns-sh{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .ns-field{display:flex;flex-direction:column;gap:6px}
        .ns-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ns-label{font-size:12px;color:#a1a1aa}
        .ns-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%}
        .ns-input:focus{border-color:rgba(245,158,11,0.5)}
        .ns-textarea{resize:vertical;min-height:80px}
        .ns-error{font-size:12px;color:#f87171;padding:9px 12px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);border-radius:7px}
        .ns-actions{display:flex;gap:10px;justify-content:flex-end}
        .ns-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 18px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer}
        .ns-submit{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer}
        .ns-submit:disabled{opacity:0.5;cursor:not-allowed}
        .ns-panel{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;position:sticky;top:24px;display:flex;flex-direction:column;gap:12px}
        .ns-panel-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .ns-panel-profit{font-family:'DM Serif Display',serif;font-size:36px;font-weight:400}
        .ns-panel-margin{font-size:13px}
        .ns-panel-divider{height:1px;background:rgba(255,255,255,0.06)}
        .ns-panel-row{display:flex;justify-content:space-between;font-size:13px;color:#71717a}
        .ns-panel-total{padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);color:#d4d4d8;font-weight:500}
        .ns-bar-track{height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden}
        .ns-bar-fill{height:100%;border-radius:99px;transition:width 0.3s ease}
        .ns-tip{font-size:11px;color:#3f3f46}
        @media(max-width:680px){.ns-layout{grid-template-columns:1fr}.ns-row2{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
