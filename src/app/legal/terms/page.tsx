export default function TermsPage() {
  return (
    <div style={{maxWidth:'720px',margin:'0 auto',padding:'48px 24px',fontFamily:'DM Mono,monospace',background:'#0e0e0f',minHeight:'100vh',color:'#d4d4d8'}}>
      <a href="/login" style={{color:'#f59e0b',textDecoration:'none',fontSize:'13px'}}>← Back</a>
      <h1 style={{fontFamily:'DM Serif Display,serif',fontSize:'32px',color:'#f4f4f5',margin:'32px 0 8px'}}>Terms of Service</h1>
      <p style={{fontSize:'12px',color:'#52525b',marginBottom:'40px'}}>Last updated: 3 June 2026</p>
      {[
        ['1. About RipOS', 'RipOS is operated by Aaron McFadden, a sole trader based in England. By using RipOS at getripos.com, you agree to these Terms of Service.'],
        ['2. What RipOS Does', 'RipOS is a business dashboard for Whatnot card breakers. It helps you track streams, profit, inventory, and sales. It is not a financial advisor, accountant, or tax service. Any figures shown are for informational purposes only.'],
        ['3. Beta Service', 'RipOS is currently in beta and provided free of charge. I reserve the right to change or discontinue features at any time, introduce paid plans in the future with reasonable notice, and modify these terms at any time — continued use constitutes acceptance.'],
        ['4. Your Account', 'You are responsible for keeping your login credentials secure, all data you enter into the Service, and ensuring your use complies with applicable laws.'],
        ['5. Your Data', 'You own all data you upload or enter. I will not sell your data to third parties. I may use anonymised, aggregated data to improve the Service. You can request deletion of your account and data at any time by emailing me.'],
        ['6. Acceptable Use', 'You must not use the Service for any unlawful purpose, attempt to reverse engineer or compromise the Service, or share your account with others.'],
        ['7. Imported Data', 'When you import CSVs from Whatnot or other platforms, you confirm you have the right to use that data. RipOS is not affiliated with Whatnot.'],
        ['8. Disclaimers', 'The Service is provided "as is" without warranties of any kind. I am not liable for loss of data, financial losses based on figures shown in the app, or service interruptions or bugs.'],
        ['9. Limitation of Liability', 'To the maximum extent permitted by English law, my total liability to you shall not exceed £100 or the amount you have paid for the Service in the past 12 months, whichever is greater.'],
        ['10. Governing Law', 'These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.'],
        ['11. Contact', 'For any questions about these terms, contact: aaronmcfadden18@gmail.com'],
      ].map(([title, body]) => (
        <div key={title} style={{marginBottom:'32px'}}>
          <h2 style={{fontSize:'14px',color:'#f4f4f5',marginBottom:'8px',fontFamily:'DM Mono,monospace'}}>{title}</h2>
          <p style={{fontSize:'13px',color:'#a1a1aa',lineHeight:'1.7'}}>{body}</p>
        </div>
      ))}
    </div>
  )
}