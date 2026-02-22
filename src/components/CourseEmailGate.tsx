'use client'

import { useState, useEffect } from 'react'

interface CourseEmailGateProps {
  product: string
  children: React.ReactNode
}

export function CourseEmailGate({ product, children }: CourseEmailGateProps) {
  const [email, setEmail] = useState('')
  const [isGated, setIsGated] = useState(true)
  const [isChecking, setIsChecking] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check localStorage for saved email
    const savedEmail = localStorage.getItem(`${product}_course_email`)
    if (savedEmail) {
      setEmail(savedEmail)
      setIsGated(false)
    } else {
      setIsGated(true)
    }
    setIsChecking(false)
  }, [product])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!emailInput.trim()) {
      setError('Please enter your email')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/ac/add-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailInput.trim(),
          product,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store email in localStorage
        localStorage.setItem(`${product}_course_email`, emailInput.trim().toLowerCase())
        setEmail(emailInput.trim().toLowerCase())
        setIsGated(false)
      } else {
        setError(data.error || 'Failed to verify email. Please try again.')
      }
    } catch (err: any) {
      console.error('Error submitting email:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking localStorage
  if (isChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        color: '#e8e4df',
        fontFamily: 'Inter, sans-serif'
      }}>
        Loading...
      </div>
    )
  }

  // Show email gate if not authenticated
  if (isGated) {
    return (
      <>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }

          :root {
            --bg: #0a0a0f;
            --surface: #12121a;
            --surface-hover: #1a1a25;
            --border: rgba(255,255,255,0.06);
            --text: #e8e4df;
            --text-dim: #8a8680;
            --gold: #d4a853;
            --gold-dim: rgba(212,168,83,0.15);
            --burgundy: #8b2040;
            --burgundy-dim: rgba(139,32,64,0.2);
          }

          body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
          }

          .ambient {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none;
            z-index: 0;
            background:
              radial-gradient(ellipse 600px 400px at 20% 20%, rgba(139,32,64,0.08), transparent),
              radial-gradient(ellipse 500px 500px at 80% 80%, rgba(212,168,83,0.05), transparent);
          }

          .gate-container {
            position: relative;
            z-index: 1;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }

          .gate-card {
            width: 100%;
            max-width: 440px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 48px 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          }

          .gate-headline {
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            font-weight: 700;
            color: var(--gold);
            margin-bottom: 8px;
            text-align: center;
          }

          .gate-subtitle {
            font-size: 14px;
            color: var(--text-dim);
            text-align: center;
            margin-bottom: 32px;
            line-height: 1.5;
          }

          .gate-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .gate-input {
            width: 100%;
            padding: 14px 16px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            transition: all 0.2s ease;
          }

          .gate-input:focus {
            outline: none;
            border-color: var(--gold);
            background: rgba(255,255,255,0.08);
          }

          .gate-input::placeholder {
            color: var(--text-dim);
          }

          .gate-button {
            width: 100%;
            padding: 14px 24px;
            background: linear-gradient(135deg, var(--burgundy), #a02850);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .gate-button:hover:not(:disabled) {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }

          .gate-button:active:not(:disabled) {
            transform: translateY(0);
          }

          .gate-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .gate-error {
            color: #ef4444;
            font-size: 13px;
            text-align: center;
            margin-top: -10px;
          }
        `}</style>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

        <div className="ambient"></div>
        <div className="gate-container">
          <div className="gate-card">
            <h1 className="gate-headline">Welcome Back</h1>
            <p className="gate-subtitle">Enter the email you purchased with to access your course.</p>
            <form className="gate-form" onSubmit={handleEmailSubmit}>
              <input
                type="email"
                className="gate-input"
                placeholder="your@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                disabled={isSubmitting}
                required
              />
              {error && <div className="gate-error">{error}</div>}
              <button 
                type="submit" 
                className="gate-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Access My Course'}
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

  // Show course content when unlocked
  return <>{children}</>
}

