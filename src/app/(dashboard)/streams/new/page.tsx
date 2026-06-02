'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PLATFORMS = ['Whatnot','eBay','TikTok Live','YouTube','Instagram','In-person','Other']
const PLATFORM_FEES: Record<string,number> = {'Whatnot':8,'eBay':13,'TikTok Live':5,'YouTube':0,'Instagram':0,'In-person':0,'Other':0}

export default function NewStreamPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [platform, setPlatform] = useState('Whatnot')
  const [revenue, setRevenue] = useState('')
  const [feePercent, setFeePercent] = useState('8')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<{id:string, qty:number}[]>([])
  const [vatEnabled, setVatEnabled] = useState(true)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('inventory_items').select('*').order('product_name')
      setInventory(data ?? [])
    }
    load()
  }, [])

  const rev = parseFloat(revenue) || 0
  const feeAmount = rev * (parseFloat(feePercent) || 0) / 100
  const inventoryCost = selectedProducts.reduce((total, sp) => {
    const item = inventory.find(i => i.id === sp.id)
    return total + (item?.cost_per_unit ?? 0) * sp.qty
  }, 0)
  const totalCost = feeAmount + inventoryCost
  const profit = rev - totalCost
  const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0'
  const vatReclaimable = inventoryCost / 6

  const handleSave = async (quickSave = false) => {
    if (!title.trim()) { setError('Stream title is required'); return }
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: stream, error: err } = await supabase.from('streams').insert({
        user_id: user.id,
        title: title.trim(),
        stream_date: date || null,
        platform,
        revenue: rev || null,
        inventory_cost: quickSave ? null : (totalCost || null),
        vat_reclaimable: quickSave ? null : (vatEnabled ? vatReclaimable : null),
        notes: notes.trim() || null,
      }).select().single()
      if (err) throw err
      if (!quickSave && stream && selectedProducts.length > 0) {
        await supabase.from('stream_products').insert(selectedProducts.map(sp => ({ stream_id: stream.id, inventory_item_id: sp.id, quantity_used: sp.qty })))
        for (const sp of selectedProducts) {
          const item = inventory.find(i => i.id === sp.id)
          if (item) await supabase.from('inventory_items').update({ quantity: Math.max(0, (item.quantity ?? 0) - sp.qty) }).eq('id', sp.id)
        }
      }
      if (quickSave) { setSaved(true); setTimeout(() => router.push('/'), 1200) }
      else router.push('/streams')
    } catch { setError('Something went wrong. Please try again.') }
    setSaving(false)
  }

  // MOBILE — fast 3-field form
  if (isMobile) return (
    <div className="ns">
      <Link href="/" className="ns-back">← Dashboard</Link>
      <div className="ns-mobile-header">
        <h1 className="ns-title">Log stream</h1>
        <p className="ns-sub">Fill in the basics now, add costs later on desktop</p>
      </div>

      {saved ? (
        <div className="ns-saved">
          <div className="ns-saved-icon">✓</div>
          <p className="ns-saved-text">Stream saved!</p>
          <p className="ns-saved-sub">Add costs and inventory on desktop later</p>
        </div>
      ) : (
        <div className="ns-mobile-form">
          <div className="ns-field">
            <label className="ns-label">Stream title *</label>
            <input className="ns-input-lg" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. OP15 Packs and Giveaways" autoFocus />
          </div>

          <div className="ns-field">
            <label className="ns-label">Revenue (£)</label>
            <input className="ns-input-lg" type="number" inputMode="decimal" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="0.00" />
          </div>

          <div className="ns-field">
            <label className="ns-label">Platform</label>
            <div className="ns-platform-grid">
              {PLATFORMS.slice(0, 4).map(p => (
                <button key={p} className={`ns-platform-btn ${platform === p ? 'active' : ''}`} onClick={() => { setPlatform(p); setFeePercent(String(PLATFORM_FEES[p])) }}>{p}</button>
              ))}
            </div>
          </div>

          <div className="ns-field">
            <label className="ns-label">Date</label>
            <input className="ns-input-lg" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {rev > 0 && (
            <div className="ns-quick-calc">
              <div className="ns-calc-row">
                <span>Revenue</span><span>£{rev.toFixed(2)}</span>
              </div>
              <div className="ns-calc-row ns-muted">
                <span>{platform} fee ({feePercent}%)</span><span>−£{feeAmount.toFixed(2)}</span>
              </div>
              <div className="ns-calc-divider"/>
              <div className="ns-calc-row ns-profit">
                <span>Est. profit</span><span style={{color: profit >= 0 ? '#4ade80' : '#f87171'}}>£{profit.toFixed(2)}</span>
              </div>
              <p className="ns-calc-note">Stock costs not included — add on desktop for full P&L</p>
            </div>
          )}

          {error && <p className="ns-error">{error}</p>}

          <button className="ns-btn-primary" disabled={saving || !title.trim()} onClick={() => handleSave(true)}>
            {saving ? 'Saving…' : 'Save stream →'}
          </button>
          <Link href="/" className="ns-btn-ghost-link">Cancel</Link>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .ns{max-width:480px;margin:0 auto;padding:24px 20px;display:flex;flex-direction:column;gap:20px;min-height:100vh}
        .ns-back{font-size:12px;color:#f59e0b;text-decoration:none}
        .ns-mobile-header{display:flex;flex-direction:column;gap:6px}
        .ns-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5}
        .ns-sub{font-size:13px;color:#71717a}
        .ns-mobile-form{display:flex;flex-direction:column;gap:18px}
        .ns-field{display:flex;flex-direction:column;gap:8px}
        .ns-label{font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em}
        .ns-input-lg{background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;font-family:'DM Mono',monospace;font-size:17px;color:#f4f4f5;outline:none;width:100%}
        .ns-input-lg:focus{border-color:rgba(245,158,11,0.5)}
        .ns-platform-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .ns-platform-btn{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer;text-align:center}
        .ns-platform-btn.active{border-color:rgba(245,158,11,0.5);color:#f59e0b;background:rgba(245,158,11,0.08)}
        .ns-quick-calc{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px}
        .ns-calc-row{display:flex;justify-content:space-between;font-size:14px;color:#d4d4d8}
        .ns-muted{color:#71717a}
        .ns-calc-divider{height:1px;background:rgba(255,255,255,0.06)}
        .ns-profit{font-weight:500}
        .ns-calc-note{font-size:11px;color:#52525b;margin-top:2px}
        .ns-error{font-size:13px;color:#f87171;background:rgba(248,113,113,0.08);border-radius:8px;padding:10px 14px}
        .ns-btn-primary{background:#f59e0b;color:#0e0e0f;border:none;border-radius:12px;padding:16px;font-family:'DM Mono',monospace;font-size:16px;font-weight:500;cursor:pointer;width:100%}
        .ns-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
        .ns-btn-ghost-link{display:block;text-align:center;font-size:13px;color:#52525b;text-decoration:none;padding:8px}
        .ns-saved{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 0;text-align:center}
        .ns-saved-icon{width:56px;height:56px;border-radius:50%;background:rgba(74,222,128,0.1);border:2px solid rgba(74,222,128,0.3);display:flex;align-items:center;justify-content:center;font-size:24px;color:#4ade80}
        .ns-saved-text{font-size:18px;color:#4ade80;font-weight:500}
        .ns-saved-sub{font-size:13px;color:#71717a}
      `}</style>
    </div>
  )

  // DESKTOP — full form (existing layout)
  return (
    <div className="ns-desk">
      <div className="ns-desk-header">
        <div>
          <Link href="/streams" className="ns-desk-back">← Streams</Link>
          <h1 className="ns-desk-title">New stream</h1>
        </div>
      </div>

      <div className="ns-desk-body">
        <div className="ns-desk-main">
          <div className="ns-desk-card">
            <h2 className="ns-desk-section">Stream details</h2>
            <div className="ns-desk-grid">
              <div className="ns-desk-field ns-desk-wide">
                <label className="ns-desk-label">Title *</label>
                <input className="ns-desk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. OP15 Packs and Giveaways 🔥" autoFocus />
              </div>
              <div className="ns-desk-field">
                <label className="ns-desk-label">Date</label>
                <input className="ns-desk-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="ns-desk-field">
                <label className="ns-desk-label">Platform</label>
                <select className="ns-desk-input" value={platform} onChange={e => { setPlatform(e.target.value); setFeePercent(String(PLATFORM_FEES[e.target.value] ?? 0)) }}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="ns-desk-field">
                <label className="ns-desk-label">Revenue (£)</label>
                <input className="ns-desk-input" type="number" min="0" step="0.01" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="0.00" />
              </div>
              <div className="ns-desk-field">
                <label className="ns-desk-label">Platform fee (%)</label>
                <input className="ns-desk-input" type="number" min="0" max="100" step="0.1" value={feePercent} onChange={e => setFeePercent(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ns-desk-card">
            <div className="ns-desk-vat-row">
              <h2 className="ns-desk-section">VAT</h2>
              <label className="ns-desk-toggle">
                <input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} />
                <span className="ns-desk-toggle-track"><span className="ns-desk-toggle-thumb"/></span>
                <span className="ns-desk-toggle-label">{vatEnabled ? 'On' : 'Off'}</span>
              </label>
            </div>
            {vatEnabled && (
              <div className="ns-desk-vat-info">
                <div className="ns-desk-vat-stat"><p className="ns-desk-vat-label">VAT reclaimable on stock</p><p className="ns-desk-vat-val ns-blue">£{vatReclaimable.toFixed(2)}</p></div>
                <div className="ns-desk-vat-stat"><p className="ns-desk-vat-label">VAT owed on revenue (20%)</p><p className="ns-desk-vat-val ns-red">£{(rev * 0.2).toFixed(2)}</p></div>
                <div className="ns-desk-vat-stat"><p className="ns-desk-vat-label">Net VAT position</p><p className={`ns-desk-vat-val ${vatReclaimable - rev * 0.2 >= 0 ? 'ns-green' : 'ns-red'}`}>£{(vatReclaimable - rev * 0.2).toFixed(2)}</p></div>
              </div>
            )}
          </div>

          <div className="ns-desk-card">
            <div className="ns-desk-inv-row">
              <h2 className="ns-desk-section">Inventory used</h2>
              <button className="ns-desk-add-inv" onClick={() => { const unused = inventory.find(i => !selectedProducts.find(s => s.id === i.id)); if (unused) setSelectedProducts(p => [...p, { id: unused.id, qty: 1 }]) }} disabled={inventory.length === 0 || selectedProducts.length >= inventory.length}>+ Add product</button>
            </div>
            {selectedProducts.length === 0 ? <p className="ns-desk-inv-empty">No products added yet</p> : selectedProducts.map(sp => {
              const item = inventory.find(i => i.id === sp.id)
              return (
                <div key={sp.id} className="ns-desk-inv-row-item">
                  <select className="ns-desk-input ns-desk-inv-select" value={sp.id} onChange={e => setSelectedProducts(p => p.map(x => x.id === sp.id ? { ...x, id: e.target.value } : x))}>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.product_name}</option>)}
                  </select>
                  <input className="ns-desk-input ns-desk-inv-qty" type="number" min="1" value={sp.qty} onChange={e => setSelectedProducts(p => p.map(x => x.id === sp.id ? { ...x, qty: parseInt(e.target.value)||1 } : x))} />
                  <span className="ns-desk-inv-cost">{item?.cost_per_unit ? `£${(item.cost_per_unit * sp.qty).toFixed(2)}` : '—'}</span>
                  <button className="ns-desk-inv-del" onClick={() => setSelectedProducts(p => p.filter(x => x.id !== sp.id))}>✕</button>
                </div>
              )
            })}
          </div>

          <div className="ns-desk-card">
            <h2 className="ns-desk-section">Notes</h2>
            <textarea className="ns-desk-input ns-desk-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about this stream..." rows={3} />
          </div>
        </div>

        <div className="ns-desk-side">
          <div className="ns-desk-card ns-desk-summary">
            <h2 className="ns-desk-section">Summary</h2>
            <div className="ns-desk-summary-rows">
              <div className="ns-desk-sum-row"><span>Revenue</span><span>£{rev.toFixed(2)}</span></div>
              <div className="ns-desk-sum-row ns-muted"><span>Platform fee</span><span>−£{feeAmount.toFixed(2)}</span></div>
              {inventoryCost > 0 && <div className="ns-desk-sum-row ns-muted"><span>Inventory cost</span><span>−£{inventoryCost.toFixed(2)}</span></div>}
              <div className="ns-desk-sum-divider"/>
              <div className="ns-desk-sum-row ns-desk-sum-profit"><span>True profit</span><span style={{color: profit >= 0 ? '#4ade80' : '#f87171'}}>£{profit.toFixed(2)}</span></div>
              <div className="ns-desk-margin-bar">
                <div className="ns-desk-margin-fill" style={{width: `${Math.min(100, Math.max(0, parseFloat(margin)))}%`, background: parseFloat(margin) >= 30 ? '#4ade80' : parseFloat(margin) >= 10 ? '#f59e0b' : '#f87171'}}/>
              </div>
              <p className="ns-desk-margin-label">{margin}% margin</p>
            </div>
            {error && <p className="ns-desk-error">{error}</p>}
            <button className="ns-desk-save-btn" disabled={saving || !title.trim()} onClick={() => handleSave(false)}>
              {saving ? 'Saving…' : 'Save stream →'}
            </button>
            <Link href="/streams" className="ns-desk-cancel">Cancel</Link>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .ns-desk{max-width:1000px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
        .ns-desk-header{display:flex;align-items:flex-start;justify-content:space-between}
        .ns-desk-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .ns-desk-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5}
        .ns-desk-body{display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start}
        .ns-desk-main{display:flex;flex-direction:column;gap:16px}
        .ns-desk-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
        .ns-desk-section{font-size:13px;color:#a1a1aa;font-weight:400}
        .ns-desk-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ns-desk-wide{grid-column:1/-1}
        .ns-desk-field{display:flex;flex-direction:column;gap:6px}
        .ns-desk-label{font-size:12px;color:#71717a}
        .ns-desk-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%}
        .ns-desk-input:focus{border-color:rgba(245,158,11,0.4)}
        .ns-desk-textarea{resize:vertical;min-height:80px}
        .ns-desk-vat-row{display:flex;align-items:center;justify-content:space-between}
        .ns-desk-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
        .ns-desk-toggle input{display:none}
        .ns-desk-toggle-track{width:36px;height:20px;background:rgba(255,255,255,0.1);border-radius:99px;position:relative;transition:background 0.2s}
        .ns-desk-toggle input:checked + .ns-desk-toggle-track{background:#f59e0b}
        .ns-desk-toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s}
        .ns-desk-toggle input:checked + .ns-desk-toggle-track .ns-desk-toggle-thumb{transform:translateX(16px)}
        .ns-desk-toggle-label{font-size:12px;color:#71717a}
        .ns-desk-vat-info{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .ns-desk-vat-stat{background:#0e0e0f;border-radius:8px;padding:10px}
        .ns-desk-vat-label{font-size:10px;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px}
        .ns-desk-vat-val{font-size:16px;font-weight:500}
        .ns-blue{color:#60a5fa}.ns-red{color:#f87171}.ns-green{color:#4ade80}.ns-muted{color:#71717a}
        .ns-desk-inv-row{display:flex;align-items:center;justify-content:space-between}
        .ns-desk-add-inv{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#71717a;font-size:12px;padding:5px 12px;cursor:pointer;font-family:'DM Mono',monospace}
        .ns-desk-add-inv:hover{color:#f4f4f5}
        .ns-desk-add-inv:disabled{opacity:0.3;cursor:not-allowed}
        .ns-desk-inv-empty{font-size:13px;color:#3f3f46}
        .ns-desk-inv-row-item{display:flex;align-items:center;gap:8px}
        .ns-desk-inv-select{flex:1}
        .ns-desk-inv-qty{width:60px}
        .ns-desk-inv-cost{font-size:13px;color:#71717a;min-width:60px;text-align:right}
        .ns-desk-inv-del{background:none;border:none;color:#3f3f46;font-size:13px;cursor:pointer;padding:4px}
        .ns-desk-inv-del:hover{color:#f87171}
        .ns-desk-side{position:sticky;top:24px}
        .ns-desk-summary{gap:16px}
        .ns-desk-summary-rows{display:flex;flex-direction:column;gap:8px}
        .ns-desk-sum-row{display:flex;justify-content:space-between;font-size:13px;color:#d4d4d8}
        .ns-desk-sum-divider{height:1px;background:rgba(255,255,255,0.06);margin:4px 0}
        .ns-desk-sum-profit{font-weight:500;font-size:14px}
        .ns-desk-margin-bar{height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;margin-top:4px}
        .ns-desk-margin-fill{height:100%;border-radius:99px;transition:width 0.3s}
        .ns-desk-margin-label{font-size:11px;color:#52525b}
        .ns-desk-error{font-size:12px;color:#f87171}
        .ns-desk-save-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:11px 16px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer;width:100%}
        .ns-desk-save-btn:disabled{opacity:0.5;cursor:not-allowed}
        .ns-desk-cancel{display:block;text-align:center;font-size:12px;color:#52525b;text-decoration:none;margin-top:4px}
      `}</style>
    </div>
  )
}
