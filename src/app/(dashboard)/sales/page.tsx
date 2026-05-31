'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PLATFORMS = ['Whatnot','eBay','TikTok Live','YouTube','Instagram','In-person','Other']
const SHIP = ['pending','packed','shipped','delivered']
const SHIP_COLORS: Record<string,string> = {pending:'#f59e0b',packed:'#60a5fa',shipped:'#a78bfa',delivered:'#4ade80'}
const PAY_COLORS: Record<string,string> = {unpaid:'#f87171',paid:'#4ade80'}

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [buyer, setBuyer] = useState('')
  const [product, setProduct] = useState('')
  const [amount, setAmount] = useState('')
  const [platform, setPlatform] = useState('Whatnot')
  const [streamId, setStreamId] = useState('')
  const [shipping, setShipping] = useState('pending')
  const [payment, setPayment] = useState('unpaid')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: s }, { data: st }] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('streams').select('id,title').order('stream_date', { ascending: false }).limit(50)
      ])
      setSales(s ?? [])
      setStreams(st ?? [])
    }
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('sales').insert({
      user_id: user.id, buyer_name: buyer.trim()||null, product_description: product.trim()||null,
      sale_amount: parseFloat(amount)||null, platform, stream_id: streamId||null,
      shipping_status: shipping, payment_status: payment
    }).select().single()
    if (data) { setSales(prev => [data, ...prev]); setBuyer(''); setProduct(''); setAmount(''); setStreamId(''); setShipping('pending'); setPayment('unpaid'); setShowForm(false) }
    setSaving(false)
  }

  const cycleShipping = async (id: string, current: string) => {
    const idx = SHIP.indexOf(current)
    const next = SHIP[(idx+1)%SHIP.length]
    setSales(prev => prev.map(s => s.id===id ? {...s, shipping_status:next} : s))
    const supabase = createClient()
    await supabase.from('sales').update({ shipping_status: next }).eq('id', id)
  }

  const cyclePayment = async (id: string, current: string) => {
    const next = current==='unpaid'?'paid':'unpaid'
    setSales(prev => prev.map(s => s.id===id ? {...s, payment_status:next} : s))
    const supabase = createClient()
    await supabase.from('sales').update({ payment_status: next }).eq('id', id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale?')) return
    setSales(prev => prev.filter(s => s.id!==id))
    const supabase = createClient()
    await supabase.from('sales').delete().eq('id', id)
  }

  const totalRevenue = sales.reduce((a,s) => a+(s.sale_amount??0), 0)
  const unpaid = sales.filter(s => s.payment_status==='unpaid').length
  const toShip = sales.filter(s => !['shipped','delivered'].includes(s.shipping_status??'')).length
  const filtered = sales.filter(s => !search || [s.buyer_name,s.product_description,s.platform].some(v=>v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="sa">
      <div className="sa-header">
        <div>
          <Link href="/" className="sa-back">← Dashboard</Link>
          <h1 className="sa-title">Sales</h1>
          <p className="sa-sub">{sales.length} sales · £{totalRevenue.toLocaleString('en-GB',{minimumFractionDigits:0})} · {unpaid} unpaid · {toShip} to ship</p>
        </div>
        <button className="sa-cta" onClick={()=>setShowForm(v=>!v)}>{showForm?'✕ Close':'+ Log sale'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleAdd} className="sa-form">
          <div className="sa-form-grid">
            <div className="sa-field"><label className="sa-label">Buyer name</label><input className="sa-input" value={buyer} onChange={e=>setBuyer(e.target.value)} placeholder="e.g. CardKing_UK" /></div>
            <div className="sa-field"><label className="sa-label">Product</label><input className="sa-input" value={product} onChange={e=>setProduct(e.target.value)} placeholder="e.g. OP-09 Booster Box" /></div>
            <div className="sa-field"><label className="sa-label">Amount (£)</label><input className="sa-input" type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" /></div>
            <div className="sa-field"><label className="sa-label">Platform</label><select className="sa-input" value={platform} onChange={e=>setPlatform(e.target.value)}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="sa-field"><label className="sa-label">Linked stream</label><select className="sa-input" value={streamId} onChange={e=>setStreamId(e.target.value)}><option value="">No stream</option>{streams.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
            <div className="sa-field"><label className="sa-label">Payment</label><select className="sa-input" value={payment} onChange={e=>setPayment(e.target.value)}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></div>
            <div className="sa-field"><label className="sa-label">Shipping</label><select className="sa-input" value={shipping} onChange={e=>setShipping(e.target.value)}>{SHIP.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
          </div>
          <div className="sa-form-actions">
            <button type="button" className="sa-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
            <button type="submit" className="sa-submit" disabled={saving}>{saving?'Saving…':'Log sale'}</button>
          </div>
        </form>
      )}
      {sales.length === 0 && !showForm ? (
        <div className="sa-empty"><p>No sales yet.</p><button className="sa-cta" onClick={()=>setShowForm(true)}>+ Log your first sale</button></div>
      ) : (
        <>
          <input className="sa-search" placeholder="Search buyer, product, platform…" value={search} onChange={e=>setSearch(e.target.value)} />
          <div className="sa-card">
            {filtered.length === 0 ? <p className="sa-none">No results.</p> : (
              <table className="sa-table">
                <thead><tr><th>Buyer</th><th>Product</th><th>Platform</th><th>Amount</th><th>Payment</th><th>Shipping</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><span className="sa-buyer">{s.buyer_name||'—'}</span></td>
                      <td><span className="sa-product">{s.product_description||'—'}</span></td>
                      <td><span className="sa-platform">{s.platform}</span></td>
                      <td><span className="sa-amount">{s.sale_amount?'£'+s.sale_amount:'—'}</span></td>
                      <td><button className="sa-badge" style={{color:PAY_COLORS[s.payment_status??'unpaid'],borderColor:PAY_COLORS[s.payment_status??'unpaid']+'44',background:PAY_COLORS[s.payment_status??'unpaid']+'11'}} onClick={()=>cyclePayment(s.id,s.payment_status??'unpaid')}>{s.payment_status??'unpaid'}</button></td>
                      <td><button className="sa-badge" style={{color:SHIP_COLORS[s.shipping_status??'pending'],borderColor:SHIP_COLORS[s.shipping_status??'pending']+'44',background:SHIP_COLORS[s.shipping_status??'pending']+'11'}} onClick={()=>cycleShipping(s.id,s.shipping_status??'pending')}>{s.shipping_status??'pending'}</button></td>
                      <td><button className="sa-del" onClick={()=>handleDelete(s.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .sa{max-width:1040px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .sa-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .sa-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .sa-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .sa-sub{font-size:13px;color:#52525b}
        .sa-cta{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;font-family:'DM Mono',monospace;cursor:pointer;white-space:nowrap}
        .sa-form{background:#18181b;border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px}
        .sa-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .sa-field{display:flex;flex-direction:column;gap:6px}
        .sa-label{font-size:12px;color:#a1a1aa}
        .sa-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%;appearance:none}
        .sa-input:focus{border-color:rgba(245,158,11,0.5)}
        .sa-input option{background:#18181b}
        .sa-form-actions{display:flex;gap:10px;justify-content:flex-end}
        .sa-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 18px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer}
        .sa-submit{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer}
        .sa-submit:disabled{opacity:0.5;cursor:not-allowed}
        .sa-search{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:9px 14px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%;max-width:320px}
        .sa-search:focus{border-color:rgba(245,158,11,0.4)}
        .sa-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:auto}
        .sa-table{width:100%;border-collapse:collapse;font-size:13px;min-width:600px}
        .sa-table th{text-align:left;padding:12px 16px;color:#52525b;font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.06)}
        .sa-table td{padding:12px 16px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .sa-table tr:last-child td{border-bottom:none}
        .sa-table tr:hover td{background:rgba(255,255,255,0.015)}
        .sa-buyer{font-weight:500;color:#d4d4d8}
        .sa-product{font-size:12px;color:#71717a}
        .sa-platform{font-size:11px;color:#71717a;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;padding:2px 8px}
        .sa-amount{font-weight:500;color:#f4f4f5}
        .sa-badge{font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid;cursor:pointer;font-family:'DM Mono',monospace;font-weight:500}
        .sa-del{background:none;border:none;color:#3f3f46;font-size:12px;cursor:pointer;padding:4px 8px;border-radius:4px}
        .sa-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
        .sa-empty{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;color:#52525b}
        .sa-none{padding:40px;text-align:center;font-size:13px;color:#52525b}
        @media(max-width:640px){.sa-form-grid{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  )
}
