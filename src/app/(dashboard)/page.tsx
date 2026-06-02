'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Tour from './tour'

export default function DashboardPage() {
  const router = useRouter()
  const chartRef = useRef<any>(null)
  const chartInstance = useRef<any>(null)
  const [streams, setStreams] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTour, setShowTour] = useState(false)
  const [insights, setInsights] = useState<any[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.replace('/login'); return }
      const [{ data: st }, { data: sa }, { data: inv }] = await Promise.all([
        supabase.from('streams').select('*').eq('user_id', user.id).order('stream_date', { ascending: true }),
        supabase.from('sales').select('*').eq('user_id', user.id),
        supabase.from('inventory_items').select('*').eq('user_id', user.id),
      ])
      setStreams(st ?? [])
      setSales(sa ?? [])
      setInventory(inv ?? [])
      setLoading(false)
      const tourDone = localStorage.getItem('ripos_tour_done')
      if (!tourDone) setTimeout(() => setShowTour(true), 600)

      // Fetch AI insights
      if ((st ?? []).length > 0 || (sa ?? []).length > 0) {
        setInsightsLoading(true)
        fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streams: st ?? [], sales: sa ?? [], inventory: inv ?? [] })
        })
          .then(r => r.json())
          .then(d => { setInsights(d.insights ?? []); setInsightsLoading(false) })
          .catch(() => setInsightsLoading(false))
      }
    }
    load()
  }, [])

  const totalRevenue = streams.reduce((a, s) => a + (s.revenue ?? 0), 0)
  const totalCost = streams.reduce((a, s) => a + (s.inventory_cost ?? 0), 0)
  const totalProfit = totalRevenue - totalCost
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'
  const vatReclaimable = streams.reduce((a, s) => a + (s.vat_reclaimable ?? 0), 0)
  const avgPerStream = streams.length > 0 ? totalRevenue / streams.length : 0
  const totalSalesRevenue = sales.reduce((a, s) => a + (s.sale_amount ?? 0), 0)
  const lowStock = inventory.filter(i => (i.quantity ?? 0) <= 2).length

  const buyerMap = new Map<string, { count: number; total: number }>()
  for (const s of sales) {
    if (!s.buyer_name) continue
    const existing = buyerMap.get(s.buyer_name) ?? { count: 0, total: 0 }
    buyerMap.set(s.buyer_name, { count: existing.count + 1, total: existing.total + (s.sale_amount ?? 0) })
  }
  const topBuyers = Array.from(buyerMap.entries())
    .map(([name, { count, total }]) => ({ name, count, total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxCount = topBuyers[0]?.count ?? 1
  const chartStreams = streams.slice(-8)

  useEffect(() => {
    if (loading || chartStreams.length === 0) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.onload = () => {
      if (!chartRef.current) return
      if (chartInstance.current) chartInstance.current.destroy()
      const Chart = (window as any).Chart
      chartInstance.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels: chartStreams.map(s => s.stream_date ? new Date(s.stream_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'),
          datasets: [
            { label: 'Revenue', data: chartStreams.map(s => s.revenue ?? 0), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4, borderSkipped: false },
            { label: 'Profit', data: chartStreams.map(s => (s.revenue ?? 0) - (s.inventory_cost ?? 0)), backgroundColor: 'rgba(74,222,128,0.6)', borderRadius: 4, borderSkipped: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => '£' + ctx.parsed.y.toFixed(2) } } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#52525b', font: { size: 10, family: 'DM Mono' }, autoSkip: false, maxRotation: 0 } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#52525b', font: { size: 10, family: 'DM Mono' }, callback: (v: any) => '£' + v }, border: { display: false } }
          }
        }
      })
    }
    document.head.appendChild(script)
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null } }
  }, [loading, streams.length])

  const initials = (name: string) => name.slice(0, 2).toUpperCase()
  const insightIcon = (type: string) => type === 'performance' ? '📊' : type === 'buyer' ? '👥' : type === 'inventory' ? '📦' : '💡'

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0e0e0f',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#f59e0b',fontFamily:'DM Mono,monospace',fontSize:'14px'}}>Loading...</div>
    </div>
  )

  return (
    <div className="dash">
      {showTour && <Tour onComplete={() => setShowTour(false)} />}

      <div className="dash-header">
        <div>
          <div className="dash-logo">Rip<em>OS</em></div>
          <h1 className="dash-title">Dashboard</h1>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <Link href="/streams/import" className="dash-import" id="tour-import">↑ Import CSV</Link>
          <Link href="/streams/new" className="dash-cta" id="tour-new-stream">+ New stream</Link><button className="dash-signout" onClick={async()=>{const {createClient}=await import("@/lib/supabase/client");const sb=createClient();sb.auth.signOut().then(()=>{ window.location.href="/login" })}}>Sign out</button>
        </div>
      </div>

      <div className="dash-stats" id="tour-stats">
        <div className="dash-stat">
          <p className="dash-stat-label">Total turnover</p>
          <p className="dash-stat-val">£{totalRevenue.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          <p className="dash-stat-sub">{streams.length} streams</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-label">Total profit</p>
          <p className="dash-stat-val" style={{color:totalProfit>=0?'#4ade80':'#f87171'}}>£{totalProfit.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          <p className="dash-stat-sub" style={{color:parseFloat(avgMargin)>=20?'#4ade80':'#f59e0b'}}>{avgMargin}% margin</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-label">Avg per stream</p>
          <p className="dash-stat-val dash-amber">£{avgPerStream.toFixed(2)}</p>
          <p className="dash-stat-sub">revenue</p>
        </div>
        {vatReclaimable > 0 && (
          <div className="dash-stat">
            <p className="dash-stat-label">VAT reclaimable</p>
            <p className="dash-stat-val dash-blue">£{vatReclaimable.toFixed(2)}</p>
            <p className="dash-stat-sub">on purchases</p>
          </div>
        )}
      </div>

      {(insightsLoading || insights.length > 0) && (
        <div className="dash-card dash-insights-card">
          <div className="dash-card-head">
            <span className="dash-card-title">AI insights</span>
            
          </div>
          {insightsLoading ? (
            <div className="dash-insight-loading">
              <div className="dash-insight-spinner" />
              <span>Analysing your business...</span>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column'}}>
              {insights.map((insight: any, i: number) => (
                <div key={i} className="dash-insight-row">
                  <span className="dash-insight-icon">{insightIcon(insight.type)}</span>
                  <div>
                    <p className="dash-insight-headline">{insight.headline}</p>
                    <p className="dash-insight-detail">{insight.detail}</p><div className="dash-insight-actions">{insight.type === "buyer" && <a href="/sales" className="dash-insight-btn">View sales →</a>}{insight.type === "performance" && <a href="/streams/new" className="dash-insight-btn">Log a stream →</a>}{insight.type === "inventory" && <a href="/inventory" className="dash-insight-btn">View inventory →</a>}{insight.type === "opportunity" && <a href="/streams/new" className="dash-insight-btn">Take action →</a>}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {chartStreams.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-head">
            <span className="dash-card-title">Revenue vs profit</span>
            <div style={{display:'flex',gap:14,fontSize:'11px',color:'#52525b'}}>
              <span><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'rgba(245,158,11,0.7)',marginRight:5}}></span>Revenue</span>
              <span><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'rgba(74,222,128,0.6)',marginRight:5}}></span>Profit</span>
            </div>
          </div>
          <div style={{padding:'0 16px 16px'}}>
            <div style={{position:'relative',width:'100%',height:'160px'}}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </div>
      )}

      <div className="dash-grid2">
        <div className="dash-card">
          <div className="dash-card-head">
            <span className="dash-card-title">Recent streams</span>
            <Link href="/streams" className="dash-link">View all →</Link>
          </div>
          {streams.length === 0 ? (
            <div className="dash-empty"><p>No streams yet.</p><Link href="/streams/new" className="dash-cta-sm">Log your first →</Link></div>
          ) : (
            <div style={{display:'flex',flexDirection:'column'}}>
              {[...streams].reverse().slice(0, 5).map(s => {
                const profit = (s.revenue ?? 0) - (s.inventory_cost ?? 0)
                return (
                  <div key={s.id} className="dash-stream-row">
                    <span className="dash-stream-name">{s.title}</span>
                    <span className="dash-stream-profit" style={{color:s.revenue?(profit>=0?'#4ade80':'#f87171'):'#52525b'}}>
                      {s.revenue ? '£' + profit.toFixed(2) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dash-card" id="tour-buyers">
          <div className="dash-card-head">
            <span className="dash-card-title">Top buyers</span>
            <Link href="/sales" className="dash-link">View all →</Link>
          </div>
          {topBuyers.length === 0 ? (
            <div className="dash-empty"><p>No sales yet.</p></div>
          ) : (
            <div style={{display:'flex',flexDirection:'column'}}>
              {topBuyers.map((b, i) => (
                <div key={b.name} className="dash-buyer-row">
                  <span className={`dash-buyer-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                  <div className="dash-avatar">{initials(b.name)}</div>
                  <span className="dash-buyer-name">{b.name}</span>
                  <div className="dash-bar-wrap"><div className="dash-bar-fill" style={{width:`${(b.count/maxCount)*100}%`}}></div></div>
                  <span className="dash-buyer-count">{b.count}x</span>
                  <span className="dash-buyer-total">£{b.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dash-nav">
        <Link href="/streams" className="dash-nav-item">
          <span className="dash-nav-label">Streams</span>
          <span className="dash-nav-sub">{streams.length} streams</span>
        </Link>
        <Link href="/inventory" className="dash-nav-item">
          <span className="dash-nav-label">Inventory</span>
          <span className="dash-nav-sub" style={{color:lowStock>0?'#f59e0b':'#3f3f46'}}>{inventory.length} items{lowStock > 0 ? ` · ${lowStock} low` : ''}</span>
        </Link>
        <Link href="/sales" className="dash-nav-item">
          <span className="dash-nav-label">Sales</span>
          <span className="dash-nav-sub">{sales.length} sales · £{totalSalesRevenue.toFixed(0)}</span>
        </Link>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .dash{max-width:960px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:18px;position:relative}
        .dash-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .dash-logo{font-size:16px;font-weight:500;color:#f4f4f5;margin-bottom:4px}
        .dash-logo em{font-style:normal;color:#f59e0b}
        .dash-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5}
        .dash-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap}
        .dash-import{background:none;border:1px solid rgba(245,158,11,0.3);color:#f59e0b;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;font-family:'DM Mono',monospace}
        .dash-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
        .dash-stat{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px}
        .dash-stat-label{font-size:10px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .dash-stat-val{font-size:22px;font-weight:500;color:#f4f4f5;margin-bottom:3px}
        .dash-stat-sub{font-size:11px;color:#52525b}
        .dash-amber{color:#f59e0b}
        .dash-blue{color:#60a5fa}
        .dash-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .dash-card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .dash-card-title{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .dash-link{font-size:11px;color:#f59e0b;text-decoration:none}
        .dash-empty{padding:32px;text-align:center;color:#52525b;display:flex;flex-direction:column;align-items:center;gap:10px}
        .dash-cta-sm{color:#f59e0b;text-decoration:none;font-size:12px}
        .dash-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .dash-stream-row{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.04)}
        .dash-stream-row:last-child{border-bottom:none}
        .dash-stream-name{font-size:12px;color:#d4d4d8;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}
        .dash-stream-profit{font-size:12px;font-weight:500;flex-shrink:0}
        .dash-buyer-row{display:flex;align-items:center;gap:9px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04)}
        .dash-buyer-row:last-child{border-bottom:none}
        .dash-buyer-rank{font-size:11px;color:#3f3f46;width:14px;flex-shrink:0}
        .dash-buyer-rank.top{color:#f59e0b;font-weight:500}
        .dash-avatar{width:26px;height:26px;border-radius:50%;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center;font-size:9px;color:#f59e0b;font-weight:500;flex-shrink:0}
        .dash-buyer-name{font-size:11px;color:#d4d4d8;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dash-bar-wrap{width:40px;height:3px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;flex-shrink:0}
        .dash-bar-fill{height:100%;background:#f59e0b;border-radius:99px}
        .dash-buyer-count{font-size:10px;color:#52525b;width:20px;text-align:right;flex-shrink:0}
        .dash-buyer-total{font-size:11px;color:#f4f4f5;font-weight:500;width:44px;text-align:right;flex-shrink:0}
        .dash-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .dash-nav-item{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;text-decoration:none;display:flex;flex-direction:column;gap:4px}
        .dash-nav-item:hover{border-color:rgba(255,255,255,0.15)}
        .dash-nav-label{font-size:13px;color:#a1a1aa}
        .dash-nav-sub{font-size:11px;color:#3f3f46}.dash-signout{background:none;border:none;color:#3f3f46;font-size:12px;cursor:pointer;font-family:"DM Mono",monospace;padding:9px 0}.dash-signout:hover{color:#f87171}
        .dash-insights-card{border-color:rgba(245,158,11,0.25)}
        .dash-insight-badge{font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:2px 8px}
        .dash-insight-loading{display:flex;align-items:center;gap:10px;padding:16px;font-size:13px;color:#52525b}
        .dash-insight-spinner{width:16px;height:16px;border:2px solid rgba(245,158,11,0.2);border-top-color:#f59e0b;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .dash-insight-row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.04)}
        .dash-insight-row:last-child{border-bottom:none}
        .dash-insight-icon{font-size:18px;flex-shrink:0;margin-top:1px}
        .dash-insight-headline{font-size:13px;color:#f4f4f5;font-weight:500;margin-bottom:3px}
        .dash-insight-detail{font-size:12px;color:#a1a1aa;line-height:1.5;margin-bottom:8px}.dash-insight-actions{margin-top:4px}.dash-insight-btn{font-size:11px;color:#f59e0b;text-decoration:none;border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:4px 10px;font-family:"DM Mono",monospace}.dash-insight-btn:hover{background:rgba(245,158,11,0.08)}
        @media(max-width:640px){.dash-grid2{grid-template-columns:1fr}.dash-stats{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  )
}
