'use client'
import { useState, useEffect } from 'react'

const STEPS = [
  {
    id: 'import',
    title: 'Import your Whatnot CSV',
    desc: 'Each month, export your earnings from Whatnot and import here. Your streams and sales populate automatically.',
    position: 'bottom-left',
    target: 'tour-import',
  },
  {
    id: 'new-stream',
    title: 'Log a stream manually',
    desc: 'Going live? Create a stream beforehand to track your inventory costs, platform fees, and true profit.',
    position: 'bottom-right',
    target: 'tour-new-stream',
  },
  {
    id: 'turnover',
    title: 'Your real numbers',
    desc: 'This is your total turnover, true profit after all costs, and average revenue per stream — not just what Whatnot shows you.',
    position: 'bottom-left',
    target: 'tour-stats',
  },
  {
    id: 'buyers',
    title: 'Know your best customers',
    desc: 'Before every stream, check who your top buyers are. Give them a shoutout — loyal buyers spend more.',
    position: 'top-left',
    target: 'tour-buyers',
  },
]

export default function Tour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const current = STEPS[step]

  useEffect(() => {
    const el = document.getElementById(current.target)
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [step])

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else { localStorage.setItem('ripos_tour_done', 'true'); onComplete() }
  }

  const skip = () => { localStorage.setItem('ripos_tour_done', 'true'); onComplete() }

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    top: current.position.startsWith('bottom') ? pos.top + 60 : pos.top - 160,
    left: current.position.endsWith('left') ? pos.left : pos.left + pos.width - 280,
    width: 280,
    zIndex: 1001,
  }

  return (
    <>
      <div className="tour-overlay" onClick={skip} />
      <div className="tour-highlight" style={{ top: pos.top - 6, left: pos.left - 6, width: pos.width + 12 }} />
      <div className="tour-tooltip" style={tooltipStyle}>
        <div className="tour-tt-head">
          <span className="tour-tt-step">{step + 1} of {STEPS.length}</span>
          <button className="tour-tt-skip" onClick={skip}>Skip tour</button>
        </div>
        <h3 className="tour-tt-title">{current.title}</h3>
        <p className="tour-tt-desc">{current.desc}</p>
        <div className="tour-tt-dots">
          {STEPS.map((_, i) => <div key={i} className={`tour-tt-dot ${i === step ? 'active' : ''}`} />)}
        </div>
        <button className="tour-tt-btn" onClick={next}>
          {step < STEPS.length - 1 ? 'Next →' : 'Finish tour ✓'}
        </button>
      </div>
      <style>{`
        .tour-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999;cursor:pointer}
        .tour-highlight{position:absolute;border-radius:10px;border:2px solid #f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,0.2);z-index:1000;pointer-events:none;transition:all 0.3s ease;min-height:40px}
        .tour-tooltip{background:#18181b;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 60px rgba(0,0,0,0.6)}
        .tour-tt-head{display:flex;align-items:center;justify-content:space-between}
        .tour-tt-step{font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.06em;font-family:'DM Mono',monospace}
        .tour-tt-skip{background:none;border:none;color:#52525b;font-size:11px;cursor:pointer;font-family:'DM Mono',monospace}
        .tour-tt-skip:hover{color:#a1a1aa}
        .tour-tt-title{font-size:14px;color:#f4f4f5;font-weight:500;font-family:'DM Mono',monospace}
        .tour-tt-desc{font-size:12px;color:#71717a;line-height:1.6;font-family:'DM Mono',monospace}
        .tour-tt-dots{display:flex;gap:5px}
        .tour-tt-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.1)}
        .tour-tt-dot.active{background:#f59e0b}
        .tour-tt-btn{background:#f59e0b;color:#0e0e0f;border:none;border-radius:8px;padding:9px 16px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer;width:100%}
        .tour-tt-btn:hover{background:#d97706}
      `}</style>
    </>
  )
}
