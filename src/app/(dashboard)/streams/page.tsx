import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StreamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: streams } = await supabase.from('streams').select('*').eq('user_id', user.id).order('stream_date', { ascending: false })
  const all = streams ?? []
  const totalRevenue = all.reduce((a,s) => a+(s.revenue??0), 0)
  const totalProfit = all.reduce((a,s) => a+(s.revenue??0)-(s.inventory_cost??0), 0)
  return (
    <div className="sl">
      <div className="sl-header">
        <div>
          <Link href="/" className="sl-back">← Dashboard</Link>
          <h1 className="sl-title">Streams</h1>
          <p className="sl-sub">{all.length} streams · £{totalRevenue.toLocaleString()} revenue · £{totalProfit.toLocaleString()} profit</p>
        </div>
        <Link href="/streams/new" className="sl-cta">+ New stream</Link>
      </div>
      {all.length === 0 ? (
        <div className="sl-empty"><p>No streams yet.</p><Link href="/streams/new" className="sl-cta">Log your first stream</Link></div>
      ) : (
        <div className="sl-card">
          <table className="sl-table">
            <thead><tr><th>Stream</th><th>Platform</th><th>Date</th><th>Revenue</th><th>Profit</th><th>Margin</th></tr></thead>
            <tbody>
              {all.map(s => {
                const profit = (s.revenue??0)-(s.inventory_cost??0)
                const margin = s.revenue&&s.revenue>0 ? ((profit/s.revenue)*100).toFixed(1)+'%' : '—'
                return (
                  <tr key={s.id}>
                    <td><span className="sl-name">{s.title}</span></td>
                    <td>{s.platform??'—'}</td>
                    <td className="sl-muted">{s.stream_date??'—'}</td>
                    <td>{s.revenue?'£'+s.revenue:'—'}</td>
                    <td style={{color:s.revenue?(profit>=0?'#4ade80':'#f87171'):'#52525b'}}>{s.revenue?'£'+profit:'—'}</td>
                    <td style={{color:profit>=0?'#4ade80':'#f59e0b'}}>{margin}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .sl{max-width:1000px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .sl-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .sl-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .sl-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .sl-sub{font-size:13px;color:#52525b}
        .sl-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap}
        .sl-empty{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;color:#52525b}
        .sl-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:auto}
        .sl-table{width:100%;border-collapse:collapse;font-size:13px;min-width:500px}
        .sl-table th{text-align:left;padding:12px 18px;color:#52525b;font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.06)}
        .sl-table td{padding:13px 18px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04)}
        .sl-table tr:last-child td{border-bottom:none}
        .sl-table tr:hover td{background:rgba(255,255,255,0.015)}
        .sl-name{color:#d4d4d8;font-weight:500}
        .sl-muted{color:#52525b}
      `}</style>
    </div>
  )
}
