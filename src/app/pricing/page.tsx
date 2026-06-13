'use client'
import { useState } from 'react'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      alert('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="pricing">
      <div className="pricing-card">
        <p className="pricing-eyebrow">RipOS</p>
        <h1 className="pricing-headline">Less than two packs a month.</h1>
        <p className="pricing-sub">Know exactly what you made on every stream. Profit tracking built for Whatnot card breakers.</p>

        <div className="pricing-price">
          <span className="pricing-amount">£12</span>
          <span className="pricing-period">/month</span>
        </div>

        <ul className="pricing-features">
          <li>Import your Whatnot CSV — fees parsed automatically</li>
          <li>True profit after stock, fees and giveaways</li>
          <li>Buyer profiles across every stream</li>
          <li>AI insights on your breaking business</li>
          <li>Live clip tracker for content</li>
        </ul>

        <button className="pricing-cta" onClick={handleSubscribe} disabled={loading}>
          {loading ? 'Loading...' : 'Start your 14-day free trial'}
        </button>
        <p className="pricing-fineprint">14 days free, then £12/month. Cancel anytime.</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;font-family:'DM Mono',monospace}
        .pricing{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0e0e0f}
        .pricing-card{background:#18181b;border:1px solid rgba(245,158,11,0.2);border-radius:16px;padding:40px;max-width:440px;width:100%}
        .pricing-eyebrow{font-size:13px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px}
        .pricing-headline{font-family:'DM Serif Display',serif;font-size:32px;color:#f4f4f5;font-weight:400;line-height:1.2;margin-bottom:12px}
        .pricing-sub{font-size:14px;color:#a1a1aa;line-height:1.6;margin-bottom:28px}
        .pricing-price{display:flex;align-items:baseline;gap:6px;margin-bottom:28px}
        .pricing-amount{font-size:48px;color:#f4f4f5;font-weight:500}
        .pricing-period{font-size:18px;color:#71717a}
        .pricing-features{list-style:none;margin-bottom:28px;display:flex;flex-direction:column;gap:12px}
        .pricing-features li{font-size:14px;color:#d4d4d8;padding-left:26px;position:relative;line-height:1.4}
        .pricing-features li:before{content:'✓';position:absolute;left:0;color:#4ade80;font-weight:500}
        .pricing-cta{width:100%;background:#f59e0b;color:#0e0e0f;border:none;border-radius:10px;padding:16px;font-family:'DM Mono',monospace;font-size:15px;font-weight:500;cursor:pointer}
        .pricing-cta:hover{background:#e08e00}
        .pricing-cta:disabled{opacity:0.6;cursor:default}
        .pricing-fineprint{text-align:center;font-size:12px;color:#52525b;margin-top:14px}
      `}</style>
    </div>
  )
}
