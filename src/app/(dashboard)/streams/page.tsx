'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PLATFORMS = ['Whatnot','eBay','TikTok Live','YouTube','Instagram','In-person','Other']

export default function StreamsPage() {
  const [streams, setStreams] = useState<any[]>([])
  const [editId, setEditId] = useState<string|null>(null)
  const [editData, setEditData] = useState<any>({})

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

  const startEdit = (s: any) => {
    setEditId(s.id)
    setEditData({ title: s.title, stream_date: s.stream_date, platform: s.platform, revenue: s.revenue, inventory_cost: s.inventory_cost, notes: s.notes })
  }

  const saveEdit = async (id: string) => {
    const supabase = createClient()
    const updated = { ...editData, revenue: parseFloat(editData.revenue)||null, inventory_cost: parseFloat(editData.inventory_cost)||null }
    setStreams(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
    await supabase.from('streams').update(updated).eq('id', id)
    setEditId(null)
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
            <thead><tr><th>Stream</th><th>Platform</th><th>Date</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th><th></th></tr></thead>
            <tbody>
              {streams.map(s => {
                const profit = (s.revenue??0)-(s.inventory_cost??0)
                const margin = s.revenue&&s.revenue>0 ? ((profit/s.revenue)*100).toFixed(1)+'%' : '—'
                const isEditing = editId === s.id
                return (
                  <tr key={s.id} className={isEditing ? 'editing' : ''}>
                    <td>
                      {isEditing
                        ? <input className="sl-input" value={editData.title} onChange={e=>setEditData({...editData,title:e.target.value})} />
                        : <><span className="sl-name">{s.title}</span>{s.notes&&<span className="sl-note">{s.notes.slice(0,50)}</span>}</>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sl-input" value={editData.platform} onChange={e=>setEditData({...editData,platform:e.target.value})}>
                            {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                          </select>
                        : s.platform??'—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="sl-input" type="date" value={editData.stream_date??''} onChange={e=>setEditData({...editData,stream_date:e.target.value})} />
                        : <span className="sl-muted">{s.stream_date??'—'}</span>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="sl-input sl-input-sm" type="number" value={editData.revenue??''} onChange={e=>setEditData({...editData,revenue:e.target.value})} placeholder="0" />
                        : s.revenue?'£'+s.revenue:'—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="sl-input sl-input-sm" type="number" value={editData.inventory_cost??''} onChange={e=>setEditData({...editData,inventory_cost:e.target.value})} placeholder="0" />
                        : <span className="sl-muted">{s.inventory_cost?'£'+s.inventory_cost:'—'}</span>
                      }
                    </td>
                    <td style={{color:s.revenue?(profit>=0?'#4ade80':'#f87171'):'#52525b'}}>{s.revenue?'£'+profit:'—'}</td>
                    <td style={{color:profit>=0?'#4ade80':'#f59e0b'}}>{margin}</td>
                    <td>
                      <div className="sl-actions">
                        {isEditing
                          ? <>
                              <button className="sl-save" onClick={()=>saveEdit(s.id)}>Save</button>
                              <button className="sl-cancel" onClick={()=>setEditId(null)}>✕</button>
                            </>
                          : <>
                              <button className="sl-edit" onClick={()=>startEdit(s)}>Edit</button>
                              <button className="sl-del" onClick={()=>handleDelete(s.id)}>✕</button>
                            </>
                        }
                      </div>
                    </td>
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
        .sl{max-width:1100px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:20px}
        .sl-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .sl-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .sl-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .sl-sub{font-size:13px;color:#52525b}
        .sl-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap}
        .sl-empty{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;color:#52525b}
        .sl-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:auto}
        .sl-table{width:100%;border-collapse:collapse;font-size:13px;min-width:700px}
        .sl-table th{text-align:left;padding:12px 14px;color:#52525b;font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.06)}
        .sl-table td{padding:10px 14px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .sl-table tr:last-child td{border-bottom:none}
        .sl-table tr:hover td{background:rgba(255,255,255,0.015)}
        .sl-table tr.editing td{background:rgba(245,158,11,0.04)}
        .sl-name{color:#d4d4d8;font-weight:500;display:block;margin-bottom:2px}
        .sl-note{font-size:11px;color:#3f3f46;display:block}
        .sl-muted{color:#52525b}
        .sl-input{background:#0e0e0f;border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:5px 8px;font-family:'DM Mono',monospace;font-size:12px;color:#f4f4f5;outline:none;width:100%;min-width:80px}
        .sl-input-sm{min-width:60px;max-width:90px}
        .sl-actions{display:flex;gap:6px;align-items:center}
        .sl-edit{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#71717a;font-size:11px;padding:3px 10px;cursor:pointer;font-family:'DM Mono',monospace}
        .sl-edit:hover{color:#d4d4d8;border-color:rgba(255,255,255,0.2)}
        .sl-save{background:#f59e0b;border:none;border-radius:6px;color:#0e0e0f;font-size:11px;padding:3px 10px;cursor:pointer;font-family:'DM Mono',monospace;font-weight:500}
        .sl-cancel{background:none;border:none;color:#52525b;font-size:12px;cursor:pointer;padding:3px 6px;font-family:'DM Mono',monospace}
        .sl-del{background:none;border:none;color:#3f3f46;font-size:12px;cursor:pointer;padding:3px 6px;border-radius:4px;font-family:'DM Mono',monospace}
        .sl-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
      `}</style>
    </div>
  )
}
