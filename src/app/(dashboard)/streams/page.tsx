'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function StreamsPage() {
  const [streams, setStreams] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('streams').select('*').order('stream_date', { ascending: false })
      setStreams(data ?? [])
    }
    load()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stream?')) return
    const supabase = createClient()
    setStreams(prev => prev.filter(s => s.id !== id))
    await supabase.from('streams').delete().eq('id', id)
  }

  const totalRevenue = streams.reduce((a,s) => a+(s.revenue??0), 0)
  const totalProfit = streams.reduce((a,s) => a+(s.revenue??0)-(s.inventory_cost??0), 0)

  return (
    <div className="sl">
      <div className="sl-header">
        <div>
          <Link href="/" className="sl-back">← Dashboard</Link>
          <h1 className="sl-title">Streams</h1>
          <p className="sl-sub">{streams.length} streams · £{totalRevenue.toLocaleString()} revenue · £{totalProfit.toLocaleString()} profit</p>
        </div>
        <Link href="/streams/new" className="sl-cta">+ New stream</Link>
      </div>
      {streams.length === 0 ? (
        <div className="sl-empty"><p>No streams yet.</p><Link href="/streams/new" className="sl-cta">Log your first stream</Link></div>
      ) : (
        <div className="sl-card">
          <table className="sl-table">
            <thead><tr><th>Stream</th><th>Platform</th><th>Date</th><th>Revenue</th><th>Profit</th><th>Margin</th><th></th></tr></thead>
            <tbody>
              {streams.map(s => {
                const profit = (s.revenue??0)-(s.inventory_cost??0)
                const margin = s.revenue&&s.revenue>0 ? ((profit/s.revenue)*100).toFixed(1)+'%' : '—'
                return (
                  <tr key={s.id}>
                    <td><span className="sl-name">{s.title}</span>{s.notes&&<span className="sl-note">{s.notes.slice(0,50)}</span>}</td>
                    <td>{s.platform??'—'}</td>
                    <td className="sl-muted">{s.stream_date??'—'}</td>
                    <td>{s.revenue?'£'+s.revenue:'—'}</td>
                    <td style={{color:s.revenue?(profit>=0?'#4ade80':'#f87171'):'#52525b'}}>{s.revenue?'£'+profit:'—'}</td>
                    <td style={{color:profit>=0?'#4ade80':'#f59e0b'}}>{margin}</td>
                    <td><button className="sl-del" onClick={()=>handleDelete(s.id)}>✕</button></td>
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
        .sl-name{color:#d4d4d8;font-weight:500;display:block;margin-bottom:2px}
        .sl-note{font-size:11px;color:#3f3f46;display:block}
        .sl-muted{color:#52525b}
        .sl-del{background:none;border:none;color:#3f3f46;font-size:12px;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:'DM Mono',monospace}
        .sl-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
      `}</style>
    </div>
  )
}
