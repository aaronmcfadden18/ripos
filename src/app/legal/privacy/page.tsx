
export default function PrivacyPage() {
  return (
    <div style={{maxWidth:'720px',margin:'0 auto',padding:'48px 24px',fontFamily:'DM Mono,monospace',background:'#0e0e0f',minHeight:'100vh',color:'#d4d4d8',lineHeight:'1.7'}}>
      <a href="/login" style={{color:'#f59e0b',textDecoration:'none',fontSize:'13px'}}>← Back</a>
      <div style={{marginTop:'32px',whiteSpace:'pre-wrap',fontSize:'14px'}}># Privacy Policy

**Last updated: 3 June 2026**

## 1. Who We Are

RipOS is operated by Aaron McFadden, a sole trader based in England. This policy explains how I collect, use, and protect your personal data when you use getripos.com.

Contact: aaronmcfadden18@gmail.com

## 2. Data I Collect

**Account data:**
- Email address (used for login)

**Data you enter:**
- Stream records, revenue, costs
- Inventory items and purchase history
- Sales records including buyer usernames from Whatnot
- Onboarding responses (e.g. how you currently track profits)

**Technical data:**
- Basic usage analytics (via Vercel)
- No advertising tracking or third-party analytics

## 3. How I Use Your Data

- To provide and improve the Service
- To generate AI insights about your business (processed via Anthropic's API — no data is stored by Anthropic)
- To send transactional emails (magic link sign-in)
- I will never sell your data or use it for advertising

## 4. Data Storage

Your data is stored securely using Supabase, hosted in the EU. Passwords are never stored — we use magic link and email/password authentication via Supabase Auth.

## 5. Third-Party Services

RipOS uses the following third-party services:

| Service | Purpose | Privacy Policy |
|---------|---------|---------------|
| Supabase | Database and authentication | supabase.com/privacy |
| Vercel | Hosting and deployment | vercel.com/legal/privacy-policy |
| Anthropic | AI insights generation | anthropic.com/privacy |

## 6. Your Rights (UK GDPR)

Under UK GDPR, you have the right to:
- **Access** the personal data I hold about you
- **Rectify** inaccurate data
- **Erase** your data ("right to be forgotten")
- **Portability** — receive your data in a machine-readable format
- **Object** to processing

To exercise any of these rights, email: aaronmcfadden18@gmail.com. I will respond within 30 days.

## 7. Cookies

RipOS uses only essential cookies required for authentication. No advertising or tracking cookies are used.

## 8. Data Retention

I retain your data for as long as your account is active. If you delete your account, your data will be permanently deleted within 30 days.

## 9. Children

RipOS is not intended for users under 18. I do not knowingly collect data from minors.

## 10. Changes to This Policy

I may update this policy from time to time. Significant changes will be notified via email or in-app notice.

## 11. Complaints

If you have concerns about how I handle your data, you can contact the UK Information Commissioner's Office (ICO) at ico.org.uk.
</div>
    </div>
  )
}
