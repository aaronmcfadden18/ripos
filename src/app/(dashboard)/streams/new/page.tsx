'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PLATFORMS = ['Whatnot','eBay','TikTok Live','YouTube','Instagram','In-person','Other']
const PLATFORM_FEES: Record<string,number> = {
  'Whatnot': 8,
  'eBay': 13,
  'TikTok Live': 5,
  'YouTube': 0,
  'Instagram': 0,
  'In-person': 0,
  'Other': 0,
}

export default function NewStreamPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [platform, setPlatform] = useState('Whatnot')
  const [revenue, setRevenue] = useState('')
  const [feePercent, setFeePercent] = useState('8')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<{id:string, qty:number}[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('inventory_items').select('*').order('product_name')
      setInventory(data ?? [])
    }
    load()
  }, [])

  const handlePlatformChange = (p: string) => {
    setPlatform(p)
    setFeePercent(String(PLATFORM_FEES[p] ?? 0))
  }

  const addProduct = () => {
    if (inventory.length === 0) return
    const unused = inventory.find(i => !selectedProducts.find(s => s.id === i.id))
    if (unused) setSelectedProducts(prev => [...prev, { id: unused.id, qty: 1 }])
  }

  const removeProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.id !== id))
  const updateQty = (id: string, qty: number) => setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, qty } : p))
  const updateProduct = (oldId: string, newId: string) => setSelectedProducts(prev => prev.map(p => p.id === oldId ? { ...p, id: newId } : p))

  const rev = parseFloat(revenue) || 0
  const feeAmount = rev * (parseFloat(feePercent) || 0) / 100
  const totalCost = selectedProducts.reduce((total, sp) => {
    const item = inventory.find(i => i.id === sp.id)
    return total + (item?.cost_per_unit ?? 0) * sp.qty
  }, 0)
  const totalDeductions = totalCost + feeAmount
  const profit = rev - totalDeductions
  const margin = rev > 0 ? ((profit/rev)*100).toFixed(1) : '0'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: stream, error: err } = await supabase.from('streams').insert({
      user_id: user.id, title: title.trim(), stream_date: date,
      platform, revenue: rev || null,
      inventory_cost: totalDeductions || null,
      notes: notes.trim() || null
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    if (stream && selectedProducts.length > 0) {
      await supabase.from('stream_products').insert(
        selectedProducts.map(sp => ({
          stream_id: stream.id,
          inventory_item_id: sp.id,
          quantity_used: sp.qty
        }))
      )
      for (const sp of selectedProducts) {
        const item = inventory.find(i => i.id === sp.id)
        if (item) {
          await supabase.from('inventory_items')
            .update({ quantity: Math.max(0, (item.quantity ?? 0) - sp.qty) })
            .eq('id', sp.id)
        }
      }
    }

    router.push('/')
    router.refresh()
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
              <input className="ns-input" placeholder="e.g. One Piece OP-09 Box Break" value={title} onChange={e=>setTitle(e.target.value)} required autoFocus />
            </div>
            <div className="ns-row2">
              <div className="ns-field">
                <label className="ns-label">Date</label>
                <input className="ns-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div className="ns-field">
                <label className="ns-label">Platform</label>
                <select className="ns-input" value={platform} onChange={e=>handlePlatformChange(e.target.value)}>
                  {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ns-section">
            <div className="ns-section-head">
              <h2 className="ns-sh">Products used</h2>
              <button type="button" className="ns-add-btn" onClick={addProduct} disabled={inventory.length === 0}>+ Add product</button>
            </div>
            {inventory.length === 0 && (
              <p className="ns-hint-text">No inventory yet. <a href="/inventory" className="ns-link">Add products first →</a></p>
            )}
            {selectedProducts.length === 0 && inventory.length > 0 && (
              <p className="ns-hint-text">Click "Add product" to link inventory — cost calculates automatically.</p>
            )}
            {selectedProducts.map(sp => {
              const item = inventory.find(i => i.id === sp.id)
              const lineCost = (item?.cost_per_unit ?? 0) * sp.qty
              return (
                <div key={sp.id} className="ns-product-row">
                  <select className="ns-input ns-product-select" value={sp.id} onChange={e=>updateProduct(sp.id, e.target.value)}>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id} disabled={!!selectedProducts.find(s => s.id === i.id && s.id !== sp.id)}>
                        {i.product_name}
                      </option>
                    ))}
                  </select>
                  <div className="ns-product-qty">
                    <label className="ns-label">Qty</label>
                    <input className="ns-input" type="number" min="1" value={sp.qty} onChange={e=>updateQty(sp.id, parseInt(e.target.value)||1)} style={{width:'70px'}} />
                  </div>
                  <div className="ns-product-cost">
                    <label className="ns-label">Cost</label>
                    <p className="ns-cost-val">£{lineCost.toFixed(2)}</p>
                  </div>
                  <button type="button" className="ns-remove-btn" onClick={()=>removeProduct(sp.id)}>✕</button>
                </div>
              )
            })}
            {selectedProducts.length > 0 && (
              <div className="ns-cost-total">
                <span>Inventory cost</span>
                <span className="ns-cost-total-val">£{totalCost.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="ns-section">
            <h2 className="ns-sh">Revenue & fees</h2>
            <div className="ns-row2">
              <div className="ns-field">
                <label className="ns-label">Total revenue (£)</label>
                <input className="ns-input" type="number" min="0" step="0.01" placeholder="0.00" value={revenue} onChange={e=>setRevenue(e.target.value)} />
              </div>
              <div className="ns-field">
                <label className="ns-label">Platform fee %
                  <span className="ns-fee-badge">{platform}</span>
                </label>
                <input className="ns-input" type="number" min="0" max="100" step="0.1" value={feePercent} onChange={e=>setFeePercent(e.target.value)} />
                {feeAmount > 0 && <p className="ns-hint-text">= £{feeAmount.toFixed(2)} deducted</p>}
              </div>
            </div>
          </div>

          <div className="ns-section">
            <h2 className="ns-sh">Notes</h2>
            <textarea className="ns-input ns-textarea" placeholder="Anything worth remembering..." value={notes} onChange={e=>setNotes(e.target.value)} rows={3} />
          </div>

          {error && <p className="ns-error">{error}</p>}
          <div className="ns-actions">
            <button type="button" className="ns-ghost" onClick={()=>router.back()}>Cancel</button>
            <button type="submit" className="ns-submit" disabled={saving}>{saving ? 'Saving…' : 'Save stream'}</button>
          </div>
        </form>

        <div className="ns-panel">
          <p className="ns-panel-label">True net profit</p>
          <p className="ns-panel-profit" style={{color: profit===0&&rev===0?'#52525b':profit>=0?'#4ade80':'#f87171'}}>
            £{profit.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}
          </p>
          <p className="ns-panel-margin" style={{color: profit>=0?'#4ade80':'#f87171'}}>{rev>0?`${margin}% margin`:'Enter revenue to calculate'}</p>
          <div className="ns-panel-divider"/>
          <div className="ns-panel-row"><span>Revenue</span><span>£{rev.toFixed(2)}</span></div>
          <div className="ns-panel-row ns-panel-deduction"><span>Inventory cost</span><span>− £{totalCost.toFixed(2)}</span></div>
          <div className="ns-panel-row ns-panel-deduction"><span>Platform fee ({feePercent}%)</span><span>− £{feeAmount.toFixed(2)}</span></div>
          <div className="ns-panel-row ns-panel-total"><span>Net profit</span><span style={{color:profit>=0?'#4ade80':'#f87171'}}>£{profit.toFixed(2)}</span></div>
          <div className="ns-panel-divider"/>
          <div className="ns-bar-track"><div className="ns-bar-fill" style={{width:`${Math.min(Math.abs(parseFloat(margin)),100)}%`,background:profit>=0?'#4ade80':'#f87171'}}/></div>
          {selectedProducts.length > 0 && (
            <div className="ns-products-summary">
              <p className="ns-ps-label">Products</p>
              {selectedProducts.map(sp => {
                const item = inventory.find(i => i.id === sp.id)
                return item ? (
                  <div key={sp.id} className="ns-ps-row">
                    <span>{item.product_name}</span>
                    <span>{sp.qty}x · £{((item.cost_per_unit??0)*sp.qty).toFixed(0)}</span>
                  </div>
                ) : null
              })}
            </div>
          )}
          <p className="ns-tip">💡 Healthy net margin is 20–35% after fees</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .ns{max-width:920px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
        .ns-header{display:flex;align-items:center;gap:16px}
        .ns-back{background:none;border:1px solid rgba(255,255,255,0.08);color:#71717a;font-family:'DM Mono',monospace;font-size:12px;padding:7px 12px;border-radius:7px;cursor:pointer}
        .ns-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5}
        .ns-layout{display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start}
        .ns-form{display:flex;flex-direction:column;gap:16px}
        .ns-section{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
        .ns-section-head{display:flex;align-items:center;justify-content:space-between}
        .ns-sh{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .ns-field{display:flex;flex-direction:column;gap:6px}
        .ns-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ns-label{font-size:12px;color:#a1a1aa;display:flex;align-items:center;gap:8px}
        .ns-fee-badge{font-size:10px;background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid rgba(245,158,11,0.2);border-radius:4px;padding:1px 6px}
        .ns-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%;appearance:none}
        .ns-input:focus{border-color:rgba(245,158,11,0.5)}
        .ns-input option{background:#18181b}
        .ns-textarea{resize:vertical;min-height:80px}
        .ns-hint-text{font-size:11px;color:#52525b}
        .ns-link{color:#f59e0b;text-decoration:none}
        .ns-add-btn{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:5px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#a1a1aa;cursor:pointer}
        .ns-add-btn:hover{color:#f4f4f5}
        .ns-add-btn:disabled{opacity:0.4;cursor:not-allowed}
        .ns-product-row{display:flex;align-items:flex-end;gap:10px}
        .ns-product-select{flex:1}
        .ns-product-qty,.ns-product-cost{display:flex;flex-direction:column;gap:4px;flex-shrink:0}
        .ns-product-cost{min-width:70px}
        .ns-cost-val{font-size:13px;color:#f4f4f5;font-weight:500;padding:9px 0}
        .ns-remove-btn{background:none;border:none;color:#3f3f46;font-size:14px;cursor:pointer;padding:9px 4px}
        .ns-remove-btn:hover{color:#f87171}
        .ns-cost-total{display:flex;justify-content:space-between;padding:10px 0 0;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#71717a}
        .ns-cost-total-val{color:#f4f4f5;font-weight:500}
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
        .ns-panel-deduction{color:#52525b}
        .ns-panel-total{padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);color:#d4d4d8;font-weight:500}
        .ns-bar-track{height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden}
        .ns-bar-fill{height:100%;border-radius:99px;transition:width 0.3s ease}
        .ns-products-summary{display:flex;flex-direction:column;gap:6px}
        .ns-ps-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em}
        .ns-ps-row{display:flex;justify-content:space-between;font-size:12px;color:#71717a}
        .ns-tip{font-size:11px;color:#3f3f46}
        @media(max-width:680px){.ns-layout{grid-template-columns:1fr}.ns-row2{grid-template-columns:1fr}.ns-product-row{flex-wrap:wrap}}
      `}</style>
    </div>
  )
}
