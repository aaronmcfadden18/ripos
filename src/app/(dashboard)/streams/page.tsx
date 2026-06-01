'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PLATFORMS = ['All','Whatnot','eBay','TikTok Live','YouTube','Instagram','In-person','Other']

export default function StreamsPage() {
  const [streams, setStreams] = useState<any[]>([])
  const [editId, setEditId] = useState<string|null>(null)
  const [editData, setEditData] = useState<any>({})
  const [platformFilter, setPlatformFilter] = useState('All')
  const [expanded, setExpanded] = useState<string|null>(null)

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

  const filtered = platformFilter === 'All' ? streams : streams.filter(s => s.platform === platformFilter)

  const totalRevenue = filtered.reduce((a,s) => a+(s.revenue??0), 0)
  const totalCost = filtered.reduce((a,s) => a+(s.inventory_cost??0), 0)
  const totalProfit = totalRevenue - totalCost
  const totalVat = filtered.reduce((a,s) => a+(s.vat_reclaimable??0), 0)
  const avgMargin = totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : '0'
  const bestStream = filtered.reduce((best, s) => {
    const p = (s.revenue??0)-(s.inventory_cost??0)
    return p > ((best?.revenue??0)-(best?.inventory_cost??0)) ? s : best
  }, null as any)

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
  }

  return (
    <div className="sl">
      <div className="sl-header">
        <div>
          <Link href="/" className="sl-back">← Dashboard</Link>
          <h1 className="sl-title">Streams</h1>
          <p className="sl-sub">{filtered.length} streams</p>
        </div>
        <div style={{display:"flex",gap:"10px"}}><Link href="/streams/import" className="sl-import">↑ Import CSV</Link><Link href="/streams/new" className="sl-cta">+ New stream</Link></div>
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="sl-stats">
          <div className="sl-stat">
            <p className="sl-stat-label">Total revenue</p>
            <p className="sl-stat-val">£{totalRevenue.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          </div>
          <div className="sl-stat">
            <p className="sl-stat-label">Total cost</p>
            <p className="sl-stat-val sl-muted">£{totalCost.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          </div>
          <div className="sl-stat">
            <p className="sl-stat-label">Total profit</p>
            <p className="sl-stat-val" style={{color:totalProfit>=0?'#4ade80':'#f87171'}}>£{totalProfit.toLocaleString('en-GB',{minimumFractionDigits:0})}</p>
          </div>
          <div className="sl-stat">
            <p className="sl-stat-label">Avg margin</p>
            <p className="sl-stat-val" style={{color:parseFloat(avgMargin)>=20?'#4ade80':parseFloat(avgMargin)>=10?'#f59e0b':'#f87171'}}>{avgMargin}%</p>
          </div>
          {totalVat > 0 && (
            <div className="sl-stat">
              <p className="sl-stat-label">VAT reclaimable</p>
              <p className="sl-stat-val sl-blue">£{totalVat.toFixed(2)}</p>
            </div>
          )}
          {bestStream && (
            <div className="sl-stat sl-stat-best">
              <p className="sl-stat-label">Best stream</p>
              <p className="sl-stat-val sl-amber">{bestStream.title?.slice(0,24)}{bestStream.title?.length>24?'…':''}</p>
            </div>
          )}
        </div>
      )}

      {/* Platform filter */}
      <div className="sl-filters">
        {PLATFORMS.map(p => (
          <button key={p} className={`sl-filter-btn ${platformFilter===p?'active':''}`} onClick={()=>setPlatformFilter(p)}>{p}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sl-empty"><p>{platformFilter==='All'?'No streams yet.':'No streams on '+platformFilter+'.'}</p>{platformFilter==='All'&&<Link href="/streams/new" className="sl-cta">Log your first stream</Link>}</div>
      ) : (
        <div className="sl-card">
          <table className="sl-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Platform</th>
                <th>Date</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Margin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const profit = (s.revenue??0)-(s.inventory_cost??0)
                const margin = s.revenue&&s.revenue>0 ? (profit/s.revenue)*100 : null
                const isEditing = editId === s.id
                const isExpanded = expanded === s.id
                return (
                  <>
                  <tr key={s.id} className={isEditing ? 'editing' : ''}>
                    <td>
                      {isEditing
                        ? <input className="sl-input" value={editData.title} onChange={e=>setEditData({...editData,title:e.target.value})} />
                        : <div>
                            <span className="sl-name">{s.title}</span>
                            {s.notes&&<span className="sl-note">{s.notes.slice(0,50)}</span>}
                          </div>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sl-input" value={editData.platform} onChange={e=>setEditData({...editData,platform:e.target.value})}>
                            {PLATFORMS.filter(p=>p!=='All').map(p=><option key={p}>{p}</option>)}
                          </select>
                        : <span className="sl-platform-tag">{s.platform??'—'}</span>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="sl-input" type="date" value={editData.stream_date??''} onChange={e=>setEditData({...editData,stream_date:e.target.value})} />
                        : <span className="sl-muted">{formatDate(s.stream_date)}</span>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="sl-input sl-input-sm" type="number" value={editData.revenue??''} onChange={e=>setEditData({...editData,revenue:e.target.value})} placeholder="0" />
                        : <span className="sl-revenue">{s.revenue?'£'+Number(s.revenue).toLocaleString('en-GB'):'—'}</span>
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="sl-input sl-input-sm" type="number" value={editData.inventory_cost??''} onChange={e=>setEditData({...editData,inventory_cost:e.target.value})} placeholder="0" />
                        : <span className="sl-muted">{s.inventory_cost?'£'+Number(s.inventory_cost).toLocaleString('en-GB'):'—'}</span>
                      }
                    </td>
                    <td>
                      <span style={{color:s.revenue?(profit>=0?'#4ade80':'#f87171'):'#52525b',fontWeight:500}}>
                        {s.revenue?'£'+profit.toLocaleString('en-GB'):'—'}
                      </span>
                    </td>
                    <td>
                      {margin !== null ? (
                        <div className="sl-margin-wrap">
                          <span style={{color:margin>=20?'#4ade80':margin>=10?'#f59e0b':'#f87171',fontSize:'12px'}}>{margin.toFixed(1)}%</span>
                          <div className="sl-margin-track">
                            <div className="sl-margin-fill" style={{width:`${Math.min(Math.abs(margin),100)}%`,background:margin>=20?'#4ade80':margin>=10?'#f59e0b':'#f87171'}}/>
                          </div>
                        </div>
                      ) : <span className="sl-muted">—</span>}
                    </td>
                    <td>
                      <div className="sl-actions">
                        {isEditing ? (
                          <>
                            <button className="sl-save" onClick={()=>saveEdit(s.id)}>Save</button>
                            <button className="sl-cancel" onClick={()=>setEditId(null)}>✕</button>
                          </>
                        ) : (
                          <>
                            <button className="sl-expand" onClick={()=>setExpanded(isExpanded?null:s.id)}>{isExpanded?'▲':'▼'}</button>
                            <button className="sl-edit" onClick={()=>startEdit(s)}>Edit</button>
                            <button className="sl-del" onClick={()=>handleDelete(s.id)}>✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={s.id+'-expand'} className="sl-expand-row">
                      <td colSpan={8}>
                        <div className="sl-expand-body">
                          <div className="sl-expand-grid">
                            <div className="sl-expand-stat">
                              <p className="sl-expand-label">Revenue</p>
                              <p className="sl-expand-val">£{Number(s.revenue??0).toFixed(2)}</p>
                            </div>
                            <div className="sl-expand-stat">
                              <p className="sl-expand-label">Inventory cost</p>
                              <p className="sl-expand-val sl-muted">− £{Number(s.inventory_cost??0).toFixed(2)}</p>
                            </div>
                            <div className="sl-expand-stat">
                              <p className="sl-expand-label">Net profit</p>
                              <p className="sl-expand-val" style={{color:profit>=0?'#4ade80':'#f87171'}}>£{profit.toFixed(2)}</p>
                            </div>
                            {s.vat_reclaimable && (
                              <div className="sl-expand-stat">
                                <p className="sl-expand-label">VAT reclaimable</p>
                                <p className="sl-expand-val sl-blue">+ £{Number(s.vat_reclaimable).toFixed(2)}</p>
                              </div>
                            )}
                            {margin !== null && (
                              <div className="sl-expand-stat">
                                <p className="sl-expand-label">Margin</p>
                                <p className="sl-expand-val" style={{color:margin>=20?'#4ade80':margin>=10?'#f59e0b':'#f87171'}}>{margin.toFixed(1)}%</p>
                              </div>
                            )}
                          </div>
                          {s.notes && <p className="sl-expand-notes">📝 {s.notes}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
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
        .sl-import{background:none;border:1px solid rgba(245,158,11,0.3);color:#f59e0b;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;font-family:"DM Mono",monospace}.sl-import:hover{background:rgba(245,158,11,0.08)}.sl-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;border:none;cursor:pointer;font-family:'DM Mono',monospace}
        .sl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
        .sl-stat{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px}
        .sl-stat-best{border-color:rgba(245,158,11,0.2)}
        .sl-stat-label{font-size:10px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
        .sl-stat-val{font-size:20px;font-weight:500;color:#f4f4f5}
        .sl-amber{color:#f59e0b}
        .sl-blue{color:#60a5fa}
        .sl-filters{display:flex;gap:6px;flex-wrap:wrap}
        .sl-filter-btn{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:5px 12px;font-family:'DM Mono',monospace;font-size:11px;color:#52525b;cursor:pointer}
        .sl-filter-btn.active{background:rgba(245,158,11,0.1);border-color:rgba(245,158,11,0.3);color:#f59e0b}
        .sl-empty{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:60px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;color:#52525b}
        .sl-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:auto}
        .sl-table{width:100%;border-collapse:collapse;font-size:13px;min-width:700px}
        .sl-table th{text-align:left;padding:12px 14px;color:#52525b;font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.06)}
        .sl-table td{padding:10px 14px;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .sl-table tr:last-child td{border-bottom:none}
        .sl-table tr:hover td{background:rgba(255,255,255,0.015)}
        .sl-table tr.editing td{background:rgba(245,158,11,0.04)}
        .sl-expand-row td{background:rgba(255,255,255,0.02);padding:0}
        .sl-expand-body{padding:16px 14px;display:flex;flex-direction:column;gap:12px}
        .sl-expand-grid{display:flex;gap:24px;flex-wrap:wrap}
        .sl-expand-stat{display:flex;flex-direction:column;gap:3px}
        .sl-expand-label{font-size:10px;color:#52525b;text-transform:uppercase;letter-spacing:0.05em}
        .sl-expand-val{font-size:14px;font-weight:500;color:#d4d4d8}
        .sl-expand-notes{font-size:12px;color:#52525b;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05)}
        .sl-name{color:#d4d4d8;font-weight:500;display:block;margin-bottom:2px}
        .sl-note{font-size:11px;color:#3f3f46;display:block}
        .sl-muted{color:#52525b}
        .sl-revenue{color:#f4f4f5;font-weight:500}
        .sl-platform-tag{font-size:11px;color:#71717a;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:5px;padding:2px 8px;white-space:nowrap}
        .sl-margin-wrap{display:flex;flex-direction:column;gap:4px;min-width:70px}
        .sl-margin-track{height:3px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden}
        .sl-margin-fill{height:100%;border-radius:99px}
        .sl-input{background:#0e0e0f;border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:5px 8px;font-family:'DM Mono',monospace;font-size:12px;color:#f4f4f5;outline:none;width:100%;min-width:80px}
        .sl-input-sm{min-width:60px;max-width:90px}
        .sl-actions{display:flex;gap:6px;align-items:center}
        .sl-expand{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#52525b;font-size:10px;padding:3px 8px;cursor:pointer}
        .sl-expand:hover{color:#d4d4d8}
        .sl-edit{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#71717a;font-size:11px;padding:3px 10px;cursor:pointer;font-family:'DM Mono',monospace}
        .sl-edit:hover{color:#d4d4d8;border-color:rgba(255,255,255,0.2)}
        .sl-save{background:#f59e0b;border:none;border-radius:6px;color:#0e0e0f;font-size:11px;padding:3px 10px;cursor:pointer;font-family:'DM Mono',monospace;font-weight:500}
        .sl-cancel{background:none;border:none;color:#52525b;font-size:12px;cursor:pointer;padding:3px 6px;font-family:'DM Mono',monospace}
        .sl-del{background:none;border:none;color:#3f3f46;font-size:12px;cursor:pointer;padding:3px 6px;border-radius:4px;font-family:'DM Mono',monospace}
        .sl-del:hover{color:#f87171;background:rgba(248,113,113,0.08)}
        @media(max-width:640px){.sl-stats{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  )
}
