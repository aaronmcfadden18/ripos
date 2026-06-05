'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function StreamDetailPage() {
  const { id } = useParams()
  const [stream, setStream] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [linkedProducts, setLinkedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvPicker, setShowInvPicker] = useState(false)
  const [addingItem, setAddingItem] = useState<any>(null)
  const [addQty, setAddQty] = useState(1)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: s }, { data: sa }, { data: inv }, { data: purch }, { data: sp }] = await Promise.all([
      supabase.from('streams').select('*').eq('id', id).single(),
      supabase.from('sales').select('*').eq('stream_id', id).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*').eq('user_id', user!.id).order('product_name'),
      supabase.from('inventory_purchases').select('*, inventory_items(product_name)').eq('user_id', user!.id).order('purchase_date', { ascending: false }),
      supabase.from('stream_products').select('*, inventory_items(*)').eq('stream_id', id)
    ])
    setStream(s)
    setSales(sa ?? [])
    setInventory(inv ?? [])
    setPurchases(purch ?? [])
    setLinkedProducts(sp ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleAddItem = async () => {
    if (!addingItem) return
    setSaving(true)
    const supabase = createClient()
    // addingItem is now a purchase lot
    const costPerPack = (addingItem.cost_per_unit ?? 0) / (addingItem.packs_per_box ?? 1)
    await supabase.from('stream_products').insert({
      stream_id: id,
      inventory_item_id: addingItem.inventory_item_id,
      inventory_purchase_id: addingItem.id,
      quantity_used: addQty,
      cost_at_time: costPerPack
    })
    // Deduct packs from the lot
    const newPacksRemaining = Math.max(0, (addingItem.packs_remaining ?? 0) - addQty)
    await supabase.from('inventory_purchases').update({ packs_remaining: newPacksRemaining }).eq('id', addingItem.id)
    const newLinked = [...linkedProducts, { inventory_items: addingItem.inventory_items, quantity_used: addQty, cost_at_time: costPerPack }]
    const newInventoryCost = newLinked.reduce((a: number, lp: any) => a + (lp.cost_at_time * lp.quantity_used), 0)
    await supabase.from('streams').update({ inventory_cost: newInventoryCost }).eq('id', id)
    setAddingItem(null)
    setAddQty(1)
    setShowInvPicker(false)
    setSaving(false)
    load()
  }

  const handleRemoveItem = async (spId: string) => {
    setSaving(true)
    const supabase = createClient()
    // Restore packs to the lot if it exists
    const lp = linkedProducts.find((l: any) => l.id === spId)
    if (lp?.inventory_purchase_id) {
      const { data: lot } = await supabase.from('inventory_purchases').select('packs_remaining').eq('id', lp.inventory_purchase_id).single()
      if (lot) {
        await supabase.from('inventory_purchases').update({ packs_remaining: (lot.packs_remaining ?? 0) + lp.quantity_used }).eq('id', lp.inventory_purchase_id)
      }
    }
    await supabase.from('stream_products').delete().eq('id', spId)
    const newInventoryCost = linkedProducts
      .filter((lp: any) => lp.id !== spId)
      .reduce((a: number, lp: any) => a + (lp.cost_at_time * lp.quantity_used), 0)
    await supabase.from('streams').update({ inventory_cost: newInventoryCost }).eq('id', id)
    setSaving(false)
    load()
  }

  if (loading) return <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#f59e0b',fontFamily:'DM Mono,monospace',fontSize:'14px'}}>Loading...</div></div>
  if (!stream) return <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#f87171',fontFamily:'DM Mono,monospace'}}>Stream not found</div></div>

  const profit = (stream.revenue ?? 0) - (stream.inventory_cost ?? 0)
  const margin = stream.revenue > 0 ? ((profit / stream.revenue) * 100).toFixed(1) : '0'
  const topBuyers = sales.reduce((acc: any, s) => {
    if (!s.buyer_name) return acc
    acc[s.buyer_name] = (acc[s.buyer_name] || 0) + (s.sale_amount || 0)
    return acc
  }, {})
  const sortedBuyers = Object.entries(topBuyers).sort((a: any, b: any) => b[1] - a[1])
  const linkedLotIds = new Set(linkedProducts.map((lp: any) => lp.inventory_purchase_id).filter(Boolean))
  const availableInv = purchases.filter(p => !linkedLotIds.has(p.id) && (p.packs_remaining ?? 0) > 0)

  return (
    <div className="sd">
      <div className="sd-header">
        <Link href="/streams" className="sd-back">← Streams</Link>
        <div className="sd-title-row">
          <h1 className="sd-title">{stream.title}</h1>
          <span className="sd-platform">{stream.platform}</span>
        </div>
        <p className="sd-date">{stream.stream_date ? new Date(stream.stream_date).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}) : '—'}</p>
      </div>

      <div className="sd-stats">
        <div className="sd-stat">
          <p className="sd-stat-label">Revenue</p>
          <p className="sd-stat-val">{stream.revenue ? '£'+stream.revenue.toLocaleString() : '—'}</p>
        </div>
        <div className="sd-stat">
          <p className="sd-stat-label">Total cost</p>
          <p className="sd-stat-val sd-muted">{stream.inventory_cost ? '£'+Number(stream.inventory_cost).toLocaleString() : '—'}</p>
        </div>
        <div className="sd-stat">
          <p className="sd-stat-label">Net profit</p>
          <p className="sd-stat-val" style={{color:profit>=0?'#4ade80':'#f87171'}}>{stream.revenue ? '£'+profit.toLocaleString() : '—'}</p>
        </div>
        <div className="sd-stat">
          <p className="sd-stat-label">Margin</p>
          <p className="sd-stat-val" style={{color:profit>=0?'#4ade80':'#f59e0b'}}>{stream.revenue ? margin+'%' : '—'}</p>
        </div>
        {stream.vat_reclaimable > 0 && (
          <div className="sd-stat">
            <p className="sd-stat-label">VAT reclaimable</p>
            <p className="sd-stat-val sd-blue">£{stream.vat_reclaimable.toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="sd-grid">
        <div className="sd-card">
          <h2 className="sd-card-title">Profit breakdown</h2>
          <div className="sd-breakdown">
            <div className="sd-brow"><span>Revenue</span><span>£{(stream.revenue??0).toFixed(2)}</span></div>
            <div className="sd-brow sd-deduct"><span>Inventory cost</span><span>- £{Number(stream.inventory_cost??0).toFixed(2)}</span></div>
            <div className="sd-bdivider"/>
            <div className="sd-brow sd-total"><span>Net profit</span><span style={{color:profit>=0?'#4ade80':'#f87171'}}>£{profit.toFixed(2)}</span></div>
          </div>
          <div className="sd-bar-track">
            <div className="sd-bar-fill" style={{width:Math.min(Math.abs(parseFloat(margin)),100)+'%',background:profit>=0?'#4ade80':'#f87171'}}/>
          </div>
          <p className="sd-margin-label">{margin}% margin</p>
          {stream.notes && <div className="sd-notes"><p className="sd-notes-label">Notes</p><p className="sd-notes-text">{stream.notes}</p></div>}
        </div>

        {sortedBuyers.length > 0 && (
          <div className="sd-card">
            <h2 className="sd-card-title">Top buyers this stream</h2>
            <div className="sd-buyers">
              {sortedBuyers.slice(0,8).map(([name, total]: any) => (
                <div key={name} className="sd-buyer-row">
                  <a href={'/buyers/'+encodeURIComponent(name)} className="sd-buyer-name" style={{textDecoration:'none'}}>{name}</a>
                  <span className="sd-buyer-amt">£{total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sd-card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 className="sd-card-title">Inventory used</h2>
          <button className="sd-add-inv-btn" onClick={() => setShowInvPicker(!showInvPicker)} disabled={saving}>+ Add item</button>
        </div>
        {showInvPicker && (
          <div className="sd-inv-picker">
            {availableInv.length === 0 ? (
              <p style={{fontSize:'13px',color:'#52525b'}}>No more items to add. <Link href="/inventory" style={{color:'#f59e0b'}}>Manage inventory</Link></p>
            ) : (
              <>
                <select className="sd-select" value={addingItem?.id ?? ''} onChange={e => setAddingItem(purchases.find(p => p.id === e.target.value) ?? null)}>
                  <option value="">Select an item...</option>
                  {availableInv.map(i => (
                    <option key={i.id} value={i.id}>{i.product_name} - £{((i.cost_per_unit??0)/(i.packs_per_box??1)).toFixed(2)}/pack ({i.quantity ?? 0} left)</option>
                  ))}
                </select>
                {addingItem && (
                  <div style={{display:'flex',gap:'10px',alignItems:'center',marginTop:'10px',flexWrap:'wrap'}}>
                    <label style={{fontSize:'12px',color:'#71717a'}}>Packs used:</label>
                    <input type="number" min={1} max={addingItem.packs_remaining ?? 999} value={addQty} onChange={e => setAddQty(parseInt(e.target.value)||1)} className="sd-qty-input" />
                    <span style={{fontSize:'12px',color:'#52525b'}}>= £{(((addingItem.cost_per_unit??0)/(addingItem.packs_per_box??1))*addQty).toFixed(2)} · {(addingItem.packs_remaining??0) - addQty} packs left after</span>
                    <button className="sd-confirm-btn" onClick={handleAddItem} disabled={saving}>{saving ? '...' : 'Add'}</button>
                    <button className="sd-cancel-btn" onClick={() => { setShowInvPicker(false); setAddingItem(null); setAddQty(1) }}>Cancel</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {linkedProducts.length === 0 ? (
          <p style={{fontSize:'13px',color:'#3f3f46'}}>No inventory linked yet. Add items to track accurate cost.</p>
        ) : (
          <div className="sd-inv-list">
            {linkedProducts.map((lp: any) => (
              <div key={lp.id} className="sd-inv-row">
                <span className="sd-inv-name">{lp.inventory_items?.product_name ?? '—'}</span>
                <span className="sd-inv-qty">{lp.quantity_used} packs</span>
                <span className="sd-inv-cost">£{(lp.cost_at_time * lp.quantity_used).toFixed(2)}</span>
                <button className="sd-remove-btn" onClick={() => handleRemoveItem(lp.id)} disabled={saving}>x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {sales.length > 0 && (
        <div className="sd-card">
          <h2 className="sd-card-title">Sales ({sales.length})</h2>
          <div className="sd-sales-table">
            <table className="sd-table">
              <thead><tr><th>Buyer</th><th>Product</th><th>Amount</th><th>Payment</th><th>Shipping</th></tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td className="sd-buyer-cell">{s.buyer_name ? <a href={'/buyers/'+encodeURIComponent(s.buyer_name)} style={{color:'#d4d4d8',textDecoration:'none'}}>{s.buyer_name}</a> : '—'}</td>
                    <td className="sd-product-cell">{s.product_description||'—'}</td>
                    <td>{s.sale_amount?'£'+s.sale_amount:'—'}</td>
                    <td><span className="sd-badge" style={{color:s.payment_status==='paid'?'#4ade80':'#f87171'}}>{s.payment_status||'—'}</span></td>
                    <td><span className="sd-badge" style={{color:s.shipping_status==='delivered'?'#4ade80':s.shipping_status==='shipped'?'#a78bfa':'#f59e0b'}}>{s.shipping_status||'—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sales.length === 0 && (
        <div className="sd-card sd-empty-sales">
          <p>No sales linked to this stream.</p>
          <Link href="/sales" className="sd-link">Log sales</Link>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .sd{max-width:1000px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .sd-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:12px}
        .sd-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .sd-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5}
        .sd-platform{font-size:11px;color:#71717a;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:3px 10px}
        .sd-date{font-size:13px;color:#52525b;margin-top:4px}
        .sd-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
        .sd-stat{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px 18px}
        .sd-stat-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .sd-stat-val{font-family:'DM Serif Display',serif;font-size:24px;color:#f4f4f5}
        .sd-muted{color:#71717a!important}
        .sd-blue{color:#60a5fa!important}
        .sd-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .sd-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
        .sd-card-title{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .sd-breakdown{display:flex;flex-direction:column;gap:10px}
        .sd-brow{display:flex;justify-content:space-between;font-size:13px;color:#a1a1aa}
        .sd-deduct{color:#52525b}
        .sd-bdivider{height:1px;background:rgba(255,255,255,0.06)}
        .sd-total{font-weight:500;color:#f4f4f5;font-size:14px}
        .sd-bar-track{height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden}
        .sd-bar-fill{height:100%;border-radius:99px;transition:width 0.3s}
        .sd-margin-label{font-size:12px;color:#52525b}
        .sd-notes{background:#0e0e0f;border-radius:8px;padding:12px}
        .sd-notes-label{font-size:10px;color:#3f3f46;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .sd-notes-text{font-size:13px;color:#a1a1aa;line-height:1.6}
        .sd-buyers{display:flex;flex-direction:column;gap:8px}
        .sd-buyer-row{display:flex;justify-content:space-between;font-size:13px}
        .sd-buyer-name{color:#d4d4d8;transition:color 0.15s}.sd-buyer-name:hover{color:#f59e0b}
        .sd-buyer-amt{color:#f4f4f5;font-weight:500}
        .sd-add-inv-btn{background:none;border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:5px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#f59e0b;cursor:pointer}
        .sd-add-inv-btn:hover{border-color:rgba(245,158,11,0.6)}
        .sd-add-inv-btn:disabled{opacity:0.4;cursor:not-allowed}
        .sd-inv-picker{background:#0e0e0f;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px}
        .sd-select{background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#d4d4d8;width:100%;cursor:pointer}
        .sd-select:focus{outline:none;border-color:rgba(245,158,11,0.4)}
        .sd-qty-input{background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;font-family:'DM Mono',monospace;font-size:12px;color:#d4d4d8;width:70px;text-align:center}
        .sd-qty-input:focus{outline:none;border-color:rgba(245,158,11,0.4)}
        .sd-confirm-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:6px;padding:6px 14px;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;cursor:pointer}
        .sd-confirm-btn:disabled{opacity:0.5;cursor:not-allowed}
        .sd-cancel-btn{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:6px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#71717a;cursor:pointer}
        .sd-inv-list{display:flex;flex-direction:column;gap:8px}
        .sd-inv-row{display:flex;align-items:center;gap:12px;padding:8px 12px;background:#0e0e0f;border-radius:8px;font-size:13px}
        .sd-inv-name{flex:1;color:#e4e4e7}
        .sd-inv-qty{color:#71717a;font-size:12px;min-width:60px}
        .sd-inv-cost{color:#f59e0b;min-width:70px;text-align:right}
        .sd-remove-btn{background:none;border:none;color:#3f3f46;font-size:16px;cursor:pointer;padding:0 4px;line-height:1}
        .sd-remove-btn:hover{color:#f87171}
        .sd-remove-btn:disabled{opacity:0.3;cursor:not-allowed}
        .sd-sales-table{overflow:auto}
        .sd-table{width:100%;border-collapse:collapse;font-size:13px;min-width:500px}
        .sd-table th{text-align:left;padding:10px 12px;color:#52525b;font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.06)}
        .sd-table td{padding:10px 12px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04)}
        .sd-table tr:last-child td{border-bottom:none}
        .sd-buyer-cell{font-weight:500;color:#d4d4d8}
        .sd-product-cell{color:#71717a;font-size:12px}
        .sd-badge{font-size:11px;font-weight:500}
        .sd-empty-sales{text-align:center;color:#52525b;align-items:center}
        .sd-link{color:#f59e0b;text-decoration:none;font-size:13px}
        @media(max-width:640px){.sd-grid{grid-template-columns:1fr}.sd-stats{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  )
}
