'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type StreamSummary = {
  livestream_id: string
  title: string
  date: string
  revenue: number
  commission: number
  processing: number
  totalFees: number
  sales: { buyer: string; product: string; amount: number }[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [streams, setStreams] = useState<StreamSummary[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [error, setError] = useState('')

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
              revenue: 0, commission: 0, processing: 0, totalFees: 0, sales: []
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
            s.sales.push({ buyer: row.BUYER_NAME || '—', product: row.LISTING_TITLE || '—', amount: itemPrice })
          }
        }
        const result = Array.from(streamMap.values())
          .map(s => ({ ...s, totalFees: s.commission + s.processing }))
          .filter(s => s.revenue > 0)
          .sort((a, b) => a.date.localeCompare(b.date))
        setStreams(result)
        setTotalRevenue(result.reduce((a, s) => a + s.revenue, 0))
      } catch {
        setError('Could not read this file. Make sure it\'s a Whatnot earnings CSV.')
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

  const handleImport = async () => {
    setImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    let count = 0
    for (const s of streams) {
      const { data: stream } = await supabase.from('streams').insert({
        user_id: user.id, title: s.title, stream_date: s.date || null,
        platform: 'Whatnot', revenue: s.revenue || null,
        inventory_cost: s.totalFees || null,
        notes: `Imported · Commission: £${s.commission.toFixed(2)}, Processing: £${s.processing.toFixed(2)}`
      }).select().single()
      if (stream) {
        count++
        if (s.sales.length > 0) {
          await supabase.from('sales').insert(
            s.sales.map(sale => ({
              user_id: user.id, stream_id: stream.id,
              buyer_name: sale.buyer, product_description: sale.product,
              sale_amount: sale.amount, platform: 'Whatnot',
              payment_status: 'paid', shipping_status: 'pending'
            }))
          )
        }
      }
    }
    setImportCount(count)
    setImporting(false)
    setImported(true)
  }

  const finish = () => {
    localStorage.setItem('ripos_onboarded', 'true')
    router.push('/')
  }

  const skip = () => {
    localStorage.setItem('ripos_onboarded', 'true')
    router.push('/')
  }

  return (
    <div className="ob">
      <div className="ob-bg"><div className="ob-grid"/><div className="ob-glow"/></div>
      <div className="ob-wrap">

        {/* Step indicators */}
        <div className="ob-steps">
          {[1,2,3].map(n => (
            <div key={n} className={`ob-step ${step >= n ? 'active' : ''} ${step > n ? 'done' : ''}`}>
              <div className="ob-step-dot">{step > n ? '✓' : n}</div>
              {n < 3 && <div className="ob-step-line"/>}
            </div>
          ))}
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="ob-card ob-fade">
            <div className="ob-logo-wrap">
              <div className="ob-logo-mark">R</div>
              <span className="ob-logo-text">Rip<em>OS</em></span>
            </div>
            <h1 className="ob-headline">Welcome to RipOS</h1>
            <p className="ob-sub">The business dashboard built for card breakers. Know your true profit, track your inventory, and understand your business — not just your Whatnot earnings.</p>
            <div className="ob-features">
              <div className="ob-feature"><span className="ob-feature-icon">📊</span><div><p className="ob-feature-title">True profit tracking</p><p className="ob-feature-desc">See what you actually made after fees, VAT, and stock costs</p></div></div>
              <div className="ob-feature"><span className="ob-feature-icon">📦</span><div><p className="ob-feature-title">Inventory management</p><p className="ob-feature-desc">Track stock levels and cost per box instantly</p></div></div>
              <div className="ob-feature"><span className="ob-feature-icon">⚡</span><div><p className="ob-feature-title">Whatnot CSV import</p><p className="ob-feature-desc">Pull in all your streams and sales in one click</p></div></div>
            </div>
            <button className="ob-btn" onClick={() => setStep(2)}>Get started →</button>
            <button className="ob-skip" onClick={skip}>Skip setup</button>
          </div>
        )}

        {/* Step 2 — Import CSV */}
        {step === 2 && (
          <div className="ob-card ob-fade">
            <div className="ob-step-header">
              <span className="ob-step-label">Step 1 of 2</span>
              <h2 className="ob-step-title">Import your Whatnot data</h2>
              <p className="ob-step-sub">Upload your earnings CSV and we'll automatically create your streams and sales history. Takes 30 seconds.</p>
            </div>

            <div className="ob-how">
              <p className="ob-how-title">How to export from Whatnot:</p>
              <div className="ob-how-steps">
                <span>1. Go to <strong>whatnot.com</strong> on desktop</span>
                <span>2. Seller Hub → <strong>Financials → Ledger</strong></span>
                <span>3. Click <strong>Export Data</strong> → Download CSV</span>
              </div>
            </div>

            {streams.length === 0 ? (
              <div className="ob-drop" onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={() => document.getElementById('ob-file')?.click()}>
                <input id="ob-file" type="file" accept=".csv,text/csv,text/plain,*/*" onChange={handleInput} style={{display:'none'}} />
                <div className="ob-drop-icon">↑</div>
                <p className="ob-drop-title">Drop your CSV here</p>
                <p className="ob-drop-sub">or tap to browse files</p>
                {error && <p className="ob-error">{error}</p>}
              </div>
            ) : (
              <div className="ob-preview">
                <div className="ob-preview-head">
                  <span className="ob-preview-label">Found {streams.length} streams · £{totalRevenue.toFixed(0)} total revenue</span>
                  <button className="ob-preview-clear" onClick={() => { setStreams([]); setFileName('') }}>Clear</button>
                </div>
                {streams.slice(0, 3).map(s => (
                  <div key={s.livestream_id} className="ob-preview-row">
                    <span className="ob-preview-title">{s.title}</span>
                    <span className="ob-preview-rev">£{s.revenue.toFixed(0)}</span>
                  </div>
                ))}
                {streams.length > 3 && <p className="ob-preview-more">+{streams.length - 3} more streams</p>}
              </div>
            )}

            <div className="ob-actions">
              <button className="ob-btn-ghost" onClick={skip}>Skip for now</button>
              {streams.length > 0 ? (
                <button className="ob-btn" disabled={importing} onClick={handleImport}>
                  {importing ? 'Importing…' : `Import ${streams.length} streams →`}
                </button>
              ) : (
                <button className="ob-btn" onClick={() => setStep(3)}>Skip this step →</button>
              )}
            </div>
            {imported && (
              <div className="ob-imported">✓ {importCount} streams imported! <button className="ob-btn-inline" onClick={() => setStep(3)}>Continue →</button></div>
            )}
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="ob-card ob-fade">
            <div className="ob-done-icon">✦</div>
            <h2 className="ob-done-title">You're all set!</h2>
            {importCount > 0 ? (
              <>
                <p className="ob-done-sub">We imported <strong>{importCount} streams</strong> with <strong>£{totalRevenue.toFixed(0)}</strong> in revenue. Your dashboard is ready.</p>
                <div className="ob-done-stats">
                  <div className="ob-done-stat"><p className="ob-done-stat-label">Streams imported</p><p className="ob-done-stat-val">{importCount}</p></div>
                  <div className="ob-done-stat"><p className="ob-done-stat-label">Total revenue</p><p className="ob-done-stat-val">£{totalRevenue.toFixed(0)}</p></div>
                  <div className="ob-done-stat"><p className="ob-done-stat-label">Avg per stream</p><p className="ob-done-stat-val">£{(totalRevenue / importCount).toFixed(0)}</p></div>
                </div>
              </>
            ) : (
              <p className="ob-done-sub">Your RipOS account is ready. Start by adding your inventory or logging your first stream.</p>
            )}
            <p className="ob-done-tip">💡 Tip: Use <strong>⚡ Quick add</strong> in Inventory next time you buy stock — it calculates your cost per box automatically.</p>
            <button className="ob-btn ob-btn-lg" onClick={finish}>Go to dashboard →</button>
          </div>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;font-family:'DM Mono',monospace}
        .ob{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
        .ob-bg{position:absolute;inset:0;pointer-events:none}
        .ob-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:48px 48px}
        .ob-glow{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:700px;height:500px;background:radial-gradient(ellipse at center,rgba(245,158,11,0.08) 0%,transparent 70%)}
        .ob-wrap{position:relative;z-index:1;width:100%;max-width:480px;display:flex;flex-direction:column;align-items:center;gap:24px}
        .ob-steps{display:flex;align-items:center;gap:0}
        .ob-step{display:flex;align-items:center}
        .ob-step-dot{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;color:#52525b;background:#18181b}
        .ob-step.active .ob-step-dot{border-color:rgba(245,158,11,0.5);color:#f59e0b;background:rgba(245,158,11,0.1)}
        .ob-step.done .ob-step-dot{border-color:rgba(74,222,128,0.4);color:#4ade80;background:rgba(74,222,128,0.1)}
        .ob-step-line{width:48px;height:1px;background:rgba(255,255,255,0.08);margin:0 4px}
        .ob-card{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;width:100%;display:flex;flex-direction:column;gap:20px}
        .ob-fade{animation:obfade 0.3s ease both}
        @keyframes obfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ob-logo-wrap{display:flex;align-items:center;gap:10px}
        .ob-logo-mark{width:36px;height:36px;background:#f59e0b;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:20px;color:#0e0e0f;font-weight:700}
        .ob-logo-text{font-size:18px;font-weight:500;color:#f4f4f5}
        .ob-logo-text em{font-style:normal;color:#f59e0b}
        .ob-headline{font-family:'DM Serif Display',serif;font-size:28px;font-weight:400;color:#f4f4f5;line-height:1.2}
        .ob-sub{font-size:13px;color:#71717a;line-height:1.7}
        .ob-features{display:flex;flex-direction:column;gap:14px}
        .ob-feature{display:flex;align-items:flex-start;gap:12px}
        .ob-feature-icon{font-size:20px;flex-shrink:0;margin-top:1px}
        .ob-feature-title{font-size:13px;color:#e4e4e7;font-weight:500;margin-bottom:2px}
        .ob-feature-desc{font-size:12px;color:#52525b}
        .ob-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:10px;padding:12px 20px;font-family:'DM Mono',monospace;font-size:14px;font-weight:500;cursor:pointer;width:100%}
        .ob-btn:hover{background:#d97706}
        .ob-btn:disabled{opacity:0.5;cursor:not-allowed}
        .ob-btn-lg{padding:14px 20px;font-size:15px}
        .ob-btn-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 20px;font-family:'DM Mono',monospace;font-size:14px;color:#71717a;cursor:pointer;flex:1}
        .ob-skip{background:none;border:none;color:#3f3f46;font-size:12px;cursor:pointer;font-family:'DM Mono',monospace;align-self:center}
        .ob-step-header{display:flex;flex-direction:column;gap:6px}
        .ob-step-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .ob-step-title{font-family:'DM Serif Display',serif;font-size:22px;font-weight:400;color:#f4f4f5}
        .ob-step-sub{font-size:13px;color:#71717a;line-height:1.6}
        .ob-how{background:#0e0e0f;border-radius:10px;padding:14px}
        .ob-how-title{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px}
        .ob-how-steps{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#71717a}
        .ob-how-steps strong{color:#a1a1aa}
        .ob-drop{background:#0e0e0f;border:2px dashed rgba(245,158,11,0.25);border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px}
        .ob-drop:hover{border-color:rgba(245,158,11,0.5)}
        .ob-drop-icon{font-size:24px;color:#f59e0b;width:48px;height:48px;border:1px solid rgba(245,158,11,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center}
        .ob-drop-title{font-size:14px;color:#f4f4f5;font-weight:500}
        .ob-drop-sub{font-size:12px;color:#52525b}
        .ob-error{font-size:12px;color:#f87171}
        .ob-preview{background:#0e0e0f;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px}
        .ob-preview-head{display:flex;align-items:center;justify-content:space-between}
        .ob-preview-label{font-size:12px;color:#4ade80}
        .ob-preview-clear{background:none;border:none;color:#52525b;font-size:11px;cursor:pointer;font-family:'DM Mono',monospace}
        .ob-preview-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .ob-preview-row:last-of-type{border-bottom:none}
        .ob-preview-title{font-size:12px;color:#d4d4d8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px}
        .ob-preview-rev{font-size:12px;color:#f59e0b;font-weight:500;flex-shrink:0}
        .ob-preview-more{font-size:11px;color:#52525b;text-align:center;padding-top:4px}
        .ob-actions{display:flex;gap:10px}
        .ob-imported{font-size:13px;color:#4ade80;display:flex;align-items:center;gap:10px;justify-content:center}
        .ob-btn-inline{background:none;border:none;color:#f59e0b;font-size:13px;cursor:pointer;font-family:'DM Mono',monospace;text-decoration:underline}
        .ob-done-icon{font-size:36px;color:#f59e0b;text-align:center}
        .ob-done-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;text-align:center}
        .ob-done-sub{font-size:13px;color:#71717a;line-height:1.7;text-align:center}
        .ob-done-sub strong{color:#a1a1aa}
        .ob-done-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .ob-done-stat{background:#0e0e0f;border-radius:8px;padding:12px;text-align:center}
        .ob-done-stat-label{font-size:10px;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px}
        .ob-done-stat-val{font-size:18px;font-weight:500;color:#f59e0b}
        .ob-done-tip{font-size:12px;color:#52525b;background:#0e0e0f;border-radius:8px;padding:12px;line-height:1.6}
        .ob-done-tip strong{color:#a1a1aa}
      `}</style>
    </div>
  )
}
