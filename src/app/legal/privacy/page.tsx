export default function PrivacyPage() {
  return (
    <div style={{maxWidth:'720px',margin:'0 auto',padding:'48px 24px',fontFamily:'DM Mono,monospace',background:'#0e0e0f',minHeight:'100vh',color:'#d4d4d8'}}>
      <a href="/login" style={{color:'#f59e0b',textDecoration:'none',fontSize:'13px'}}>← Back</a>
      <h1 style={{fontFamily:'DM Serif Display,serif',fontSize:'32px',color:'#f4f4f5',margin:'32px 0 8px'}}>Privacy Policy</h1>
      <p style={{fontSize:'12px',color:'#52525b',marginBottom:'40px'}}>Last updated: 3 June 2026</p>
      {[
        ['1. Who We Are', 'RipOS is operated by Aaron McFadden, a sole trader based in England. Contact: aaronmcfadden18@gmail.com'],
        ['2. Data I Collect', 'Account data: your email address. Data you enter: stream records, revenue, costs, inventory, sales records including buyer usernames, and onboarding responses. Technical data: basic usage analytics via Vercel. No advertising tracking or third-party analytics.'],
        ['3. How I Use Your Data', 'To provide and improve the Service. To generate AI insights about your business (processed via Anthropic API — no data is stored by Anthropic). To send transactional emails. I will never sell your data or use it for advertising.'],
        ['4. Data Storage', 'Your data is stored securely using Supabase, hosted in the EU. Passwords are never stored — we use magic link and email/password authentication via Supabase Auth.'],
        ['5. Third-Party Services', 'Supabase (database and auth), Vercel (hosting), and Anthropic (AI insights). Each has its own privacy policy.'],
        ['6. Your Rights (UK GDPR)', 'You have the right to access, rectify, erase, and port your personal data, and to object to processing. Email aaronmcfadden18@gmail.com to exercise these rights. I will respond within 30 days.'],
        ['7. Cookies', 'RipOS uses only essential cookies required for authentication. No advertising or tracking cookies are used.'],
        ['8. Data Retention', 'I retain your data for as long as your account is active. If you delete your account, your data will be permanently deleted within 30 days.'],
        ['9. Children', 'RipOS is not intended for users under 18. I do not knowingly collect data from minors.'],
        ['10. Complaints', 'If you have concerns about how I handle your data, you can contact the UK Information Commissioner Office (ICO) at ico.org.uk.'],
      ].map(([title, body]) => (
        <div key={title} style={{marginBottom:'32px'}}>
          <h2 style={{fontSize:'14px',color:'#f4f4f5',marginBottom:'8px',fontFamily:'DM Mono,monospace'}}>{title}</h2>
          <p style={{fontSize:'13px',color:'#a1a1aa',lineHeight:'1.7'}}>{body}</p>
        </div>
      ))}
    </div>
  )
}