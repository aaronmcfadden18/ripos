import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: streams } = await supabase
    .from('streams')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const allStreams = streams ?? []
  const totalRevenue = allStreams.reduce((a, s) => a + (s.revenue ?? 0), 0)
  const totalCost = allStreams.reduce((a, s) => a + (s.inventory_cost ?? 0), 0)
  const totalProfit = totalRevenue - totalCost

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <div className="dash-logo">Rip<em>OS</em></div>
          <h1 className="dash-greeting">Dashboard</h1>
        </div>
        <Link href="/streams/new" className="dash-cta">+ New stream</Link>
      </div>
      <div className="dash-stats">
        <div className="dash-stat">
          <p className="dash-stat-label">Total revenue</p>
          <p className="dash-stat-value">£{totalRevenue.toLocaleString('en-GB', {minimumFractionDigits:0})}</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-label">Total profit</p>
          <p className="dash-stat-value" style={{color: totalProfit >= 0 ? '#4ade80' : '#f87171'}}>£{totalProfit.toLocaleString('en-GB', {minimumFractionDigits:0})}</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-label">Streams</p>
          <p className="dash-stat-value">{allStreams.length}</p>
        </div>
      </div>
      <div className="dash-card">
        <div className="dash-card-head">
          <h2 className="dash-card-title">Recent streams</h2>
          <Link href="/streams" className="dash-link">View all →</Link>
        </div>
        {allStreams.length === 0 ? (
          <div className="dash-empty">
            <p>No streams yet.</p>
            <Link href="/streams/new" className="dash-cta-sm">Log your first stream →</Link>
          </div>
        ) : (
          <table className="dash-table">
            <thead><tr><th>Stream</th><th>Revenue</th><th>Profit</th></tr></thead>
            <tbody>
              {allStreams.slice(0,5).map(s => {
                const profit = (s.revenue ?? 0) - (s.inventory_cost ?? 0)
                return (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td>{s.revenue ? '£'+s.revenue : '—'}</td>
                    <td style={{color: profit >= 0 ? '#4ade80' : '#f87171'}}>{s.revenue ? '£'+profit : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="dash-nav">
        <Link href="/streams" className="dash-nav-item">◉ Streams</Link>
        <Link href="/inventory" className="dash-nav-item">◫ Inventory</Link>
        <Link href="/sales" className="dash-nav-item">◈ Sales</Link>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .dash{max-width:900px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
        .dash-logo{font-size:18px;font-weight:500;color:#f4f4f5;margin-bottom:8px}
        .dash-logo em{font-style:normal;color:#f59e0b}
        .dash-greeting{font-family:'DM Serif Display',serif;font-size:28px;font-weight:400;color:#f4f4f5}
        .dash-header{display:flex;align-items:flex-start;justify-content:space-between}
        .dash-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none}
        .dash-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .dash-stat{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px 20px}
        .dash-stat-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px}
        .dash-stat-value{font-family:'DM Serif Display',serif;font-size:28px;color:#f4f4f5}
        .dash-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .dash-card-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .dash-card-title{font-size:13px;color:#a1a1aa}
        .dash-link{font-size:12px;color:#f59e0b;text-decoration:none}
        .dash-empty{padding:40px;text-align:center;color:#52525b;display:flex;flex-direction:column;align-items:center;gap:12px}
        .dash-cta-sm{color:#f59e0b;text-decoration:none;font-size:13px}
        .dash-table{width:100%;border-collapse:collapse;font-size:13px}
        .dash-table th{text-align:left;padding:10px 20px;color:#52525b;font-weight:400;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.05)}
        .dash-table td{padding:12px 20px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04)}
        .dash-nav{display:flex;gap:12px}
        .dash-nav-item{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 20px;color:#71717a;text-decoration:none;font-size:13px;flex:1;text-align:center}
        .dash-nav-item:hover{color:#d4d4d8}
      `}</style>
    </div>
  )
}
