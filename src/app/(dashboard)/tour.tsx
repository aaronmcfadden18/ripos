'use client'
import { useState, useEffect, useRef } from 'react'

const STEPS = [
  {
    id: 'import',
    title: 'Import your Whatnot CSV',
    desc: 'Each month, export your earnings from Whatnot and import here. Your streams and sales populate automatically.',
    target: 'tour-import',
    placement: 'bottom',
  },
  {
    id: 'new-stream',
    title: 'Log a stream manually',
    desc: 'Going live? Create a stream beforehand to track your inventory costs, platform fees, and true profit.',
    target: 'tour-new-stream',
    placement: 'bottom',
  },
  {
    id: 'stats',
    title: 'Your real numbers',
    desc: 'Total turnover, true profit after all costs, and average revenue per stream — not just what Whatnot shows you.',
    target: 'tour-stats',
    placement: 'bottom',
  },
  {
    id: 'buyers',
    title: 'Know your best customers',
    desc: 'Before every stream, check who your top buyers are. Give them a shoutout — loyal buyers spend more.',
    target: 'tour-buyers',
    placement: 'top',
  },
]

export default function Tour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const current = STEPS[step]

  useEffect(() => {
    const update = () => {
      const el = document.getElementById(current.target)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        setRect(el.getBoundingClientRect())
      }, 350)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [step])

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else { localStorage.setItem('ripos_tour_done', 'true'); onComplete() }
  }

  const skip = () => { localStorage.setItem('ripos_tour_done', 'true'); onComplete() }

  const TOOLTIP_W = 300
  const TOOLTIP_H = 200
  const GAP = 12

  const getTooltipPos = () => {
    if (!rect) return { top: '50%', left: '50%' }
    const vw = window.innerWidth
    let top: number
    let left: number

    if (current.placement === 'bottom') {
      top = rect.bottom + GAP
    } else {
      top = rect.top - TOOLTIP_H - GAP
    }

    // Centre horizontally on the target, clamp to viewport
    left = rect.left + rect.width / 2 - TOOLTIP_W / 2
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12))

    return { top, left }
  }

  const { top, left } = getTooltipPos()

  return (
    <>
      <div className="tour-overlay" onClick={skip} />
      {rect && (
        <div
          className="tour-highlight"
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      {rect && (
        <div
          ref={tooltipRef}
          className="tour-tooltip"
          style={{ position: 'fixed', top, left, width: TOOLTIP_W }}
        >
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
      )}
      <style>{`
        .tour-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:999}
        .tour-highlight{border-radius:10px;border:2px solid #f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,0.15);z-index:1000;pointer-events:none;transition:all 0.25s ease}
        .tour-tooltip{background:#18181b;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 60px rgba(0,0,0,0.7);z-index:1001;transition:top 0.25s ease,left 0.25s ease}
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
