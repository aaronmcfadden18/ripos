'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function BuyerPage() {
  const { name } = useParams()
  const buyerName = decodeURIComponent(name as string)
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('sales')
        .select('*, streams(title, stream_date, platform)')
        .eq('buyer_name', buyerName)
        .order('created_at', { ascending: false })
      setSales(data ?? [])
      setLoading(false)
    }
    load()
  }, [buyerName])

  if (loading) return <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#f59e0b',fontFamily:'DM Mono,monospace',fontSize:'14px'}}>Loading...</div></div>

  const totalSpend = sales.reduce((a, s) => a + (s.sale_amount ?? 0), 0)
  const avgOrder = sales.length > 0 ? totalSpend / sales.length : 0
  const unpaid = sales.filter(s => s.payment_status === 'unpaid').length
  const streams = [...new Set(sales.map(s => s.stream_id).filter(Boolean))]
  const products = sales.reduce((acc: any, s) => {
    if (!s.product_description) return acc
    acc[s.product_description] = (acc[s.product_description] || 0) + 1
    return acc
  }, {})
  const topProducts = Object.entries(products).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="bp">
      <Link href="/sales" className="bp-back">← Sales</Link>
      <div className="bp-header">
        <div className="bp-avatar">{buyerName.slice(0,2).toUpperCase()}</div>
        <div>
          <h1 className="bp-name">{buyerName}</h1>
          <p className="bp-sub">{sales.length} purchases across {streams.length} stream{streams.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bp-stats">
        <div className="bp-stat">
          <p className="bp-stat-label">Total spent</p>
          <p className="bp-stat-val bp-amber">£{totalSpend.toFixed(2)}</p>
        </div>
        <div className="bp-stat">
          <p className="bp-stat-label">Purchases</p>
          <p className="bp-stat-val">{sales.length}</p>
        </div>
        <div className="bp-stat">
          <p className="bp-stat-label">Avg order</p>
          <p className="bp-stat-val">£{avgOrder.toFixed(2)}</p>
        </div>
        <div className="bp-stat">
          <p className="bp-stat-label">Unpaid</p>
          <p className="bp-stat-val" style={{color: unpaid > 0 ? '#f87171' : '#4ade80'}}>{unpaid}</p>
        </div>
      </div>

      <div className="bp-grid">
        {topProducts.length > 0 && (
          <div className="bp-card">
            <h2 className="bp-card-title">Favourite products</h2>
            <div className="bp-products">
              {topProducts.map(([product, count]: any) => (
                <div key={product} className="bp-product-row">
                  <span className="bp-product-name">{product}</span>
                  <span className="bp-product-count">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bp-card">
          <h2 className="bp-card-title">Streams attended</h2>
          <div className="bp-streams">
            {[...new Map(sales.filter(s => s.streams).map(s => [s.stream_id, s.streams])).values()].map((stream: any, i) => (
              <div key={i} className="bp-stream-row">
                <span className="bp-stream-name">{stream.title?.slice(0, 35)}{stream.title?.length > 35 ? '…' : ''}</span>
                <span className="bp-stream-date">{stream.stream_date ? new Date(stream.stream_date).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '—'}</span>
              </div>
            ))}
            {streams.length === 0 && <p className="bp-empty">No linked streams</p>}
          </div>
        </div>
      </div>

      <div className="bp-card">
        <h2 className="bp-card-title">Purchase history ({sales.length})</h2>
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead><tr><th>Product</th><th>Amount</th><th>Payment</th><th>Shipping</th><th>Stream</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td className="bp-product-cell">{s.product_description || '—'}</td>
                  <td className="bp-amount-cell">{s.sale_amount ? '£'+s.sale_amount : '—'}</td>
                  <td><span style={{color: s.payment_status === 'paid' ? '#4ade80' : '#f87171', fontSize:'12px'}}>{s.payment_status || '—'}</span></td>
                  <td><span style={{color: s.shipping_status === 'delivered' ? '#4ade80' : s.shipping_status === 'shipped' ? '#a78bfa' : '#f59e0b', fontSize:'12px'}}>{s.shipping_status || '—'}</span></td>
                  <td className="bp-stream-cell">{s.streams?.title?.slice(0,30) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .bp{max-width:1000px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .bp-back{font-size:12px;color:#f59e0b;text-decoration:none}
        .bp-header{display:flex;align-items:center;gap:16px}
        .bp-avatar{width:52px;height:52px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#f59e0b;flex-shrink:0}
        .bp-name{font-family:'DM Serif Display',serif;font-size:28px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .bp-sub{font-size:13px;color:#52525b}
        .bp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .bp-stat{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px 18px}
        .bp-stat-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .bp-stat-val{font-family:'DM Serif Display',serif;font-size:24px;color:#f4f4f5}
        .bp-amber{color:#f59e0b!important}
        .bp-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .bp-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
        .bp-card-title{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .bp-products{display:flex;flex-direction:column;gap:8px}
        .bp-product-row{display:flex;justify-content:space-between;font-size:13px}
        .bp-product-name{color:#d4d4d8}
        .bp-product-count{color:#f59e0b;font-weight:500}
        .bp-streams{display:flex;flex-direction:column;gap:8px}
        .bp-stream-row{display:flex;justify-content:space-between;font-size:13px}
        .bp-stream-name{color:#d4d4d8}
        .bp-stream-date{color:#52525b}
        .bp-empty{font-size:13px;color:#3f3f46}
        .bp-table-wrap{overflow:auto}
        .bp-table{width:100%;border-collapse:collapse;font-size:13px;min-width:500px}
        .bp-table th{text-align:left;padding:10px 12px;color:#52525b;font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.06)}
        .bp-table td{padding:10px 12px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04)}
        .bp-table tr:last-child td{border-bottom:none}
        .bp-product-cell{color:#d4d4d8}
        .bp-amount-cell{font-weight:500;color:#f4f4f5}
        .bp-stream-cell{font-size:12px;color:#71717a}
        @media(max-width:640px){.bp-stats{grid-template-columns:1fr 1fr}.bp-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
