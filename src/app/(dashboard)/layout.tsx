export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{minHeight:'100vh', background:'#0e0e0f'}}>
      {children}
    </div>
  )
}
