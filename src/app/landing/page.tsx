'use client'

export default function LandingPage() {
  return (
    <div style={{background:'#0e0e0f',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'20px',fontFamily:'monospace'}}>
      <h1 style={{color:'#f4f4f5',fontSize:'48px'}}>Stop guessing.<br/><span style={{color:'#f59e0b'}}>Know your profit.</span></h1>
      <p style={{color:'#a1a1aa',fontSize:'16px',textAlign:'center',maxWidth:'500px'}}>Whatnot tells you what you earned. RipOS tells you what you actually made.</p>
      <a href="/login" style={{background:'#f59e0b',color:'#0e0e0f',padding:'14px 28px',borderRadius:'10px',textDecoration:'none',fontSize:'15px',fontWeight:'500'}}>Get started free →</a>
      <p style={{color:'#52525b',fontSize:'12px'}}>No credit card · Free during beta</p>
    </div>
  )
}
