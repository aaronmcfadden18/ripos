'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type StreamSummary = {
  livestream_id: string
  title: string
  date: string
  revenue: number
  commission: number
  processing: number
  totalFees: number
  netEarnings: number
  sales: { buyer: string; product: string; amount: number; qty: number }[]
}

export default function ImportPage() {
  const router = useRouter()
  const [streams, setStreams] = useState<StreamSummary[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].replace(/"/g, '').split(',')
    return lines.slice(1).map(line => {
      const values: string[] = []
      let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { values.push(cur); cur = '' }
        else cur += ch
      }
      values.push(cur)
      return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]))
    })
  }

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSV(text)
        const streamMap = new Map<string, StreamSummary>()
        for (const row of rows) {
          if (row.TRANSACTION_TYPE !== 'ORDER_EARNINGS') continue
          const id = row.LIVESTREAM_ID
          if (!id) continue
          if (!streamMap.has(id)) {
            streamMap.set(id, {
              livestream_id: id,
              title: row.LIVESTREAM_TITLE || 'Untitled Stream',
              date: row.ORDER_PLACED_AT_UTC?.slice(0, 10) || '',
              revenue: 0, commission: 0, processing: 0, totalFees: 0, netEarnings: 0, sales: []
            })
          }
          const s = streamMap.get(id)!
          const amt = parseFloat(row.TRANSACTION_AMOUNT) || 0
          const comm = parseFloat(row.COMMISSION_FEE) || 0
          const proc = parseFloat(row.PAYMENT_PROCESSING_FEE) || 0
          const itemPrice = parseFloat(row.ORIGINAL_ITEM_PRICE) || 0
          if (amt > 0) s.revenue += amt
          s.commission += comm
          s.processing += proc
          if (row.BUY_FORMAT === 'BUY_IT_NOW' && itemPrice > 0) {
            s.sales.push({ buyer: row.BUYER_NAME || '—', product: row.LISTING_TITLE || '—', amount: itemPrice, qty: parseInt(row.QUANTITY_SOLD) || 1 })
          }
        }
        const result = Array.from(streamMap.values()).map(s => ({
          ...s, totalFees: s.commission + s.processing, netEarnings: s.revenue - s.commission - s.processing
        })).filter(s => s.revenue > 0).sort((a, b) => a.date.localeCompare(b.date))
        setStreams(result)
        setSelected(new Set(result.map(s => s.livestream_id)))
      } catch {
        setError('Could not parse this CSV. Make sure it\'s a Whatnot earnings export.')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const toggleStream = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const toImport = streams.filter(s => selected.has(s.livestream_id))
    let successCount = 0
    for (const s of toImport) {
      const { data: stream, error: err } = await supabase.from('streams').insert({
        user_id: user.id, title: s.title, stream_date: s.date || null, platform: 'Whatnot',
        revenue: s.revenue || null, inventory_cost: s.totalFees || null,
        notes: `Imported from Whatnot CSV. Commission: £${s.commission.toFixed(2)}, Processing: £${s.processing.toFixed(2)}`
      }).select().single()
      if (err) continue
      successCount++
      if (stream && s.sales.length > 0) {
        await supabase.from('sales').insert(
          s.sales.map(sale => ({
            user_id: user.id, stream_id: stream.id, buyer_name: sale.buyer,
            product_description: sale.product, sale_amount: sale.amount,
            platform: 'Whatnot', payment_status: 'paid', shipping_status: 'pending'
          }))
        )
      }
    }
    setImporting(false)
    if (successCount > 0) { setImported(true); setTimeout(() => router.push('/streams'), 1500) }
    else setError('No streams were imported. They may already exist.')
  }

  return (
    <div className="imp">
      <div className="imp-header">
        <Link href="/streams" className="imp-back">← Streams</Link>
        <h1 className="imp-title">Import from Whatnot</h1>
        <p className="imp-sub">Upload your Whatnot earnings CSV to auto-create streams and sales</p>
      </div>
      {imported ? (
        <div className="imp-success">
          <div className="imp-success-icon">✓</div>
          <p className="imp-success-text">Streams imported successfully! Redirecting…</p>
        </div>
      ) : streams.length === 0 ? (
        <div className="imp-drop" onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={()=>document.getElementById('imp-file')?.click()}>
          <input id="imp-file" type="file" accept=".csv" onChange={handleInput} style={{display:'none'}} />
          <div className="imp-drop-icon">↑</div>
          <p className="imp-drop-title">Drop your Whatnot CSV here</p>
          <p className="imp-drop-sub">or click to browse · earnings export only</p>
          {fileName && <p className="imp-drop-file">{fileName}</p>}
          {error && <p className="imp-error">{error}</p>}
        </div>
      ) : (
        <>
          <div className="imp-toolbar">
            <p className="imp-found">{streams.length} streams found in <strong>{fileName}</strong></p>
            <div style={{display:'flex',gap:8}}>
              <button className="imp-ghost" onClick={()=>setSelected(new Set(streams.map(s=>s.livestream_id)))}>Select all</button>
              <button className="imp-ghost" onClick={()=>setSelected(new Set())}>Deselect all</button>
            </div>
          </div>
          <div className="imp-list">
            {streams.map(s => {
              const isSel = selected.has(s.livestream_id)
              return (
                <div key={s.livestream_id} className={`imp-item ${isSel?'sel':''}`} onClick={()=>toggleStream(s.livestream_id)}>
                  <div className="imp-check">{isSel?'✓':''}</div>
                  <div className="imp-item-body">
                    <div className="imp-item-top">
                      <span className="imp-item-title">{s.title}</span>
                      <span className="imp-item-date">{s.date}</span>
                    </div>
                    <div className="imp-item-stats">
                      <span className="imp-item-stat"><span className="imp-stat-label">Revenue</span> £{s.revenue.toFixed(2)}</span>
                      <span className="imp-item-stat"><span className="imp-stat-label">Fees</span> £{s.totalFees.toFixed(2)}</span>
                      <span className="imp-item-stat" style={{color:s.netEarnings>=0?'#4ade80':'#f87171'}}><span className="imp-stat-label">Net</span> £{s.netEarnings.toFixed(2)}</span>
                      <span className="imp-item-stat"><span className="imp-stat-label">Sales</span> {s.sales.length}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {error && <p className="imp-error">{error}</p>}
          <div className="imp-actions">
            <button className="imp-ghost" onClick={()=>{setStreams([]);setFileName('');setSelected(new Set())}}>Upload different file</button>
            <button className="imp-submit" disabled={importing||selected.size===0} onClick={handleImport}>
              {importing ? 'Importing…' : `Import ${selected.size} stream${selected.size!==1?'s':''}`}
            </button>
          </div>
        </>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .imp{max-width:800px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .imp-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .imp-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .imp-sub{font-size:13px;color:#52525b}
        .imp-drop{background:#18181b;border:2px dashed rgba(245,158,11,0.3);border-radius:16px;padding:60px 24px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:12px}
        .imp-drop:hover{border-color:rgba(245,158,11,0.6)}
        .imp-drop-icon{font-size:32px;color:#f59e0b;width:56px;height:56px;border:2px solid rgba(245,158,11,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center}
        .imp-drop-title{font-size:16px;color:#f4f4f5;font-weight:500}
        .imp-drop-sub{font-size:12px;color:#52525b}
        .imp-drop-file{font-size:12px;color:#f59e0b}
        .imp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .imp-found{font-size:13px;color:#71717a}
        .imp-found strong{color:#f4f4f5}
        .imp-list{display:flex;flex-direction:column;gap:8px}
        .imp-item{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:14px}
        .imp-item:hover{border-color:rgba(255,255,255,0.15)}
        .imp-item.sel{border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.03)}
        .imp-check{width:20px;height:20px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:11px;color:#f59e0b;flex-shrink:0}
        .imp-item.sel .imp-check{border-color:rgba(245,158,11,0.5);background:rgba(245,158,11,0.1)}
        .imp-item-body{flex:1;display:flex;flex-direction:column;gap:8px}
        .imp-item-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .imp-item-title{font-size:13px;color:#e4e4e7;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .imp-item-date{font-size:11px;color:#52525b;flex-shrink:0}
        .imp-item-stats{display:flex;gap:16px;flex-wrap:wrap}
        .imp-item-stat{font-size:12px;color:#a1a1aa;display:flex;gap:5px;align-items:center}
        .imp-stat-label{font-size:10px;color:#3f3f46;text-transform:uppercase;letter-spacing:0.05em}
        .imp-error{font-size:12px;color:#f87171;padding:10px 14px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);border-radius:8px}
        .imp-actions{display:flex;gap:10px;justify-content:flex-end}
        .imp-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 18px;font-family:'DM Mono',monospace;font-size:13px;color:#71717a;cursor:pointer}
        .imp-ghost:hover{color:#f4f4f5}
        .imp-submit{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer}
        .imp-submit:disabled{opacity:0.5;cursor:not-allowed}
        .imp-success{background:#18181b;border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px}
        .imp-success-icon{font-size:32px;color:#4ade80;width:56px;height:56px;border:2px solid rgba(74,222,128,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center}
        .imp-success-text{font-size:14px;color:#4ade80}
      `}</style>
    </div>
  )
}
