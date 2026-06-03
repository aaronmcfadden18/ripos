'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function StreamDetailPage() {
  const { id } = useParams()
  const [stream, setStream] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [{ data: s }, { data: sa }] = await Promise.all([
        supabase.from('streams').select('*').eq('id', id).single(),
        supabase.from('sales').select('*').eq('stream_id', id).order('created_at', { ascending: false })
      ])
      setStream(s)
      setSales(sa ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#f59e0b',fontFamily:'DM Mono,monospace',fontSize:'14px'}}>Loading...</div></div>
  if (!stream) return <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#f87171',fontFamily:'DM Mono,monospace'}}>Stream not found</div></div>

  const profit = (stream.revenue ?? 0) - (stream.inventory_cost ?? 0)
  const margin = stream.revenue > 0 ? ((profit / stream.revenue) * 100).toFixed(1) : '0'
  const feeAmount = stream.inventory_cost && stream.revenue ? (stream.revenue * 0.08).toFixed(2) : null
  const topBuyers = sales.reduce((acc: any, s) => {
    if (!s.buyer_name) return acc
    acc[s.buyer_name] = (acc[s.buyer_name] || 0) + (s.sale_amount || 0)
    return acc
  }, {})
  const sortedBuyers = Object.entries(topBuyers).sort((a: any, b: any) => b[1] - a[1])

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
          <p className="sd-stat-val sd-muted">{stream.inventory_cost ? '£'+stream.inventory_cost.toLocaleString() : '—'}</p>
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
            <div className="sd-brow sd-deduct"><span>Inventory cost</span><span>− £{((stream.inventory_cost??0)).toFixed(2)}</span></div>
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
                  <span className="sd-buyer-name">{name}</span>
                  <span className="sd-buyer-amt">£{total.toFixed(2)}</span>
                </div>
              ))}
            </div>
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
                    <td className="sd-buyer-cell">{s.buyer_name||'—'}</td>
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
          <Link href="/sales" className="sd-link">Log sales →</Link>
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
        .sd-buyer-name{color:#d4d4d8}
        .sd-buyer-amt{color:#f4f4f5;font-weight:500}
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
