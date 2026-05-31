'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [set, setSet] = useState('')
  const [qty, setQty] = useState('1')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false })
      setItems(data ?? [])
    }
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('inventory_items').insert({
      user_id: user.id, product_name: name.trim(), set_name: set.trim()||null,
      quantity: parseInt(qty)||0, cost_per_unit: parseFloat(cost)||null, suggested_price: parseFloat(price)||null
    }).select().single()
    if (data) { setItems(prev => [data, ...prev]); setName(''); setSet(''); setQty('1'); setCost(''); setPrice(''); setShowForm(false) }
    setSaving(false)
  }

  const handleQty = async (id: string, delta: number) => {
    const supabase = createClient()
    const item = items.find(i => i.id === id)
    const newQty = Math.max(0, (item?.quantity??0) + delta)
    setItems(prev => prev.map(i => i.id === id ? {...i, quantity: newQty} : i))
    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return
    const supabase = createClient()
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('inventory_items').delete().eq('id', id)
  }

  const totalValue = items.reduce((a,i) => a+(i.quantity??0)*(i.cost_per_unit??0), 0)

  return (
    <div className="iv">
      <div className="iv-header">
        <div>
          <Link href="/" className="iv-back">← Dashboard</Link>
          <h1 className="iv-title">Inventory</h1>
          <p className="iv-sub">{items.length} products · £{totalValue.toLocaleString('en-GB', {minimumFractionDigits:0})} stock value</p>
        </div>
        <button className="iv-cta" onClick={() => setShowForm(v=>!v)}>{showForm ? '✕ Close' : '+ Add product'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleAdd} className="iv-form">
          <div className="iv-form-grid">
            <div className="iv-field iv-wide"><label className="iv-label">Product name *</label><input className="iv-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. One Piece OP-09 Box" required autoFocus /></div>
            <div className="iv-field"><label className="iv-label">Set / series</label><input className="iv-input" value={set} onChange={e=>setSet(e.target.value)} placeholder="e.g. Emperors in the New World" /></div>
            <div className="iv-field"><label className="iv-label">Quantity</label><input className="iv-input" type="number" min="0" value={qty} onChange={e=>setQty(e.target.value)} /></div>
            <div className="iv-field"><label className="iv-label">Cost per unit (£)</label><input className="iv-input" type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0.00" /></div>
            <div className="iv-field"><label className="iv-label">Suggested sell price (£)</label><input className="iv-input" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00" /></div>
          </div>
          <div className="iv-form-actions">
            <button type="button" className="iv-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
            <button type="submit" className="iv-submit" disabled={saving||!name.trim()}>{saving?'Saving…':'Add to inventory'}</button>
          </div>
        </form>
      )}
      {items.length === 0 && !showForm ? (
        <div className="iv-empty"><p>No inventory yet.</p><button className="iv-cta" onClick={()=>setShowForm(true)}>+ Add your first product</button></div>
      ) : (
        <div className="iv-grid">
          {items.map(item => {
            const q = item.quantity??0
            const status = q===0?{label:'Out',cls:'red'}:q<=2?{label:'Low',cls:'amber'}:{label:'In stock',cls:'green'}
            return (
              <div key={item.id} className="iv-item">
                <div className="iv-item-head">
                  <div><p className="iv-item-name">{item.product_name}</p>{item.set_name&&<p className="iv-item-set">{item.set_name}</p>}</div>
                  <span className={`iv-badge iv-${status.cls}`}>{status.label}</span>
                </div>
                <div className="iv-item-stats">
                  <div><p className="iv-stat-label">Cost</p><p className="iv-stat-val">{item.cost_per_unit?'£'+item.cost_per_unit:'—'}</p></div>
                  <div><p className="iv-stat-label">Sell price</p><p className="iv-stat-val">{item.suggested_price?'£'+item.suggested_price:'—'}</p></div>
                  <div><p className="iv-stat-label">Stock value</p><p className="iv-stat-val">{item.cost_per_unit?'£'+(q*item.cost_per_unit).toFixed(0):'—'}</p></div>
                </div>
                <div className="iv-item-foot">
                  <div className="iv-qty">
                    <button className="iv-qty-btn" onClick={()=>handleQty(item.id,-1)} disabled={q===0}>−</button>
                    <span className="iv-qty-val">{q}</span>
                    <button className="iv-qty-btn" onClick={()=>handleQty(item.id,1)}>+</button>
                  </div>
                  <button className="iv-del" onClick={()=>handleDelete(item.id)}>Remove</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .iv{max-width:1000px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .iv-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .iv-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .iv-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .iv-sub{font-size:13px;color:#52525b}
        .iv-cta{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;font-family:'DM Mono',monospace;cursor:pointer}
        .iv-form{background:#18181b;border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px}
        .iv-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .iv-wide{grid-column:1/-1}
        .iv-field{display:flex;flex-direction:column;gap:6px}
        .iv-label{font-size:12px;color:#a1a1aa}
        .iv-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%}
        .iv-input:focus{border-color:rgba(245,158,11,0.5)}
        .iv-form-actions{display:flex;gap:10px;justify-content:flex-end}
        .iv-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 18px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer}
        .iv-submit{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer}
        .iv-submit:disabled{opacity:0.5;cursor:not-allowed}
        .iv-empty{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;color:#52525b}
        .iv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .iv-item{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:14px}
        .iv-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .iv-item-name{font-size:14px;font-weight:500;color:#e4e4e7;margin-bottom:3px}
        .iv-item-set{font-size:11px;color:#52525b}
        .iv-badge{font-size:11px;padding:3px 9px;border-radius:20px;white-space:nowrap;flex-shrink:0}
        .iv-green{background:rgba(74,222,128,0.08);color:#4ade80;border:1px solid rgba(74,222,128,0.18)}
        .iv-amber{background:rgba(245,158,11,0.08);color:#f59e0b;border:1px solid rgba(245,158,11,0.18)}
        .iv-red{background:rgba(248,113,113,0.08);color:#f87171;border:1px solid rgba(248,113,113,0.18)}
        .iv-item-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px 0;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05)}
        .iv-stat-label{font-size:10px;color:#3f3f46;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px}
        .iv-stat-val{font-size:13px;color:#a1a1aa;font-weight:500}
        .iv-item-foot{display:flex;align-items:center;justify-content:space-between}
        .iv-qty{display:flex;align-items:center;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden}
        .iv-qty-btn{background:none;border:none;color:#71717a;width:32px;height:32px;font-size:16px;cursor:pointer}
        .iv-qty-btn:disabled{opacity:0.3;cursor:not-allowed}
        .iv-qty-val{font-size:14px;font-weight:500;color:#f4f4f5;min-width:36px;text-align:center;border-left:1px solid rgba(255,255,255,0.06);border-right:1px solid rgba(255,255,255,0.06);height:32px;display:flex;align-items:center;justify-content:center}
        .iv-del{background:none;border:none;color:#3f3f46;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;padding:4px 8px;border-radius:5px}
        .iv-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
        @media(max-width:640px){.iv-form-grid{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  )
}
