import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div style={{minHeight:'100vh',background:'#030712',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',padding:'32px'}}>
        <div style={{fontSize:'64px',marginBottom:'24px'}}>🎉</div>
        <h1 style={{color:'white',fontSize:'24px',marginBottom:'16px'}}>You are In!</h1>
        <p style={{color:'#9ca3af',marginBottom:'24px'}}>Thank you for your purchase!</p>
        <Link href="/" style={{color:'#22c55e'}}>Return Home</Link>
      </div>
    </div>
  )
}
