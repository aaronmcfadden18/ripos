'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="land">
      <nav className="nav">
        <div className="nav-logo">Rip<em>OS</em></div>
        <div className="nav-right">
          <span className="nav-beta">Free beta</span>
          <Link href="/login" className="nav-cta">Sign up free →</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-tag">Built for Whatnot card breakers</div>
        <h1 className="hero-headline">Stop guessing.<br/><span className="hero-accent">Know your profit.</span></h1>
        <p className="hero-sub">Whatnot tells you what you earned. RipOS tells you what you actually made — after stock costs, platform fees, and VAT. Import your CSV in 30 seconds.</p>
        <div className="hero-actions">
          <Link href="/login" className="hero-btn-primary">Get started free →</Link>
          <span className="hero-note">No credit card · Free during beta</span>
        </div>
        <div className="hero-preview">
          <div className="preview-card">
            <div className="preview-row">
              <div className="preview-stat">
                <p className="preview-label">Whatnot says you made</p>
                <p className="preview-val preview-grey">£2,840</p>
              </div>
              <div className="preview-arrow">→</div>
              <div className="preview-stat">
                <p className="preview-label">RipOS true profit</p>
                <p className="preview-val preview-green">£1,247</p>
              </div>
            </div>
            <p className="preview-hint">After stock costs · platform fees · VAT</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Sound familiar?</h2>
          <div className="problems">
            {[
              { icon: '📊', text: 'You check your Whatnot earnings but have no idea what you actually profited after buying the stock' },
              { icon: '📦', text: "You forget what you paid for boxes because you didn't log it immediately after purchase" },
              { icon: '🧾', text: "Tax time arrives and you're scrambling through spreadsheets trying to piece together your costs" },
              { icon: '⏰', text: 'You spend 30 mins before every stream manually working out what price to sell at to make a profit' },
            ].map((p, i) => (
              <div key={i} className="problem-item">
                <span className="problem-icon">{p.icon}</span>
                <p className="problem-text">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="section-inner">
          <div className="section-tag">What RipOS does</div>
          <h2 className="section-title">Your operation,<br/>centralised</h2>
          <div className="features">
            <div className="feature-card feature-big">
              <div className="feature-icon-lg">📥</div>
              <h3 className="feature-title">Import from Whatnot in one click</h3>
              <p className="feature-desc">Upload your monthly Whatnot earnings CSV and we automatically create all your streams and sales. No manual entry. Takes 30 seconds.</p>
              <div className="feature-badge">Most popular</div>
            </div>
            <div className="feature-card"><div className="feature-icon">💰</div><h3 className="feature-title">True profit calculator</h3><p className="feature-desc">See what you actually made after inventory costs, platform fees, and VAT — not just your Whatnot gross earnings.</p></div>
            <div className="feature-card"><div className="feature-icon">⚡</div><h3 className="feature-title">Quick add purchases</h3><p className="feature-desc">Just bought stock? Log it in 15 seconds on your phone. Cost per box calculated automatically.</p></div>
            <div className="feature-card"><div className="feature-icon">👥</div><h3 className="feature-title">Top buyer leaderboard</h3><p className="feature-desc">See your most loyal customers before every stream. Give them a shoutout — loyal buyers spend more.</p></div>
            <div className="feature-card"><div className="feature-icon">🧾</div><h3 className="feature-title">VAT tracking</h3><p className="feature-desc">Track VAT reclaimable on purchases and VAT owed on sales. Know your position before your accountant asks.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-tag">How it works</div>
          <h2 className="section-title">Up and running<br/>in 2 minutes</h2>
          <div className="steps">
            {[
              { n: '01', title: 'Sign up free', desc: 'Create your RipOS account. No credit card needed.' },
              { n: '02', title: 'Import your CSV', desc: 'Export your Whatnot earnings CSV and upload it. All your streams and sales appear instantly.' },
              { n: '03', title: 'See your real numbers', desc: 'Your dashboard shows true profit, top buyers, and revenue trends — not just Whatnot gross earnings.' },
            ].map((s, i) => (
              <div key={i} className="step">
                <div className="step-num">{s.n}</div>
                <div><h3 className="step-title">{s.title}</h3><p className="step-desc">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="section-inner">
          <div className="quotes">
            <div className="quote-card">
              <p className="quote-text">"Tbf looks good as a base ngl. It could be viable with a few updates. It's a good start for sure."</p>
              <div className="quote-author">
                <div className="quote-avatar">BS</div>
                <div><p className="quote-name">Billy Strong</p><p className="quote-role">Card breaker · WantedPosterPulls</p></div>
              </div>
            </div>
            <div className="quote-stats">
              <div className="quote-stat"><p className="quote-stat-val">30s</p><p className="quote-stat-label">To import a month of streams</p></div>
              <div className="quote-stat"><p className="quote-stat-val">£0</p><p className="quote-stat-label">Cost during beta</p></div>
              <div className="quote-stat"><p className="quote-stat-val">100%</p><p className="quote-stat-label">Built for Whatnot sellers</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-cta">
        <div className="section-inner cta-inner">
          <h2 className="cta-title">Know your real profit.<br/>Start today.</h2>
          <p className="cta-sub">Free during beta. No credit card. Built for Whatnot card breakers.</p>
          <Link href="/login" className="hero-btn-primary">Create free account →</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-logo">Rip<em>OS</em></div>
        <p className="footer-copy">Built for breakers. Designed to ship.</p>
        <Link href="/login" className="footer-link">Sign in</Link>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0e0e0f;color:#d4d4d8;font-family:'DM Mono',monospace}
        .land{min-height:100vh;display:flex;flex-direction:column}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);max-width:1100px;margin:0 auto;width:100%}
        .nav-logo{font-size:18px;font-weight:500;color:#f4f4f5}
        .nav-logo em{font-style:normal;color:#f59e0b}
        .nav-right{display:flex;align-items:center;gap:16px}
        .nav-beta{font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:3px 10px}
        .nav-cta{background:#f59e0b;color:#0e0e0f;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:500;text-decoration:none;font-family:'DM Mono',monospace}
        .nav-cta:hover{background:#d97706}
        .hero{max-width:1100px;margin:0 auto;width:100%;padding:80px 24px 60px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:24px}
        .hero-tag{font-size:12px;color:#f59e0b;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:5px 14px;text-transform:uppercase;letter-spacing:0.08em}
        .hero-headline{font-family:'DM Serif Display',serif;font-size:clamp(36px,7vw,72px);font-weight:400;color:#f4f4f5;line-height:1.1}
        .hero-accent{color:#f59e0b}
        .hero-sub{font-size:16px;color:#71717a;line-height:1.7;max-width:560px}
        .hero-actions{display:flex;flex-direction:column;align-items:center;gap:10px}
        .hero-btn-primary{background:#f59e0b;color:#0e0e0f;border-radius:10px;padding:14px 28px;font-size:15px;font-weight:500;text-decoration:none;font-family:'DM Mono',monospace}
        .hero-btn-primary:hover{background:#d97706}
        .hero-note{font-size:12px;color:#52525b}
        .hero-preview{width:100%;max-width:480px;margin-top:8px}
        .preview-card{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px}
        .preview-row{display:flex;align-items:center;justify-content:center;gap:24px}
        .preview-stat{display:flex;flex-direction:column;gap:6px;text-align:center}
        .preview-label{font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em}
        .preview-val{font-family:'DM Serif Display',serif;font-size:36px;font-weight:400}
        .preview-grey{color:#52525b;text-decoration:line-through}
        .preview-green{color:#4ade80}
        .preview-arrow{font-size:24px;color:#f59e0b}
        .preview-hint{font-size:12px;color:#3f3f46;text-align:center}
        .section{padding:80px 24px;width:100%}
        .section-dark{background:#18181b;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06)}
        .section-cta{background:rgba(245,158,11,0.04);border-top:1px solid rgba(245,158,11,0.15)}
        .section-inner{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:40px}
        .section-tag{font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.08em}
        .section-title{font-family:'DM Serif Display',serif;font-size:clamp(28px,4vw,44px);font-weight:400;color:#f4f4f5;line-height:1.2}
        .problems{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .problem-item{background:#18181b;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;gap:14px;align-items:flex-start}
        .problem-icon{font-size:22px;flex-shrink:0}
        .problem-text{font-size:13px;color:#71717a;line-height:1.6}
        .features{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .feature-card{background:#0e0e0f;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:10px;position:relative}
        .feature-big{grid-column:1/-1;background:rgba(245,158,11,0.04);border-color:rgba(245,158,11,0.2)}
        .feature-icon-lg{font-size:32px}
        .feature-icon{font-size:22px}
        .feature-title{font-size:15px;color:#f4f4f5;font-weight:500}
        .feature-desc{font-size:13px;color:#71717a;line-height:1.6}
        .feature-badge{position:absolute;top:16px;right:16px;font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:3px 10px;text-transform:uppercase;letter-spacing:0.06em}
        .steps{display:flex;flex-direction:column}
        .step{display:flex;gap:24px;align-items:flex-start;padding:28px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
        .step:last-child{border-bottom:none}
        .step-num{font-family:'DM Serif Display',serif;font-size:36px;color:rgba(245,158,11,0.3);flex-shrink:0;width:60px}
        .step-title{font-size:16px;color:#f4f4f5;font-weight:500;margin-bottom:6px}
        .step-desc{font-size:13px;color:#71717a;line-height:1.6}
        .quotes{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center}
        .quote-card{background:#0e0e0f;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:28px;display:flex;flex-direction:column;gap:20px}
        .quote-text{font-size:15px;color:#a1a1aa;line-height:1.7;font-style:italic}
        .quote-author{display:flex;align-items:center;gap:12px}
        .quote-avatar{width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center;font-size:12px;color:#f59e0b;font-weight:500;flex-shrink:0}
        .quote-name{font-size:13px;color:#f4f4f5;font-weight:500}
        .quote-role{font-size:11px;color:#52525b}
        .quote-stats{display:flex;flex-direction:column;gap:16px}
        .quote-stat{padding:20px;background:#0e0e0f;border:1px solid rgba(255,255,255,0.07);border-radius:10px}
        .quote-stat-val{font-family:'DM Serif Display',serif;font-size:36px;color:#f59e0b;margin-bottom:4px}
        .quote-stat-label{font-size:12px;color:#52525b}
        .cta-inner{align-items:center;text-align:center}
        .cta-title{font-family:'DM Serif Display',serif;font-size:clamp(28px,4vw,44px);font-weight:400;color:#f4f4f5;line-height:1.2}
        .cta-sub{font-size:14px;color:#71717a;max-width:400px}
        .footer{padding:32px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto;width:100%}
        .footer-logo{font-size:16px;font-weight:500;color:#f4f4f5}
        .footer-logo em{font-style:normal;color:#f59e0b}
        .footer-copy{font-size:12px;color:#3f3f46}
        .footer-link{font-size:12px;color:#52525b;text-decoration:none}
        .footer-link:hover{color:#f4f4f5}
        @media(max-width:640px){
          .problems{grid-template-columns:1fr}
          .features{grid-template-columns:1fr}
          .feature-big{grid-column:1}
          .quotes{grid-template-columns:1fr}
          .preview-row{flex-direction:column;gap:12px}
          .preview-arrow{transform:rotate(90deg)}
          .footer{flex-direction:column;gap:12px;text-align:center}
        }
      `}</style>
    </div>
  )
}
