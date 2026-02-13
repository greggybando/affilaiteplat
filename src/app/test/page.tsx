export default function TestPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        maxWidth: '500px',
        textAlign: 'center',
        padding: '40px 20px',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: '16px',
        }}>
          Test Product
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#aaaaaa',
          marginBottom: '32px',
        }}>
          $1 test to verify affiliate tracking works.
        </p>
        <a
          href="https://buy.stripe.com/fZucN5b4GfFMdd94uc0co0e"
          style={{
            display: 'inline-block',
            padding: '16px 48px',
            background: '#FFE500',
            color: '#000000',
            fontSize: '18px',
            fontWeight: 700,
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          BUY NOW — $1
        </a>
      </div>
    </div>
  )
}

