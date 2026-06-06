'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [name, setName] = useState('')
  const [set, setSet] = useState('')
  const [packsPerBox, setPacksPerBox] = useState('')
  const [saving, setSaving] = useState(false)
  const [qName, setQName] = useState('')
  const [qQty, setQQty] = useState('1')
  const [qTotal, setQTotal] = useState('')
  const [qPacks, setQPacks] = useState('')
  const [qDate, setQDate] = useState('')
  const [qSaving, setQSaving] = useState(false)
  const [qDone, setQDone] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<{imported:number,skipped:number}|null>(null)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editName, setEditName] = useState('')
  const [editPacks, setEditPacks] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editVat, setEditVat] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [addingLotFor, setAddingLotFor] = useState<string|null>(null)
  const [lotQty, setLotQty] = useState('1')
  const [lotCost, setLotCost] = useState('')
  const [lotDate, setLotDate] = useState('')
  const [lotNotes, setLotNotes] = useState('')
  const [lotSaving, setLotSaving] = useState(false)
  const [editingLot, setEditingLot] = useState<string|null>(null)
  const [editLotPacks, setEditLotPacks] = useState('')
  const [editLotCost, setEditLotCost] = useState('')
  const [editLotSaving, setEditLotSaving] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: inv }, { data: purch }] = await Promise.all([
      supabase.from('inventory_items').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory_purchases').select('*').eq('user_id', user!.id).order('purchase_date', { ascending: false })
    ])
    setItems(inv ?? [])
    setPurchases(purch ?? [])
  }

  useEffect(() => { load() }, [])

  const lotsFor = (itemId: string) => purchases.filter(p => p.inventory_item_id === itemId)
  const packsRemainingFor = (itemId: string) => lotsFor(itemId).reduce((a, p) => a + (p.packs_remaining ?? 0), 0)

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
      packs_per_box: parseInt(packsPerBox) || null,
    }).select().single()
    if (data) {
      setItems(prev => [data, ...prev])
      setName(''); setSet(''); setPacksPerBox('')
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleAddLot = async (itemId: string) => {
    if (!lotCost) return
    setLotSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const item = items.find(i => i.id === itemId)
    const boxes = parseInt(lotQty) || 1
    const costPerBox = parseFloat(lotCost) || 0
    const packs = item?.packs_per_box ? boxes * item.packs_per_box : null
    await supabase.from('inventory_purchases').insert({
      user_id: user.id,
      inventory_item_id: itemId,
      quantity_boxes: boxes,
      cost_per_unit: costPerBox,
      packs_per_box: item?.packs_per_box ?? null,
      packs_remaining: packs,
      purchase_date: lotDate || null,
      notes: lotNotes || null,
    })
    setAddingLotFor(null)
    setLotQty('1'); setLotCost(''); setLotDate(''); setLotNotes('')
    setLotSaving(false)
    load()
  }

  const handleEditLot = async (lotId: string) => {
    setEditLotSaving(true)
    const supabase = createClient()
    await supabase.from('inventory_purchases').update({
      packs_remaining: parseInt(editLotPacks) || 0,
      cost_per_unit: parseFloat(editLotCost) || 0,
    }).eq('id', lotId)
    setEditingLot(null)
    setEditLotSaving(false)
    load()
  }

  const handleDeleteLot = async (lotId: string) => {
    if (!confirm('Delete this purchase lot?')) return
    const supabase = createClient()
    await supabase.from('inventory_purchases').delete().eq('id', lotId)
    load()
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
    const costPerBox = totalPaid / qtyNum
    const packsNum = parseInt(qPacks) || null
    const existing = items.find(i => i.product_name.toLowerCase() === qName.trim().toLowerCase())
    let itemId = existing?.id
    if (!existing) {
      const { data } = await supabase.from('inventory_items').insert({
        user_id: user.id,
        product_name: qName.trim(),
        packs_per_box: packsNum,
      }).select().single()
      itemId = data?.id
    }
    if (itemId) {
      const packs = packsNum ? qtyNum * packsNum : (existing?.packs_per_box ? qtyNum * existing.packs_per_box : null)
      await supabase.from('inventory_purchases').insert({
        user_id: user.id,
        inventory_item_id: itemId,
        quantity_boxes: qtyNum,
        cost_per_unit: Math.round(costPerBox * 100) / 100,
        packs_per_box: packsNum ?? existing?.packs_per_box ?? null,
        packs_remaining: packs,
        purchase_date: qDate || null,
      })
    }
    setQDone(true)
    setTimeout(() => {
      setQDone(false)
      setQName(''); setQQty('1'); setQTotal(''); setQPacks(''); setQDate('')
      setShowQuick(false)
    }, 1500)
    setQSaving(false)
    load()
  }

  const startEdit = (item: any) => {
    setEditingId(item.id)
    setEditName(item.product_name ?? '')
    setEditPacks(item.packs_per_box?.toString() ?? '')
    setEditPrice(item.suggested_price?.toString() ?? '')
    setEditVat(item.vat_reclaimable ?? false)
  }

  const handleEditSave = async () => {
    if (!editingId) return
    setEditSaving(true)
    const supabase = createClient()
    await supabase.from('inventory_items').update({
      product_name: editName.trim(),
      packs_per_box: parseInt(editPacks) || null,
      suggested_price: parseFloat(editPrice) || null,
      vat_reclaimable: editVat,
    }).eq('id', editingId)
    await load()
    setEditingId(null)
    setEditSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product and all its purchase lots?')) return
    const supabase = createClient()
    await supabase.from('inventory_items').delete().eq('id', id)
    load()
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalPacks = purchases.reduce((a, p) => a + (p.packs_remaining ?? 0), 0)
  const totalValue = purchases.reduce((a, p) => a + ((p.packs_remaining ?? 0) * (p.cost_per_unit ?? 0) / (p.packs_per_box ?? 1)), 0)
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
    const col = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1
    const nameCol = col(['product_name','product','name','item','title','set'])
    const qtyCol = col(['quantity','qty','boxes','units','stock'])
    const costCol = col(['cost_per_unit','cost_per_box','cost','price_paid','unit_cost','total_cost'])
    const packsCol = col(['packs_per_box','packs','pack_count'])
    const priceCol = col(['suggested_price','sell_price','price'])
    if (nameCol === -1) { setCsvImporting(false); alert('Could not find a product name column.'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let imported = 0, skipped = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c:string) => c.trim().replace(/^"|"$/g,''))
      const productName = nameCol >= 0 ? cols[nameCol] : ''
      if (!productName) { skipped++; continue }
      const qty = qtyCol >= 0 ? parseInt(cols[qtyCol]) || 1 : 1
      const cost = costCol >= 0 ? parseFloat(cols[costCol]) || null : null
      const packs = packsCol >= 0 ? parseInt(cols[packsCol]) || null : null
      const suggestedPrice = priceCol >= 0 ? parseFloat(cols[priceCol]) || null : null
      const { data: newItem } = await supabase.from('inventory_items').insert({
        user_id: user.id, product_name: productName, packs_per_box: packs, suggested_price: suggestedPrice,
      }).select().single()
      if (newItem && cost) {
        await supabase.from('inventory_purchases').insert({
          user_id: user.id, inventory_item_id: newItem.id,
          quantity_boxes: qty, cost_per_unit: cost,
          packs_per_box: packs, packs_remaining: packs ? qty * packs : null,
        })
      }
      imported++
    }
    setCsvImporting(false)
    setCsvResult({ imported, skipped })
    load()
  }

  return (
    <div className="iv">
      <div className="iv-header">
        <div>
          <Link href="/" className="iv-back">← Dashboard</Link>
          <h1 className="iv-title">Inventory</h1>
          <p className="iv-sub">{items.length} products · {totalPacks} packs remaining · £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 0 })} stock value</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="iv-quick-btn" onClick={() => { setShowQuick(true); setShowForm(false) }}>⚡ Quick add</button>
          <button className="iv-quick-btn" onClick={() => setShowCsvImport(v => !v)}>📥 Import CSV</button>
          <button className="iv-cta" onClick={() => { setShowForm(v => !v); setShowQuick(false) }}>{showForm ? '✕ Close' : '+ New product'}</button>
        </div>
      </div>

      {showQuick && (
        <div className="iv-modal-overlay" onClick={() => setShowQuick(false)}>
          <div className="iv-modal" onClick={e => e.stopPropagation()}>
            {qDone ? (
              <div className="iv-quick-done">
                <div className="iv-quick-done-icon">✓</div>
                <p className="iv-quick-done-text">{isExisting ? 'Purchase lot added!' : 'Added to inventory!'}</p>
              </div>
            ) : (
              <>
                <div className="iv-modal-head">
                  <h2 className="iv-modal-title">⚡ Quick add purchase</h2>
                  <button className="iv-modal-close" onClick={() => setShowQuick(false)}>✕</button>
                </div>
                <p className="iv-modal-sub">Creates a new purchase lot with its own price</p>
                <form onSubmit={handleQuickAdd} className="iv-quick-form">
                  <div className="iv-field">
                    <label className="iv-label">Product *</label>
                    <input className="iv-input iv-input-lg" value={qName} onChange={e => setQName(e.target.value)}
                      placeholder="e.g. One Piece OP-09 Box" required autoFocus list="iv-products-list" />
                    <datalist id="iv-products-list">
                      {items.map(i => <option key={i.id} value={i.product_name} />)}
                    </datalist>
                    {isExisting && <p className="iv-quick-hint">✓ Existing product — adds a new purchase lot</p>}
                  </div>
                  <div className="iv-quick-row">
                    <div className="iv-field">
                      <label className="iv-label">Boxes bought</label>
                      <input className="iv-input iv-input-lg" type="number" min="1" value={qQty} onChange={e => setQQty(e.target.value)} />
                    </div>
                    <div className="iv-field">
                      <label className="iv-label">Total paid (£)</label>
                      <input className="iv-input iv-input-lg" type="number" min="0" step="0.01" value={qTotal} onChange={e => setQTotal(e.target.value)} placeholder="0.00" required />
                    </div>
                  </div>
                  {!isExisting && (
                    <div className="iv-field">
                      <label className="iv-label">Packs per box <span className="iv-label-opt">(optional)</span></label>
                      <input className="iv-input iv-input-lg" type="number" min="0" value={qPacks} onChange={e => setQPacks(e.target.value)} placeholder="e.g. 24" />
                    </div>
                  )}
                  <div className="iv-field">
                    <label className="iv-label">Purchase date <span className="iv-label-opt">(optional)</span></label>
                    <input className="iv-input iv-input-lg" type="date" value={qDate} onChange={e => setQDate(e.target.value)} />
                  </div>
                  {qCostPerUnit !== null && (
                    <div className="iv-quick-calc">
                      <span>Cost per box</span>
                      <span className="iv-quick-calc-val">£{qCostPerUnit.toFixed(2)}</span>
                      {(qPacks && parseInt(qPacks) > 0) && (
                        <span className="iv-quick-calc-pack">· £{(qCostPerUnit / parseInt(qPacks)).toFixed(2)}/pack</span>
                      )}
                      {(!qPacks && isExisting?.packs_per_box) && (
                        <span className="iv-quick-calc-pack">· £{(qCostPerUnit / isExisting.packs_per_box).toFixed(2)}/pack</span>
                      )}
                    </div>
                  )}
                  <button type="submit" className="iv-submit iv-submit-full" disabled={qSaving || !qName.trim() || !qTotal}>
                    {qSaving ? 'Saving…' : 'Add purchase lot'}
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
          <p style={{fontSize:'13px',color:'#71717a',lineHeight:'1.6'}}>Your CSV needs at least a <strong style={{color:'#d4d4d8'}}>product name</strong> column. Each row creates a product + one purchase lot.</p>
          <div style={{background:'#0e0e0f',borderRadius:'8px',padding:'12px',display:'flex',flexDirection:'column',gap:'4px'}}>
            <p style={{fontSize:'11px',color:'#52525b',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Example format</p>
            <code style={{fontSize:'12px',color:'#a78bfa',fontFamily:'DM Mono,monospace'}}>product_name, quantity, cost_per_unit, packs_per_box</code>
            <code style={{fontSize:'12px',color:'#a1a1aa',fontFamily:'DM Mono,monospace'}}>OP-03 Booster Box, 4, 125.00, 24</code>
          </div>
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
          <p style={{fontSize:'12px',color:'#52525b'}}>Create the product first, then add purchase lots to it.</p>
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
              <label className="iv-label">Packs per box</label>
              <input className="iv-input" type="number" min="0" value={packsPerBox} onChange={e => setPacksPerBox(e.target.value)} placeholder="e.g. 24" />
            </div>
          </div>
          <div className="iv-form-actions">
            <button type="button" className="iv-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="iv-submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Create product'}</button>
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
            const lots = lotsFor(item.id)
            const packsLeft = lots.length > 0 ? packsRemainingFor(item.id) : (item.quantity ?? 0)
            const hasLegacyData = lots.length === 0 && (item.quantity > 0 || item.cost_per_unit)
            const isExpanded = expandedItems.has(item.id)
            const isEditing = editingId === item.id
            const isAddingLot = addingLotFor === item.id
            const status = packsLeft === 0 && lots.length > 0 ? { label: 'Out', cls: 'red' }
              : packsLeft <= 5 && lots.length > 0 ? { label: 'Low', cls: 'amber' }
              : lots.length === 0 && hasLegacyData ? { label: 'In stock', cls: 'green' }
              : lots.length === 0 ? { label: 'No lots', cls: 'amber' }
              : { label: 'In stock', cls: 'green' }

            return (
              <div key={item.id} className="iv-item">
                {isEditing ? (
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    <p style={{fontSize:'11px',color:'#52525b',textTransform:'uppercase',letterSpacing:'0.06em'}}>Editing product</p>
                    <div className="iv-field">
                      <label className="iv-label">Product name</label>
                      <input className="iv-input" value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                      <div className="iv-field">
                        <label className="iv-label">Packs/box</label>
                        <input className="iv-input" type="number" min="0" value={editPacks} onChange={e => setEditPacks(e.target.value)} placeholder="e.g. 24" />
                      </div>
                      <div className="iv-field">
                        <label className="iv-label">Sell price (£)</label>
                        <input className="iv-input" type="number" min="0" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <label className="iv-label" style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                      <div onClick={() => setEditVat(v => !v)} style={{width:'36px',height:'20px',borderRadius:'99px',background:editVat?'#f59e0b':'rgba(255,255,255,0.08)',position:'relative',transition:'background 0.2s',flexShrink:0,cursor:'pointer'}}>
                        <div style={{position:'absolute',top:'3px',left:editVat?'19px':'3px',width:'14px',height:'14px',borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                      </div>
                      <span>VAT reclaimable</span>
                    </label>
                    <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                      <button className="iv-ghost" onClick={() => setEditingId(null)} disabled={editSaving}>Cancel</button>
                      <button className="iv-submit" onClick={handleEditSave} disabled={editSaving || !editName.trim()}>{editSaving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="iv-item-head">
                      <div>
                        <p className="iv-item-name">{item.product_name}</p>
                        {item.set_name && <p className="iv-item-set">{item.set_name}</p>}
                      </div>
                      <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
                        <span className={`iv-badge iv-${status.cls}`}>{status.label}</span>
                        {item.vat_reclaimable && <span className="iv-badge" style={{background:'rgba(96,165,250,0.08)',color:'#60a5fa',border:'1px solid rgba(96,165,250,0.18)'}}>VAT</span>}
                      </div>
                    </div>

                    <div className="iv-item-stats">
                      <div><p className="iv-stat-label">{lots.length > 0 ? 'Packs left' : 'Boxes'}</p><p className="iv-stat-val" style={{color:packsLeft===0?'#f87171':packsLeft<=5?'#f59e0b':'#4ade80'}}>{packsLeft}</p></div>
                      <div><p className="iv-stat-label">{lots.length > 0 ? 'Lots' : 'Cost/box'}</p><p className="iv-stat-val">{lots.length > 0 ? lots.length : (item.cost_per_unit ? '£'+item.cost_per_unit : '—')}</p></div>
                      <div><p className="iv-stat-label">Packs/box</p><p className="iv-stat-val">{item.packs_per_box ?? '—'}</p></div>
                    </div>
                    {hasLegacyData && lots.length === 0 && (
                      <p style={{fontSize:'11px',color:'#52525b'}}>Legacy data — add a purchase lot to track packs accurately</p>
                    )}

                    {lots.length > 0 && (
                      <button className="iv-lots-toggle" onClick={() => toggleExpand(item.id)}>
                        {isExpanded ? '▲ Hide lots' : `▼ Show ${lots.length} lot${lots.length !== 1 ? 's' : ''}`}
                      </button>
                    )}

                    {isExpanded && lots.length > 0 && (
                      <div className="iv-lots">
                        {lots.map(lot => (
                          <div key={lot.id} className="iv-lot">
                            {editingLot === lot.id ? (
                              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                                <input className="iv-input" type="number" min="0" value={editLotPacks} onChange={e => setEditLotPacks(e.target.value)} placeholder="Packs left" style={{width:'90px'}} />
                                <input className="iv-input" type="number" min="0" step="0.01" value={editLotCost} onChange={e => setEditLotCost(e.target.value)} placeholder="£/box" style={{width:'90px'}} />
                                <button className="iv-confirm-btn" onClick={() => handleEditLot(lot.id)} disabled={editLotSaving}>Save</button>
                                <button className="iv-cancel-btn" onClick={() => setEditingLot(null)}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <div style={{flex:1}}>
                                  <p style={{fontSize:'12px',color:'#e4e4e7',fontWeight:'500'}}>
                                    {lot.purchase_date ? new Date(lot.purchase_date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : 'No date'} · {lot.quantity_boxes} box{lot.quantity_boxes !== 1 ? 'es' : ''} @ £{lot.cost_per_unit}/box
                                  </p>
                                  <p style={{fontSize:'11px',color:'#52525b',marginTop:'2px'}}>
                                    {lot.packs_remaining ?? '?'} packs remaining
                                    {lot.packs_per_box ? ` · £${(lot.cost_per_unit / lot.packs_per_box).toFixed(2)}/pack` : ''}
                                    {lot.notes ? ` · ${lot.notes}` : ''}
                                  </p>
                                </div>
                                <div style={{display:'flex',gap:'6px'}}>
                                  <button className="iv-edit" onClick={() => { setEditingLot(lot.id); setEditLotPacks(lot.packs_remaining?.toString() ?? ''); setEditLotCost(lot.cost_per_unit?.toString() ?? '') }}>Edit</button>
                                  <button className="iv-del" onClick={() => handleDeleteLot(lot.id)}>×</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isAddingLot ? (
                      <div className="iv-add-lot">
                        <p style={{fontSize:'11px',color:'#52525b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>New purchase lot</p>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                          <div className="iv-field">
                            <label className="iv-label">Boxes bought</label>
                            <input className="iv-input" type="number" min="1" value={lotQty} onChange={e => setLotQty(e.target.value)} />
                          </div>
                          <div className="iv-field">
                            <label className="iv-label">Cost per box (£)</label>
                            <input className="iv-input" type="number" min="0" step="0.01" value={lotCost} onChange={e => setLotCost(e.target.value)} placeholder="0.00" autoFocus />
                          </div>
                          <div className="iv-field">
                            <label className="iv-label">Purchase date</label>
                            <input className="iv-input" type="date" value={lotDate} onChange={e => setLotDate(e.target.value)} />
                          </div>
                          <div className="iv-field">
                            <label className="iv-label">Notes</label>
                            <input className="iv-input" value={lotNotes} onChange={e => setLotNotes(e.target.value)} placeholder="e.g. eBay order" />
                          </div>
                        </div>
                        {lotCost && item.packs_per_box && (
                          <p style={{fontSize:'12px',color:'#f59e0b',marginBottom:'8px'}}>
                            £{(parseFloat(lotCost) / item.packs_per_box).toFixed(2)}/pack · {parseInt(lotQty)||1} boxes = {(parseInt(lotQty)||1) * item.packs_per_box} packs
                          </p>
                        )}
                        <div style={{display:'flex',gap:'8px'}}>
                          <button className="iv-ghost" onClick={() => { setAddingLotFor(null); setLotQty('1'); setLotCost(''); setLotDate(''); setLotNotes('') }}>Cancel</button>
                          <button className="iv-submit" onClick={() => handleAddLot(item.id)} disabled={lotSaving || !lotCost}>{lotSaving ? 'Saving…' : 'Add lot'}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="iv-item-foot">
                        <button className="iv-add-lot-btn" onClick={() => { setAddingLotFor(item.id); setExpandedItems(prev => new Set([...prev, item.id])) }}>+ Add purchase lot</button>
                        <div style={{display:'flex',gap:'8px'}}>
                          <button className="iv-edit" onClick={() => startEdit(item)}>Edit</button>
                          <button className="iv-del" onClick={() => handleDelete(item.id)}>Remove</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
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
        .iv-modal{background:#18181b;border:1px solid rgba(245,158,11,0.25);border-radius:16px;padding:24px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:16px;max-height:90vh;overflow-y:auto}
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
        .iv-form-actions{display:flex;gap:10px;justify-content:flex-end}
        .iv-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 18px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer}
        .iv-submit{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer}
        .iv-submit:disabled{opacity:0.5;cursor:not-allowed}
        .iv-empty{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;color:#52525b}
        .iv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
        .iv-item{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px}
        .iv-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .iv-item-name{font-size:14px;font-weight:500;color:#e4e4e7;margin-bottom:3px}
        .iv-item-set{font-size:11px;color:#52525b}
        .iv-badge{font-size:11px;padding:3px 9px;border-radius:20px;white-space:nowrap;flex-shrink:0}
        .iv-green{background:rgba(74,222,128,0.08);color:#4ade80;border:1px solid rgba(74,222,128,0.18)}
        .iv-amber{background:rgba(245,158,11,0.08);color:#f59e0b;border:1px solid rgba(245,158,11,0.18)}
        .iv-red{background:rgba(248,113,113,0.08);color:#f87171;border:1px solid rgba(248,113,113,0.18)}
        .iv-item-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px 0;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05)}
        .iv-stat-label{font-size:10px;color:#3f3f46;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px}
        .iv-stat-val{font-size:13px;color:#a1a1aa;font-weight:500}
        .iv-lots-toggle{background:none;border:none;color:#52525b;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;text-align:left;padding:0}
        .iv-lots-toggle:hover{color:#a1a1aa}
        .iv-lots{display:flex;flex-direction:column;gap:8px}
        .iv-lot{background:#0e0e0f;border-radius:8px;padding:10px 12px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .iv-add-lot{background:#0e0e0f;border-radius:8px;padding:14px;border:1px solid rgba(245,158,11,0.15)}
        .iv-item-foot{display:flex;align-items:center;justify-content:space-between}
        .iv-add-lot-btn{background:none;border:1px solid rgba(245,158,11,0.25);border-radius:6px;padding:5px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#f59e0b;cursor:pointer}
        .iv-add-lot-btn:hover{border-color:rgba(245,158,11,0.5)}
        .iv-confirm-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:6px;padding:6px 12px;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;cursor:pointer}
        .iv-cancel-btn{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:6px 10px;font-family:'DM Mono',monospace;font-size:12px;color:#71717a;cursor:pointer}
        .iv-edit{background:none;border:1px solid rgba(255,255,255,0.08);color:#71717a;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;padding:4px 8px;border-radius:5px}
        .iv-edit:hover{color:#f4f4f5;border-color:rgba(255,255,255,0.2)}
        .iv-del{background:none;border:none;color:#3f3f46;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;padding:4px 8px;border-radius:5px}
        .iv-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
        @media(max-width:640px){.iv-form-grid{grid-template-columns:1fr 1fr}.iv-modal{max-width:100%;margin:0}}
      `}</style>
    </div>
  )
}
