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
  const [releases, setReleases] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [storeName, setStoreName] = useState('')
  const [showTour, setShowTour] = useState(false)
  const [statModal, setStatModal] = useState<string|null>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const onboarded = localStorage.getItem('ripos_onboarded')
      if (!onboarded) { router.push('/onboarding'); return }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.replace('/landing'); return }
      const [{ data: st }, { data: sa }, { data: inv }] = await Promise.all([
        supabase.from('streams').select('*').eq('user_id', user.id).order('stream_date', { ascending: true }),
        supabase.from('sales').select('*').eq('user_id', user.id),
        supabase.from('inventory_items').select('*').eq('user_id', user.id),
      ])
      setStreams(st ?? [])
      const { data: releaseData } = await supabase
        .from('release_calendar')
        .select('*')
        .gte('release_date', new Date().toISOString().split('T')[0])
        .order('release_date', { ascending: true })
        .limit(5)
      setReleases(releaseData ?? [])
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

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? '')
        const { data: p } = await supabase.from('user_profiles').select('store_name').eq('user_id', user.id).single()
        if (p?.store_name) setStoreName(p.store_name)
      }
    }
    loadUser()
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
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
  const maxCount = topBuyers[0]?.total ?? 1
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

  if (loading) return null

  return (
    <div className="dash">
      {showTour && <Tour onComplete={() => setShowTour(false)} />}

      <div className="dash-header">
        <div>
          <img src="/logo.png" style={{height:"28px",width:"auto"}} alt="RipOS"/>
          <h1 className="dash-title">Dashboard</h1>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <Link href="/streams/import" className="dash-import" id="tour-import">↑ Import CSV</Link>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <Link href="/streams/new" className="dash-cta" id="tour-new-stream">+ New stream</Link>
          <div style={{position:'relative'}}>
            <button className="dash-avatar" onClick={() => setShowMenu(v => !v)}>
              {(storeName || userEmail).slice(0,2).toUpperCase()}
            </button>
            {showMenu && (
              <>
                <div style={{position:'fixed',inset:0,zIndex:40}} onClick={() => setShowMenu(false)} />
                <div className="dash-menu">
                  <p className="dash-menu-email">{storeName || userEmail}</p>
                  <Link href="/settings" className="dash-menu-item" onClick={() => setShowMenu(false)}>⚙ Settings</Link>
                  <Link href="/streams" className="dash-menu-item" onClick={() => setShowMenu(false)}>↗ Streams</Link>
                  <Link href="/inventory" className="dash-menu-item" onClick={() => setShowMenu(false)}>↗ Inventory</Link>
                  <Link href="/buyers" className="dash-menu-item" onClick={() => setShowMenu(false)}>↗ Buyers</Link>
                  <button className="dash-menu-signout" onClick={async()=>{const {createClient}=await import("@/lib/supabase/client");const sb=createClient();await sb.auth.signOut();window.location.href="/login"}}>Sign out</button>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>

      <div className="dash-stats" id="tour-stats">
        <div className="dash-stat" onClick={()=>setStatModal('turnover')} style={{cursor:'pointer'}}>
          <p className="dash-stat-label">Total turnover</p>
          <p className="dash-stat-val">£{totalRevenue.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          <p className="dash-stat-sub">{streams.length} streams</p>
        </div>
        <div className="dash-stat" onClick={()=>setStatModal('profit')} style={{cursor:'pointer'}}>
          <p className="dash-stat-label">Total profit</p>
          <p className="dash-stat-val" style={{color:totalProfit>=0?'#4ade80':'#f87171'}}>£{totalProfit.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          <p className="dash-stat-sub" style={{color:parseFloat(avgMargin)>=20?'#4ade80':'#f59e0b'}}>{avgMargin}% margin</p>
        </div>
        <div className="dash-stat" onClick={()=>setStatModal('avg')} style={{cursor:'pointer'}}>
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

      {statModal && (() => {
        const sorted = [...streams].sort((a,b) => new Date(a.stream_date||0).getTime() - new Date(b.stream_date||0).getTime())
        const titles: Record<string,string> = { turnover: 'Total Turnover', profit: 'Total Profit', avg: 'Avg Per Stream' }
        const colors: Record<string,string> = { turnover: '#f59e0b', profit: '#4ade80', avg: '#f59e0b' }
        let cumRev = 0, cumProfit = 0
        const points = sorted.map((s, i) => {
          cumRev += (s.revenue ?? 0)
          cumProfit += (s.revenue ?? 0) - (s.inventory_cost ?? 0)
          const val = statModal === 'turnover' ? cumRev : statModal === 'profit' ? cumProfit : cumRev / (i + 1)
          return { label: s.stream_date ? new Date(s.stream_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Stream '+(i+1), value: val }
        })
        const maxVal = Math.max(...points.map(p => p.value), 1)
        const minVal = Math.min(...points.map(p => p.value), 0)
        const range = maxVal - minVal || 1
        const w = 560, h = 200, px = 40, py = 20
        const chartW = w - px * 2, chartH = h - py * 2
        const pathD = points.map((p, i) => {
          const x = px + (points.length > 1 ? (i / (points.length - 1)) * chartW : chartW / 2)
          const y = py + chartH - ((p.value - minVal) / range) * chartH
          return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
        }).join(' ')
        const areaD = pathD + ' L' + (px + chartW).toFixed(1) + ',' + (py + chartH) + ' L' + px + ',' + (py + chartH) + ' Z'
        const color = colors[statModal] || '#f59e0b'

        return (
          <div onClick={()=>setStatModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'16px'}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#18181b',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'20px',width:'100%',maxWidth:'640px',maxHeight:'90vh',overflow:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <p style={{fontSize:'13px',color:'#f4f4f5',fontWeight:500,fontFamily:'DM Mono,monospace'}}>{titles[statModal]}</p>
                <button onClick={()=>setStatModal(null)} style={{background:'none',border:'none',color:'#71717a',fontSize:'18px',cursor:'pointer',padding:'4px'}}>✕</button>
              </div>
              <div style={{overflowX:'auto'}}>
                <svg viewBox={"0 0 "+w+" "+h} style={{width:'100%',height:'auto',minWidth:'300px'}}>
                  <defs>
                    <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
                    </linearGradient>
                  </defs>
                  {[0,0.25,0.5,0.75,1].map((f,i) => {
                    const y = py + chartH * (1-f)
                    const val = minVal + range * f
                    return <g key={i}><line x1={px} x2={px+chartW} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" /><text x={px-4} y={y+3} textAnchor="end" fill="#52525b" fontSize="9" fontFamily="DM Mono,monospace">£{val.toFixed(0)}</text></g>
                  })}
                  <path d={areaD} fill="url(#statGrad)" />
                  <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p,i) => {
                    const x = px + (points.length > 1 ? (i / (points.length - 1)) * chartW : chartW / 2)
                    const y = py + chartH - ((p.value - minVal) / range) * chartH
                    return <g key={i}>
                      <circle cx={x} cy={y} r="4" fill="#18181b" stroke={color} strokeWidth="2"/>
                      {points.length <= 12 && <text x={x} y={py+chartH+14} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="DM Mono,monospace">{p.label}</text>}
                    </g>
                  })}
                </svg>
              </div>
              <p style={{fontSize:'11px',color:'#52525b',marginTop:'12px',textAlign:'center'}}>{statModal === 'avg' ? 'Running average per stream' : 'Cumulative over time'} · {points.length} streams</p>
            </div>
          </div>
        )
      })()}

      {streams.length === 0 && (
        <div className="dash-onboard-banner">
          <div className="dash-onboard-left">
            <p className="dash-onboard-title">You're 60 seconds away from seeing your true profit</p>
            <p className="dash-onboard-sub">Import your Whatnot CSV to instantly see revenue, profit and margin across all your streams.</p>
          </div>
          <Link href="/streams/import" className="dash-onboard-cta">Import CSV →</Link>
        </div>
      )}

      {releases.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-head">
            <span className="dash-card-title">📦 Upcoming releases</span>
          </div>
          <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'8px'}}>
            {releases.map((r:any) => {
              const days = Math.ceil((new Date(r.release_date).getTime() - Date.now()) / (1000*60*60*24))
              const isSoon = days <= 7
              return (
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:'8px'}}>
                  <div>
                    <p style={{fontSize:'13px',color:'#d4d4d8',fontWeight:'500'}}>{r.name}</p>
                    <p style={{fontSize:'11px',color:'#52525b',marginTop:'2px'}}>{r.set_code ? r.set_code+' · ' : ''}{r.category}</p>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:'12px'}}>
                    <p style={{fontSize:'12px',color:'#a1a1aa'}}>{new Date(r.release_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</p>
                    <p style={{fontSize:'11px',fontWeight:'500',color:isSoon?'#f87171':'#f59e0b',marginTop:'2px'}}>{isSoon?'This week!':days+' days'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
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
        .dash{max-width:960px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:18px;position:relative;overflow-x:hidden}
        .dash-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .dash-avatar{width:38px;height:38px;border-radius:50%;background:#18181b;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Mono',monospace}
        .dash-avatar:hover{border-color:rgba(245,158,11,0.4);color:#f59e0b}
        .dash-menu{position:absolute;right:0;top:40px;background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px;width:200px;z-index:50;display:flex;flex-direction:column;gap:2px}
        .dash-menu-email{font-size:11px;color:#52525b;padding:4px 8px 8px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dash-menu-item{display:block;padding:7px 10px;border-radius:6px;font-size:13px;color:#d4d4d8;text-decoration:none;font-family:'DM Mono',monospace}
        .dash-menu-item:hover{background:rgba(255,255,255,0.04);color:#f4f4f5}
        .dash-menu-signout{margin-top:4px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;width:100%;text-align:left;background:none;border:none;padding:7px 10px;border-radius:6px;font-size:13px;color:#f87171;cursor:pointer;font-family:'DM Mono',monospace}
        .dash-menu-signout:hover{background:rgba(248,113,113,0.08)}
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
        .dash-onboard-banner{background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03));border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .dash-onboard-title{font-size:15px;color:#f4f4f5;font-weight:500;margin-bottom:6px}
        .dash-onboard-sub{font-size:13px;color:#71717a;line-height:1.5}
        .dash-onboard-left{flex:1;min-width:200px}
        .dash-onboard-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:10px 20px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;flex-shrink:0}
        .dash-onboard-cta:hover{background:#e08e00}
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
        .dash-insight-row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.04);min-width:0;overflow:hidden}
        .dash-insight-row:last-child{border-bottom:none}
        .dash-insight-icon{font-size:18px;flex-shrink:0;margin-top:1px}
        .dash-insight-text-wrap{min-width:0;flex:1;overflow:hidden}
        .dash-insight-headline{word-break:break-word;overflow-wrap:break-word;font-size:13px;color:#f4f4f5;font-weight:500;margin-bottom:3px}
        .dash-insight-detail{word-break:break-word;overflow-wrap:break-word;font-size:12px;color:#a1a1aa;line-height:1.5;margin-bottom:8px}.dash-insight-actions{margin-top:4px}.dash-insight-btn{font-size:11px;color:#f59e0b;text-decoration:none;border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:4px 10px;font-family:"DM Mono",monospace}.dash-insight-btn:hover{background:rgba(245,158,11,0.08)}
        @media(max-width:640px){.dash-grid2{grid-template-columns:1fr}.dash-stats{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  )
}
