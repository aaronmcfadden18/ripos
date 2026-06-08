'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ClipsPage() {
  const [user, setUser] = useState<any>(null)
  const [isLive, setIsLive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [note, setNote] = useState('')
  const [tag, setTag] = useState<'hit'|'clip'>('hit')
  const [clips, setClips] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [attachingTo, setAttachingTo] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [attached, setAttached] = useState(false)
  const timerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      const { data: c } = await supabase.from('stream_clips').select('*').eq('user_id', user.id).is('stream_id', null).order('created_at', { ascending: false })
      setClips(c ?? [])
      const { data: s } = await supabase.from('streams').select('id, title, platform, revenue, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      setStreams(s ?? [])
    }
    load()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleGoLive = () => {
    setIsLive(true)
    setElapsed(0)
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }

  const handleEndStream = () => {
    setIsLive(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const handleMark = async () => {
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('stream_clips').insert({
      user_id: user.id,
      timestamp_seconds: elapsed,
      note: note.trim() || null,
      tag,
    }).select().single()
    if (data) setClips(prev => [data, ...prev])
    setNote('')
    setSaving(false)
  }

  const handleAttach = async (streamId: string) => {
    const supabase = createClient()
    await supabase.from('stream_clips').update({ stream_id: streamId }).eq('user_id', user.id).is('stream_id', null)
    setAttached(true)
    setClips([])
    setAttachingTo(null)
  }

  if (!user) return null

  return (
    <div className="cl">
      <div className="cl-header">
        <Link href="/" className="cl-back">← Dashboard</Link>
        <h1 className="cl-title">Clip tracker</h1>
        <p className="cl-sub">Mark moments during your stream — find them after</p>
      </div>

      {!isLive ? (
        <>
          <div className="cl-idle-card">
            <p className="cl-idle-label">Not streaming yet</p>
            <button className="cl-golive-btn" onClick={handleGoLive}>Go live</button>
            <p className="cl-idle-hint">Tap when your stream starts — timer begins automatically</p>
          </div>

          {attached && (
            <div className="cl-success">✓ Clips attached to stream</div>
          )}

          {clips.length > 0 && (
            <div className="cl-card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                <p className="cl-section-label">{clips.length} unattached clip{clips.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'12px'}}>
                {clips.map((c: any) => (
                  <div key={c.id} className="cl-clip-row">
                    <span className="cl-clip-time">{formatTime(c.timestamp_seconds)}</span>
                    <span className="cl-clip-note">{c.note || '—'}</span>
                    <span className={`cl-tag ${c.tag === 'hit' ? 'cl-tag-hit' : 'cl-tag-clip'}`}>{c.tag}</span>
                  </div>
                ))}
              </div>
              {attachingTo ? (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  <p className="cl-section-label">Attach to which stream?</p>
                  {streams.map((s: any) => (
                    <button key={s.id} className="cl-stream-option" onClick={() => handleAttach(s.id)}>
                      <span style={{flex:1,textAlign:'left'}}>{s.title ?? 'Untitled stream'}</span>
                      <span style={{color:'#52525b',fontSize:'11px'}}>{s.revenue ? '£'+Number(s.revenue).toFixed(0) : ''}</span>
                    </button>
                  ))}
                  <button className="cl-ghost" onClick={() => setAttachingTo(null)}>Cancel</button>
                </div>
              ) : (
                <button className="cl-attach-btn" onClick={() => setAttachingTo('pick')}>Attach to a stream →</button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="cl-live-header">
            <div className="cl-live-dot" />
            <span className="cl-live-label">Live</span>
          </div>

          <div className="cl-timer-card">
            <p className="cl-timer-label">Stream timer</p>
            <p className="cl-timer">{formatTime(elapsed)}</p>
          </div>

          <button className="cl-mark-btn" onClick={handleMark} disabled={saving}>
            <span style={{fontSize:'24px'}}>📍</span>
            Mark moment
          </button>

          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input className="cl-note-input" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Note (optional)..." onKeyDown={e => e.key === 'Enter' && handleMark()} />
            <div style={{display:'flex',gap:'6px'}}>
              <button className={`cl-tag-btn ${tag === 'hit' ? 'cl-tag-btn-active' : ''}`} onClick={() => setTag('hit')}>Hit</button>
              <button className={`cl-tag-btn ${tag === 'clip' ? 'cl-tag-btn-active' : ''}`} onClick={() => setTag('clip')}>Clip</button>
            </div>
          </div>

          {clips.length > 0 && (
            <div className="cl-card">
              <p className="cl-section-label" style={{marginBottom:'8px'}}>{clips.length} clip{clips.length !== 1 ? 's' : ''} this stream</p>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {clips.map((c: any) => (
                  <div key={c.id} className="cl-clip-row">
                    <span className="cl-clip-time">{formatTime(c.timestamp_seconds)}</span>
                    <span className="cl-clip-note">{c.note || '—'}</span>
                    <span className={`cl-tag ${c.tag === 'hit' ? 'cl-tag-hit' : 'cl-tag-clip'}`}>{c.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="cl-end-btn" onClick={handleEndStream}>End stream</button>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .cl{max-width:480px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:16px}
        .cl-back{font-size:12px;color:#f59e0b;text-decoration:none;display:block;margin-bottom:8px}
        .cl-title{font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;color:#f4f4f5;margin-bottom:4px}
        .cl-sub{font-size:13px;color:#52525b}
        .cl-idle-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
        .cl-idle-label{font-size:12px;color:#52525b}
        .cl-idle-hint{font-size:11px;color:#3f3f46;max-width:260px;line-height:1.5}
        .cl-golive-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:10px;padding:14px 32px;font-family:'DM Mono',monospace;font-size:14px;font-weight:500;cursor:pointer;width:100%}
        .cl-live-header{display:flex;align-items:center;gap:8px}
        .cl-live-dot{width:8px;height:8px;border-radius:50%;background:#f87171}
        .cl-live-label{font-size:13px;color:#f87171;font-weight:500}
        .cl-timer-card{background:#18181b;border-radius:12px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:6px}
        .cl-timer-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.08em}
        .cl-timer{font-size:42px;color:#f4f4f5;font-weight:500;letter-spacing:0.04em;font-family:'DM Mono',monospace}
        .cl-mark-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:12px;padding:24px;width:100%;font-family:'DM Mono',monospace;font-size:16px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px}
        .cl-mark-btn:active{transform:scale(0.98)}
        .cl-mark-btn:disabled{opacity:0.5}
        .cl-note-input{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px;font-family:'DM Mono',monospace;font-size:13px;color:#f4f4f5;outline:none;flex:1}
        .cl-note-input:focus{border-color:rgba(245,158,11,0.5)}
        .cl-tag-btn{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#71717a;cursor:pointer;white-space:nowrap}
        .cl-tag-btn-active{border-color:rgba(245,158,11,0.5);color:#f59e0b;background:rgba(245,158,11,0.06)}
        .cl-card{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px}
        .cl-section-label{font-size:10px;color:#3f3f46;text-transform:uppercase;letter-spacing:0.08em}
        .cl-clip-row{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#0e0e0f;border-radius:8px}
        .cl-clip-time{font-size:13px;color:#f59e0b;font-weight:500;flex-shrink:0;min-width:52px}
        .cl-clip-note{font-size:12px;color:#d4d4d8;flex:1}
        .cl-tag{font-size:10px;padding:2px 8px;border-radius:20px;flex-shrink:0}
        .cl-tag-hit{background:rgba(74,222,128,0.08);color:#4ade80;border:1px solid rgba(74,222,128,0.18)}
        .cl-tag-clip{background:rgba(82,82,91,0.2);color:#71717a;border:1px solid rgba(82,82,91,0.3)}
        .cl-attach-btn{background:none;border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:10px;font-family:'DM Mono',monospace;font-size:12px;color:#f59e0b;cursor:pointer;width:100%;margin-top:8px}
        .cl-attach-btn:hover{background:rgba(245,158,11,0.06)}
        .cl-stream-option{background:#0e0e0f;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;font-family:'DM Mono',monospace;font-size:12px;color:#d4d4d8;cursor:pointer;width:100%;display:flex;align-items:center;gap:8px}
        .cl-stream-option:hover{border-color:rgba(245,158,11,0.3);color:#f4f4f5}
        .cl-ghost{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px;font-family:'DM Mono',monospace;font-size:12px;color:#71717a;cursor:pointer;width:100%}
        .cl-end-btn{background:none;border:1px solid rgba(248,113,113,0.3);border-radius:8px;padding:12px;font-family:'DM Mono',monospace;font-size:13px;color:#f87171;cursor:pointer;width:100%}
        .cl-end-btn:hover{background:rgba(248,113,113,0.06)}
        .cl-success{background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:8px;padding:12px;font-size:13px;color:#4ade80;text-align:center}
      `}</style>
    </div>
  )
}
