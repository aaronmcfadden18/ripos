'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [name, setName] = useState('')
  const [set, setSet] = useState('')
  const [qty, setQty] = useState('1')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [packsPerBox, setPacksPerBox] = useState('')
  const [saving, setSaving] = useState(false)

  // Quick add state
  const [qName, setQName] = useState('')
  const [qQty, setQQty] = useState('1')
  const [qTotal, setQTotal] = useState('')
  const [qPacks, setQPacks] = useState('')
  const [qSaving, setQSaving] = useState(false)
  const [qDone, setQDone] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<{imported:number,skipped:number}|null>(null)

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
      user_id: user.id,
      product_name: name.trim(),
      set_name: set.trim() || null,
      quantity: parseInt(qty) || 0,
      cost_per_unit: parseFloat(cost) || null,
      suggested_price: parseFloat(price) || null,
      packs_per_box: parseInt(packsPerBox) || null,
    }).select().single()
    if (data) {
      setItems(prev => [data, ...prev])
      setName(''); setSet(''); setQty('1'); setCost(''); setPrice(''); setPacksPerBox('')
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qName.trim() || !qTotal) return
    setQSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const qtyNum = parseInt(qQty) || 1
    const totalPaid = parseFloat(qTotal) || 0
    const costPerUnit = totalPaid / qtyNum
    const packsNum = parseInt(qPacks) || null

    // Check if product already exists
    const existing = items.find(i => i.product_name.toLowerCase() === qName.trim().toLowerCase())

    if (existing) {
      // Update existing — weighted average cost
      const existingQty = existing.quantity ?? 0
      const existingCost = existing.cost_per_unit ?? 0
      const newQty = existingQty + qtyNum
      const weightedCost = ((existingQty * existingCost) + (qtyNum * costPerUnit)) / newQty
      const supabase2 = createClient()
      const { data: updated } = await supabase2.from('inventory_items')
        .update({ quantity: newQty, cost_per_unit: Math.round(weightedCost * 100) / 100 })
        .eq('id', existing.id)
        .select().single()
      if (updated) setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    } else {
      // Create new
      const { data } = await supabase.from('inventory_items').insert({
        user_id: user.id,
        product_name: qName.trim(),
        quantity: qtyNum,
        cost_per_unit: Math.round(costPerUnit * 100) / 100,
        packs_per_box: packsNum,
      }).select().single()
      if (data) setItems(prev => [data, ...prev])
    }

    setQDone(true)
    setTimeout(() => {
      setQDone(false)
      setQName(''); setQQty('1'); setQTotal(''); setQPacks('')
      setShowQuick(false)
    }, 1500)
    setQSaving(false)
  }

  const handleQty = async (id: string, delta: number) => {
    const supabase = createClient()
    const item = items.find(i => i.id === id)
    const newQty = Math.max(0, (item?.quantity ?? 0) + delta)
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i))
    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return
    const supabase = createClient()
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('inventory_items').delete().eq('id', id)
  }

  const totalValue = items.reduce((a, i) => a + (i.quantity ?? 0) * (i.cost_per_unit ?? 0), 0)
  const qCostPerUnit = qName && qTotal && qQty ? (parseFloat(qTotal) / (parseInt(qQty) || 1)) : null
  const isExisting = items.find(i => i.product_name.toLowerCase() === qName.trim().toLowerCase())

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)
    setCsvResult(null)
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map((h:string) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g,''))
    
    // Flexible column mapping
    const col = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1
    const nameCol = col(['product_name','product','name','item','title','set'])
    const qtyCol = col(['quantity','qty','boxes','units','stock'])
    const costCol = col(['cost_per_unit','cost_per_box','cost','price_paid','unit_cost','total_cost'])
    const packsCol = col(['packs_per_box','packs','pack_count'])
    const priceCol = col(['suggested_price','sell_price','price'])
    
    if (nameCol === -1) {
      setCsvImporting(false)
      alert('Could not find a product name column. Make sure your CSV has a column called "product", "name", or "product_name".')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let imported = 0, skipped = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c:string) => c.trim().replace(/^"|"$/g,''))
      const productName = nameCol >= 0 ? cols[nameCol] : ''
      if (!productName) { skipped++; continue }
      
      const qty = qtyCol >= 0 ? parseInt(cols[qtyCol]) || 1 : 1
      let cost = costCol >= 0 ? parseFloat(cols[costCol]) || null : null
      const packs = packsCol >= 0 ? parseInt(cols[packsCol]) || null : null
      const suggestedPrice = priceCol >= 0 ? parseFloat(cols[priceCol]) || null : null

      await supabase.from('inventory_items').insert({
        user_id: user.id,
        product_name: productName,
        quantity: qty,
        cost_per_unit: cost,
        packs_per_box: packs,
        suggested_price: suggestedPrice,
      })
      imported++
    }

    const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
    setCsvImporting(false)
    setCsvResult({ imported, skipped })
  }

  return (
    <div className="iv">
      <div className="iv-header">
        <div>
          <Link href="/" className="iv-back">← Dashboard</Link>
          <h1 className="iv-title">Inventory</h1>
          <p className="iv-sub">{items.length} products · £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 0 })} stock value</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="iv-quick-btn" onClick={() => { setShowQuick(true); setShowForm(false) }}>⚡ Quick add</button>
          <button className="iv-quick-btn" onClick={() => setShowCsvImport(v => !v)}>📥 Import CSV</button>
          <button className="iv-cta" onClick={() => { setShowForm(v => !v); setShowQuick(false) }}>{showForm ? '✕ Close' : '+ Full add'}</button>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuick && (
        <div className="iv-modal-overlay" onClick={() => setShowQuick(false)}>
          <div className="iv-modal" onClick={e => e.stopPropagation()}>
            {qDone ? (
              <div className="iv-quick-done">
                <div className="iv-quick-done-icon">✓</div>
                <p className="iv-quick-done-text">{isExisting ? 'Stock updated!' : 'Added to inventory!'}</p>
              </div>
            ) : (
              <>
                <div className="iv-modal-head">
                  <h2 className="iv-modal-title">⚡ Quick add purchase</h2>
                  <button className="iv-modal-close" onClick={() => setShowQuick(false)}>✕</button>
                </div>
                <p className="iv-modal-sub">Log what you just bought in seconds</p>
                <form onSubmit={handleQuickAdd} className="iv-quick-form">
                  <div className="iv-field">
                    <label className="iv-label">Product *</label>
                    <input className="iv-input iv-input-lg" value={qName} onChange={e => setQName(e.target.value)}
                      placeholder="e.g. One Piece OP-09 Box" required autoFocus
                      list="iv-products-list" />
                    <datalist id="iv-products-list">
                      {items.map(i => <option key={i.id} value={i.product_name} />)}
                    </datalist>
                    {isExisting && <p className="iv-quick-hint">✓ Existing product — will update stock + recalculate avg cost</p>}
                  </div>
                  <div className="iv-quick-row">
                    <div className="iv-field">
                      <label className="iv-label">Boxes bought</label>
                      <input className="iv-input iv-input-lg" type="number" min="1" value={qQty}
                        onChange={e => setQQty(e.target.value)} />
                    </div>
                    <div className="iv-field">
                      <label className="iv-label">Total paid (£)</label>
                      <input className="iv-input iv-input-lg" type="number" min="0" step="0.01"
                        value={qTotal} onChange={e => setQTotal(e.target.value)} placeholder="0.00" required />
                    </div>
                  </div>
                  {!isExisting && (
                    <div className="iv-field">
                      <label className="iv-label">Packs per box <span className="iv-label-opt">(optional)</span></label>
                      <input className="iv-input iv-input-lg" type="number" min="0" value={qPacks}
                        onChange={e => setQPacks(e.target.value)} placeholder="e.g. 24" />
                    </div>
                  )}
                  {qCostPerUnit !== null && (
                    <div className="iv-quick-calc">
                      <span>Cost per box</span>
                      <span className="iv-quick-calc-val">£{qCostPerUnit.toFixed(2)}</span>
                      {qPacks && parseInt(qPacks) > 0 && (
                        <span className="iv-quick-calc-pack">· £{(qCostPerUnit / parseInt(qPacks)).toFixed(2)}/pack</span>
                      )}
                    </div>
                  )}
                  <button type="submit" className="iv-submit iv-submit-full" disabled={qSaving || !qName.trim() || !qTotal}>
                    {qSaving ? 'Saving…' : isExisting ? `Update stock (+${qQty} boxes)` : 'Add to inventory'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {showCsvImport && (
        <div style={{background:'#18181b',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'20px',display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{fontSize:'14px',color:'#f4f4f5',fontWeight:'500'}}>Import stock from CSV</h3>
            <button onClick={() => setShowCsvImport(false)} style={{background:'none',border:'none',color:'#52525b',cursor:'pointer',fontSize:'16px'}}>✕</button>
          </div>
          <p style={{fontSize:'13px',color:'#71717a',lineHeight:'1.6'}}>Your CSV needs at least a <strong style={{color:'#d4d4d8'}}>product name</strong> column. Other columns are optional and auto-detected.</p>
          <div style={{background:'#0e0e0f',borderRadius:'8px',padding:'12px',display:'flex',flexDirection:'column',gap:'4px'}}>
            <p style={{fontSize:'11px',color:'#52525b',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Example format</p>
            <code style={{fontSize:'12px',color:'#a78bfa',fontFamily:'DM Mono,monospace'}}>product_name, quantity, cost_per_unit, packs_per_box</code>
            <code style={{fontSize:'12px',color:'#a1a1aa',fontFamily:'DM Mono,monospace'}}>OP-03 Booster Box, 4, 125.00, 24</code>
            <code style={{fontSize:'12px',color:'#a1a1aa',fontFamily:'DM Mono,monospace'}}>OP-06 Booster Box, 2, 89.99, 24</code>
          </div>
          <p style={{fontSize:'12px',color:'#52525b'}}>Also accepts: <span style={{color:'#a78bfa'}}>product, name, qty, boxes, cost, cost_per_box, packs</span></p>
          {csvImporting ? (
            <p style={{fontSize:'13px',color:'#f59e0b'}}>Importing...</p>
          ) : csvResult ? (
            <p style={{fontSize:'13px',color:'#4ade80'}}>✓ Imported {csvResult.imported} items{csvResult.skipped > 0 ? `, skipped ${csvResult.skipped}` : ''}</p>
          ) : (
            <label style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'10px 20px',background:'#f59e0b',color:'#0e0e0f',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer',width:'fit-content'}}>
              <span>Choose CSV file</span>
              <input type="file" accept=".csv" onChange={handleCsvImport} style={{display:'none'}}/>
            </label>
          )}
        </div>
      )}
      {showForm && (
        <form onSubmit={handleAdd} className="iv-form">
          <div className="iv-form-grid">
            <div className="iv-field iv-wide">
              <label className="iv-label">Product name *</label>
              <input className="iv-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. One Piece OP-09 Box" required autoFocus />
            </div>
            <div className="iv-field iv-wide">
              <label className="iv-label">Set / series</label>
              <input className="iv-input" value={set} onChange={e => setSet(e.target.value)} placeholder="e.g. Emperors in the New World" />
            </div>
            <div className="iv-field">
              <label className="iv-label">Quantity (boxes)</label>
              <input className="iv-input" type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div className="iv-field">
              <label className="iv-label">Packs per box</label>
              <input className="iv-input" type="number" min="0" value={packsPerBox} onChange={e => setPacksPerBox(e.target.value)} placeholder="e.g. 24" />
            </div>
            <div className="iv-field">
              <label className="iv-label">Cost per box (£)</label>
              <input className="iv-input" type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="iv-field">
              <label className="iv-label">Suggested sell price (£)</label>
              <input className="iv-input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          {cost && packsPerBox && parseInt(packsPerBox) > 0 && (
            <div className="iv-pack-hint">
              💡 Cost per pack: <strong>£{(parseFloat(cost) / parseInt(packsPerBox)).toFixed(2)}</strong>
            </div>
          )}
          <div className="iv-form-actions">
            <button type="button" className="iv-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="iv-submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Add to inventory'}</button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm && !showQuick ? (
        <div className="iv-empty">
          <p>No inventory yet.</p>
          <button className="iv-quick-btn" onClick={() => setShowQuick(true)}>⚡ Quick add your first purchase</button>
        </div>
      ) : (
        <div className="iv-grid">
          {items.map(item => {
            const q = item.quantity ?? 0
            const packs = item.packs_per_box
            const costPerPack = packs && item.cost_per_unit ? item.cost_per_unit / packs : null
            const totalPacks = packs ? q * packs : null
            const status = q === 0 ? { label: 'Out', cls: 'red' } : q <= 2 ? { label: 'Low', cls: 'amber' } : { label: 'In stock', cls: 'green' }
            return (
              <div key={item.id} className="iv-item">
                <div className="iv-item-head">
                  <div>
                    <p className="iv-item-name">{item.product_name}</p>
                    {item.set_name && <p className="iv-item-set">{item.set_name}</p>}
                  </div>
                  <span className={`iv-badge iv-${status.cls}`}>{status.label}</span>
                </div>
                <div className="iv-item-stats">
                  <div><p className="iv-stat-label">Cost/box</p><p className="iv-stat-val">{item.cost_per_unit ? '£' + item.cost_per_unit : '—'}</p></div>
                  <div><p className="iv-stat-label">Sell price</p><p className="iv-stat-val">{item.suggested_price ? '£' + item.suggested_price : '—'}</p></div>
                  <div><p className="iv-stat-label">Stock value</p><p className="iv-stat-val">{item.cost_per_unit ? '£' + (q * item.cost_per_unit).toFixed(0) : '—'}</p></div>
                </div>
                {packs && (
                  <div className="iv-pack-section">
                    <div className="iv-pack-row">
                      <div><p className="iv-stat-label">Packs/box</p><p className="iv-stat-val">{packs}</p></div>
                      <div><p className="iv-stat-label">Total packs</p><p className="iv-stat-val iv-amber">{totalPacks ?? '—'}</p></div>
                      <div><p className="iv-stat-label">Cost/pack</p><p className="iv-stat-val">{costPerPack ? '£' + costPerPack.toFixed(2) : '—'}</p></div>
                    </div>
                  </div>
                )}
                <div className="iv-item-foot">
                  <div className="iv-qty">
                    <button className="iv-qty-btn" onClick={() => handleQty(item.id, -1)} disabled={q === 0}>−</button>
                    <span className="iv-qty-val">{q} box{q !== 1 ? 'es' : ''}</span>
                    <button className="iv-qty-btn" onClick={() => handleQty(item.id, 1)}>+</button>
                  </div>
                  <button className="iv-del" onClick={() => handleDelete(item.id)}>Remove</button>
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
        .iv-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .iv-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .iv-sub{font-size:13px;color:#52525b}
        .iv-cta{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;font-family:'DM Mono',monospace;cursor:pointer;white-space:nowrap}
        .iv-quick-btn{background:none;border:1px solid rgba(245,158,11,0.4);color:#f59e0b;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;font-family:'DM Mono',monospace;cursor:pointer;white-space:nowrap}
        .iv-quick-btn:hover{background:rgba(245,158,11,0.08)}
        .iv-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
        .iv-modal{background:#18181b;border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:24px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:16px}
        .iv-modal-head{display:flex;align-items:center;justify-content:space-between}
        .iv-modal-title{font-size:16px;color:#f4f4f5;font-weight:500}
        .iv-modal-close{background:none;border:none;color:#52525b;font-size:18px;cursor:pointer;padding:4px}
        .iv-modal-sub{font-size:12px;color:#52525b;margin-top:-8px}
        .iv-quick-form{display:flex;flex-direction:column;gap:14px}
        .iv-quick-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .iv-quick-hint{font-size:11px;color:#4ade80;margin-top:4px}
        .iv-quick-calc{display:flex;align-items:center;gap:10px;background:#0e0e0f;border-radius:8px;padding:10px 14px;font-size:13px;color:#71717a}
        .iv-quick-calc-val{color:#f59e0b;font-weight:500}
        .iv-quick-calc-pack{color:#52525b;font-size:12px}
        .iv-quick-done{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0}
        .iv-quick-done-icon{width:48px;height:48px;border-radius:50%;background:rgba(74,222,128,0.1);border:2px solid rgba(74,222,128,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;color:#4ade80}
        .iv-quick-done-text{font-size:14px;color:#4ade80}
        .iv-submit-full{width:100%;min-height:46px;font-size:14px}
        .iv-input-lg{font-size:15px;padding:11px 14px}
        .iv-label-opt{color:#3f3f46;font-size:11px}
        .iv-form{background:#18181b;border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px}
        .iv-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .iv-wide{grid-column:1/-1}
        .iv-field{display:flex;flex-direction:column;gap:6px}
        .iv-label{font-size:12px;color:#a1a1aa}
        .iv-input{background:#0e0e0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;width:100%}
        .iv-input:focus{border-color:rgba(245,158,11,0.5)}
        .iv-pack-hint{font-size:12px;color:#71717a;background:#0e0e0f;border-radius:8px;padding:10px 14px;border:1px solid rgba(245,158,11,0.15)}
        .iv-pack-hint strong{color:#f59e0b}
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
        .iv-pack-section{padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .iv-pack-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .iv-stat-label{font-size:10px;color:#3f3f46;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px}
        .iv-stat-val{font-size:13px;color:#a1a1aa;font-weight:500}
        .iv-amber{color:#f59e0b}
        .iv-item-foot{display:flex;align-items:center;justify-content:space-between}
        .iv-qty{display:flex;align-items:center;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden}
        .iv-qty-btn{background:none;border:none;color:#71717a;width:32px;height:32px;font-size:16px;cursor:pointer}
        .iv-qty-btn:disabled{opacity:0.3;cursor:not-allowed}
        .iv-qty-val{font-size:13px;font-weight:500;color:#f4f4f5;min-width:70px;text-align:center;border-left:1px solid rgba(255,255,255,0.06);border-right:1px solid rgba(255,255,255,0.06);height:32px;display:flex;align-items:center;justify-content:center}
        .iv-del{background:none;border:none;color:#3f3f46;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;padding:4px 8px;border-radius:5px}
        .iv-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
        @media(max-width:640px){.iv-form-grid{grid-template-columns:1fr 1fr}.iv-modal{max-width:100%;margin:0}}
      `}</style>
    </div>
  )
}
