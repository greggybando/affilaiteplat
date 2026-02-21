'use client'

import { useState, useEffect } from 'react'

const modules = [
  { id: 1, title: "Delete your perceived charisma mountain", loomId: "05f01863f0d544b99fa0e6942d921a52" },
  { id: 2, title: "Charisma feels like this", loomId: "57af9590a51742e4b235b6f37eb80e80" },
  { id: 3, title: "What is Charisma? (internal)", loomId: "88dee92dcf0741baada69c757c540ba9" },
  { id: 4, title: "Status/Authority mechanism in brain", loomId: "c553214d15894e3c85eb2182271785ac" },
  { id: 5, title: "Energetic leadership", loomId: "f30b41e36fda4650be1fa5e91005e148" },
  { id: 6, title: "Loving/forgiving yourself (allowing greatness)", loomId: "9e04402c94494d0c9e0db1291eff31bc" },
  { id: 7, title: "Constricted physical movement", loomId: "31beb6a5642d41c7a34d42ba69224fec" },
  { id: 8, title: "ABUNDANCE mentality", loomId: "dcb2884dcfe845fb9cc5992c114aebfa" },
  { id: 9, title: "Higher self vs lower self", loomId: "bb42668bc4164f928df2c8e0e0f1d6de" },
  { id: 10, title: "Creating your charismatic character", loomId: "f72f642fcde3487cba3a018c8dda4bfa" },
  { id: 11, title: '"Rise all boats" frame', loomId: "1361826084b94318bf39029f31a9c932" }
]

export default function CharismaCoursePage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isGated, setIsGated] = useState(true)
  const [emailInput, setEmailInput] = useState('')

  const currentModule = modules[currentIndex]

  useEffect(() => {
    // Check localStorage for saved email
    const savedEmail = localStorage.getItem('charisma_course_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setIsGated(false)
    }
  }, [])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (emailInput.trim()) {
      localStorage.setItem('charisma_course_email', emailInput.trim())
      setEmail(emailInput.trim())
      setIsGated(false)
    }
  }

  const loadModule = (index: number) => {
    setCurrentIndex(index)
    setSidebarOpen(false)
  }

  const navigate = (dir: number) => {
    const next = currentIndex + dir
    if (next >= 0 && next < modules.length) {
      setCurrentIndex(next)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
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

          .gate-button:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }

          .gate-button:active {
            transform: translateY(0);
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
                required
              />
              <button type="submit" className="gate-button">
                Access My Course
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

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

        .app {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 340px;
          min-width: 340px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: 28px 24px 20px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--gold);
          line-height: 1.3;
          margin-bottom: 4px;
        }

        .sidebar-header .subtitle {
          font-size: 12px;
          color: var(--text-dim);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .module-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .module-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 24px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .module-item:hover { background: var(--surface-hover); }

        .module-item.active {
          background: var(--burgundy-dim);
          border-left-color: var(--gold);
        }

        .module-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
          border: 1.5px solid rgba(255,255,255,0.12);
          color: var(--text-dim);
          transition: all 0.3s ease;
        }

        .module-item.active .module-number {
          border-color: var(--gold);
          color: var(--gold);
          background: var(--gold-dim);
        }

        .module-title {
          font-size: 13px;
          line-height: 1.4;
          color: var(--text-dim);
          transition: color 0.2s;
        }

        .module-item.active .module-title {
          color: var(--text);
          font-weight: 500;
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 40px;
          max-width: 900px;
        }

        .current-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--gold);
          margin-bottom: 8px;
          font-weight: 600;
        }

        .current-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 28px;
          line-height: 1.3;
        }

        .video-container {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
          border: 1px solid var(--border);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          margin-bottom: 28px;
        }

        .video-container iframe {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        .btn-nav {
          background: var(--surface);
          color: var(--text-dim);
          border: 1px solid var(--border);
        }

        .btn-nav:hover:not(:disabled) {
          background: var(--surface-hover);
          color: var(--text);
          border-color: rgba(255,255,255,0.12);
        }

        .btn-nav:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-next {
          background: linear-gradient(135deg, var(--burgundy), #a02850);
          color: white;
          border: none;
        }

        .btn-next:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .btn-next:disabled { opacity: 0.3; cursor: not-allowed; }

        .mobile-toggle {
          display: none;
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 100;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--burgundy);
          color: white;
          border: none;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(139,32,64,0.4);
          align-items: center;
          justify-content: center;
        }

        .overlay {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 9;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: 0; top: 0; bottom: 0;
            z-index: 10;
            transform: translateX(-100%);
          }
          .sidebar.open { transform: translateX(0); }
          .overlay.show { display: block; }
          .mobile-toggle { display: flex; }
          .main { padding: 24px 20px; }
          .current-title { font-size: 22px; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="ambient"></div>

      <div className="app">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h1>Psychology of the Super-Charismatic</h1>
            <div className="subtitle">11 Modules · Video Course</div>
          </div>
          <div className="module-list">
            {modules.map((module, index) => (
              <div
                key={module.id}
                className={`module-item ${index === currentIndex ? 'active' : ''}`}
                onClick={() => loadModule(index)}
              >
                <div className="module-number">{module.id}</div>
                <div className="module-title">{module.title}</div>
              </div>
            ))}
          </div>
        </aside>

        <div className={`overlay ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar}></div>

        <div className="main">
          <div className="current-label">Module {currentModule.id} of {modules.length}</div>
          <h2 className="current-title">{currentModule.title}</h2>
          <div className="video-container">
            <iframe
              id="videoFrame"
              src={`https://www.loom.com/embed/${currentModule.loomId}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
              allowFullScreen
            ></iframe>
          </div>
          <div className="controls">
            <button
              className="btn btn-nav"
              onClick={() => navigate(-1)}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button
              className="btn btn-next"
              onClick={() => navigate(1)}
              disabled={currentIndex === modules.length - 1}
            >
              Next Module →
            </button>
          </div>
        </div>
      </div>

      <button className="mobile-toggle" onClick={toggleSidebar}>☰</button>
    </>
  )
}

