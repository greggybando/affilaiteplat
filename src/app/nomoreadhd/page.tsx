'use client'

import { useState, useEffect } from 'react'
import { CourseEmailGate } from '@/components/CourseEmailGate'

type Lesson = {
  title: string
  type: 'loom' | 'youtube'
  id: string
  moduleIndex: number
  lessonIndex: number
  moduleTitle: string
}

type Module = {
  title: string
  lessons: Array<{ title: string; type: 'loom' | 'youtube'; id: string }>
}

const modules: Module[] = [
  {
    title: "Intro / What ADHD Actually Is",
    lessons: [
      { title: "Introduction", type: "loom", id: "bbd91163787b4b659c737b768fb81068" },
      { title: 'What Actually Is "ADHD"', type: "loom", id: "64a9669f9674431facda897283992f37" },
      { title: 'Re-Framing the Word "Productivity"', type: "loom", id: "3d9aac31dcee47e7a61e654290c0b04b" },
      { title: "Choosing What to Believe About Yourself", type: "loom", id: "1042d330524b4dc398391b03a5ce29f6" }
    ]
  },
  {
    title: "The World's Simplest 3-Part Work System",
    lessons: [
      { title: 'The 3-Part "Work System" Overview', type: "loom", id: "416252d5f0104ac39ce0260760bc828a" },
      { title: "Part 1: Environment Prep", type: "loom", id: "0c96f633de6b4118b70a47ac3b382334" },
      { title: "Part 2: Work Prep", type: "youtube", id: "uiKMGu_2T0I" },
      { title: "Part 3: Daily Deadline Decision", type: "loom", id: "a4430e535104443bbd548d6c89c2033f" }
    ]
  },
  {
    title: "Fix 99% of Procrastination",
    lessons: [
      { title: "Fix Procrastination: No Clarity", type: "youtube", id: "8yKGMwvNrQo" },
      { title: "Fix Procrastination: No Conviction", type: "loom", id: "f7e509b7fe9e43d58d34b67bbb149f28" },
      { title: "What If I Don't Know What to Do", type: "youtube", id: "M6g_JZdKoas" }
    ]
  },
  {
    title: "Designing Your Energy System",
    lessons: [
      { title: "How Energy Works in the Body", type: "youtube", id: "4rsDQNjGT1g" },
      { title: "Infinite Energy Generation Routine", type: "youtube", id: "vuegeouEAjI" },
      { title: "Things That Destroy Your Energy", type: "loom", id: "882a49a3d8f54a4aac2a9e54b66765d2" }
    ]
  },
  {
    title: "Designing Your Focus System",
    lessons: [
      { title: 'What "Focus" Actually Is', type: "loom", id: "b8b248a0ac1d468bbb3199704596a067" },
      { title: 'Train Your "Ability to Catch & Remove"', type: "loom", id: "649511d0eb3942deb7c3903f94e87c7e" }
    ]
  },
  {
    title: "Personality Awareness",
    lessons: [
      { title: "Maker's vs Manager's Schedule", type: "loom", id: "1e420a5bfe05486bb0facfe7795df30" },
      { title: '2 Most Common Work "Types"', type: "loom", id: "c22269430def4212a3a01f69674252c0" },
      { title: "Beginning to Understand Your Wiring", type: "youtube", id: "Zvplf8vm3Hs" }
    ]
  }
]

function ADHDCourseContent() {
  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Initialize lessons from modules
  useEffect(() => {
    const lessons: Lesson[] = []
    modules.forEach((mod, mi) => {
      mod.lessons.forEach((lesson, li) => {
        lessons.push({
          ...lesson,
          moduleIndex: mi,
          lessonIndex: li,
          moduleTitle: mod.title
        })
      })
    })
    setAllLessons(lessons)
  }, [])

  // Load state from localStorage
  useEffect(() => {
    if (allLessons.length === 0) return
    
    try {
      const saved = localStorage.getItem('adhd-course-v2')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.currentIndex !== undefined) {
          setCurrentIndex(Math.min(data.currentIndex, allLessons.length - 1))
        }
        if (data.completed) {
          setCompleted(new Set(data.completed.filter((idx: number) => idx < allLessons.length)))
        }
      }
    } catch (e) {
      console.error('Error loading saved state:', e)
    }
  }, [allLessons.length])

  // Save state to localStorage
  useEffect(() => {
    if (allLessons.length === 0) return
    
    try {
      localStorage.setItem('adhd-course-v2', JSON.stringify({
        currentIndex,
        completed: [...completed]
      }))
    } catch (e) {
      console.error('Error saving state:', e)
    }
  }, [currentIndex, completed, allLessons.length])

  const currentLesson = allLessons[currentIndex]
  const isCompleted = completed.has(currentIndex)
  const isLast = currentIndex === allLessons.length - 1
  const totalLessons = allLessons.length
  const completedCount = completed.size
  const xpPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const getPlayerStatus = () => {
    if (xpPercent === 0) return 'SCATTERED'
    if (xpPercent < 25) return 'AWAKENING'
    if (xpPercent < 50) return 'FOCUSED'
    if (xpPercent < 75) return 'LOCKED IN'
    if (xpPercent < 100) return 'UNSTOPPABLE'
    return 'MAXED OUT ★'
  }

  const goToLesson = (index: number) => {
    setCurrentIndex(index)
    setSidebarOpen(false)
    window.scrollTo(0, 0)
  }

  const nextLesson = () => {
    if (currentIndex < allLessons.length - 1) {
      setCurrentIndex(currentIndex + 1)
      window.scrollTo(0, 0)
    }
  }

  const prevLesson = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      window.scrollTo(0, 0)
    }
  }

  const toggleComplete = () => {
    const newCompleted = new Set(completed)
    if (newCompleted.has(currentIndex)) {
      newCompleted.delete(currentIndex)
    } else {
      newCompleted.add(currentIndex)
    }
    setCompleted(newCompleted)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentIndex < allLessons.length - 1) {
        setCurrentIndex(currentIndex + 1)
        window.scrollTo(0, 0)
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        window.scrollTo(0, 0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, allLessons.length])

  if (!currentLesson) {
    return <div>Loading...</div>
  }

  const buildVideoHTML = () => {
    if (currentLesson.type === 'loom') {
      return (
        <div className="video-wrapper">
          <iframe
            src={`https://www.loom.com/embed/${currentLesson.id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )
    }
    return (
      <div className="video-wrapper">
        <iframe
          src={`https://www.youtube.com/embed/${currentLesson.id}?rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --neon-green: #00ff88;
          --neon-pink: #ff00aa;
          --neon-blue: #00d4ff;
          --neon-yellow: #ffff00;
          --neon-orange: #ff6600;
          --dark-bg: #0a0a0f;
          --darker-bg: #050508;
          --card-bg: #12121a;
          --card-border: #1a1a2e;
          --text: #ffffff;
          --text-dim: #6a6a8a;
          --sidebar-w: 340px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Rajdhani', sans-serif;
          background: var(--dark-bg);
          color: var(--text);
          overflow-x: hidden;
          line-height: 1.5;
        }

        body::before {
          content: '';
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.08) 0px,
            rgba(0, 0, 0, 0.08) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 9999;
        }

        @keyframes glitch {
          0%, 100% { text-shadow: 2px 0 var(--neon-pink), -2px 0 var(--neon-blue); }
          25% { text-shadow: -2px 0 var(--neon-pink), 2px 0 var(--neon-blue); }
          50% { text-shadow: 2px 2px var(--neon-pink), -2px -2px var(--neon-blue); }
          75% { text-shadow: -2px 2px var(--neon-pink), 2px -2px var(--neon-blue); }
        }

        @keyframes pulse-neon {
          0%, 100% { box-shadow: 0 0 5px var(--neon-green), 0 0 15px rgba(0, 255, 136, 0.2); }
          50% { box-shadow: 0 0 10px var(--neon-green), 0 0 30px rgba(0, 255, 136, 0.4); }
        }

        @keyframes xpFill {
          from { width: 0; }
        }

        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.5; }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .sidebar {
          position: fixed;
          left: 0; top: 0;
          width: var(--sidebar-w);
          height: 100vh;
          background: var(--darker-bg);
          border-right: 1px solid rgba(0, 255, 136, 0.15);
          overflow-y: auto;
          z-index: 100;
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar::-webkit-scrollbar { width: 4px; }
        .sidebar::-webkit-scrollbar-track { background: transparent; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(0, 255, 136, 0.2); border-radius: 4px; }

        .sidebar-header {
          padding: 24px 20px 20px;
          border-bottom: 1px solid rgba(0, 255, 136, 0.1);
          position: sticky;
          top: 0;
          background: var(--darker-bg);
          z-index: 10;
        }

        .sidebar-logo {
          font-family: 'Orbitron', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: var(--neon-green);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .sidebar-sub {
          font-family: 'Press Start 2P', cursive;
          font-size: 7px;
          color: var(--text-dim);
          margin-top: 6px;
          letter-spacing: 1px;
        }

        .player-hud {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(0, 255, 136, 0.2);
          padding: 10px 12px;
          border-radius: 6px;
        }

        .player-hud .avatar {
          width: 34px; height: 34px;
          background: var(--neon-green);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .player-hud .name {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          color: var(--neon-green);
        }

        .player-hud .level {
          font-family: 'Press Start 2P', cursive;
          font-size: 6px;
          color: var(--text-dim);
          margin-top: 2px;
        }

        .xp-section {
          margin-top: 16px;
        }

        .xp-label {
          display: flex;
          justify-content: space-between;
          font-family: 'Press Start 2P', cursive;
          font-size: 6px;
          color: var(--text-dim);
          margin-bottom: 6px;
          letter-spacing: 1px;
        }

        .xp-bar {
          height: 14px;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid var(--neon-green);
          position: relative;
          overflow: hidden;
          border-radius: 2px;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--neon-green), var(--neon-blue));
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .xp-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: slideIn 2.5s ease-in-out infinite;
        }

        .sidebar-nav { padding: 12px 10px 24px; }

        .module-group { margin-bottom: 6px; }

        .module-group-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 9px;
          font-weight: 700;
          color: var(--neon-pink);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          padding: 14px 10px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .module-group-title .mod-num {
          font-family: 'Press Start 2P', cursive;
          font-size: 7px;
          color: var(--dark-bg);
          background: var(--neon-pink);
          padding: 3px 6px;
          border-radius: 2px;
        }

        .lesson-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: var(--text-dim);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 500;
          border-left: 3px solid transparent;
        }

        .lesson-link:hover {
          background: rgba(0, 255, 136, 0.05);
          color: var(--text);
          border-left-color: rgba(0, 255, 136, 0.3);
        }

        .lesson-link.active {
          background: rgba(0, 255, 136, 0.1);
          color: var(--neon-green);
          border-left-color: var(--neon-green);
        }

        .lesson-link.completed { color: var(--text-dim); }

        .lesson-check {
          width: 22px; height: 22px;
          min-width: 22px;
          border: 2px solid var(--card-border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          font-size: 10px;
          background: rgba(0,0,0,0.3);
        }

        .lesson-link.completed .lesson-check {
          background: var(--neon-green);
          border-color: var(--neon-green);
          color: var(--dark-bg);
          font-weight: 700;
        }

        .lesson-link.active .lesson-check {
          border-color: var(--neon-green);
          box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
        }

        .lesson-num {
          font-family: 'Press Start 2P', cursive;
          font-size: 6px;
          color: inherit;
        }

        .main-content {
          margin-left: var(--sidebar-w);
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 30% 10%, rgba(0, 255, 136, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 90%, rgba(255, 0, 170, 0.04) 0%, transparent 50%),
            var(--dark-bg);
        }

        .main-content::before {
          content: '';
          position: fixed;
          top: 0; left: var(--sidebar-w); right: 0; bottom: 0;
          background-image:
            linear-gradient(rgba(0, 255, 136, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.015) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 0;
        }

        .top-bar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(5, 5, 8, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0, 255, 136, 0.1);
          padding: 14px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .breadcrumb {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .breadcrumb .current {
          color: var(--neon-green);
        }

        .nav-buttons { display: flex; gap: 8px; }

        .nav-btn {
          padding: 8px 18px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-dim);
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-btn:hover {
          background: rgba(0, 255, 136, 0.08);
          border-color: rgba(0, 255, 136, 0.3);
          color: var(--text);
        }

        .nav-btn.primary {
          background: transparent;
          border: 2px solid var(--neon-green);
          color: var(--neon-green);
          animation: pulse-neon 3s ease-in-out infinite;
        }

        .nav-btn.primary:hover {
          background: var(--neon-green);
          color: var(--dark-bg);
        }

        .lesson-container {
          max-width: 880px;
          margin: 0 auto;
          padding: 44px 36px 80px;
          position: relative;
          z-index: 1;
          animation: fadeSlideIn 0.4s ease-out;
        }

        .lesson-module-label {
          font-family: 'Press Start 2P', cursive;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--neon-pink);
          margin-bottom: 12px;
          animation: blink 2.5s ease-in-out infinite;
        }

        .lesson-title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 900;
          text-transform: uppercase;
          line-height: 1.15;
          color: var(--text);
          margin-bottom: 32px;
          letter-spacing: 0.5px;
          animation: glitch 4s ease-in-out infinite;
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%;
          overflow: hidden;
          background: var(--card-bg);
          border: 2px solid var(--neon-green);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.15), 0 8px 40px rgba(0, 0, 0, 0.5);
        }

        .video-wrapper iframe {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          border: none;
        }

        .lesson-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid var(--card-border);
          border-top: none;
          margin-bottom: 28px;
        }

        .lesson-type-badge {
          font-family: 'Press Start 2P', cursive;
          font-size: 6px;
          color: var(--neon-blue);
          padding: 4px 8px;
          border: 1px solid var(--neon-blue);
          background: rgba(0, 212, 255, 0.1);
          letter-spacing: 1px;
        }

        .lesson-index-label {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 1px;
        }

        .lesson-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .complete-btn {
          padding: 14px 24px;
          border: 2px solid var(--card-border);
          background: var(--card-bg);
          font-family: 'Orbitron', sans-serif;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-dim);
        }

        .complete-btn.mark:hover {
          border-color: var(--neon-green);
          color: var(--neon-green);
          background: rgba(0, 255, 136, 0.08);
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.15);
        }

        .complete-btn.completed {
          background: var(--neon-green);
          border-color: var(--neon-green);
          color: var(--dark-bg);
        }

        .next-lesson-btn {
          padding: 14px 28px;
          border: 3px solid var(--neon-green);
          background: transparent;
          color: var(--neon-green);
          font-family: 'Orbitron', sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
          animation: pulse-neon 2.5s ease-in-out infinite;
        }

        .next-lesson-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: var(--neon-green);
          transition: left 0.3s ease;
          z-index: -1;
        }

        .next-lesson-btn:hover::before { left: 0; }
        .next-lesson-btn:hover { color: var(--dark-bg); }

        .next-lesson-btn .arrow {
          transition: transform 0.3s ease;
        }
        .next-lesson-btn:hover .arrow {
          transform: translateX(5px);
        }

        .finish-btn {
          padding: 14px 28px;
          border: 3px solid var(--neon-yellow);
          background: var(--neon-yellow);
          color: var(--dark-bg);
          font-family: 'Orbitron', sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: default;
          display: flex;
          align-items: center;
          gap: 10px;
          text-shadow: none;
        }

        .hamburger {
          display: none;
          position: fixed;
          top: 12px; left: 12px;
          z-index: 200;
          width: 42px; height: 42px;
          background: var(--card-bg);
          border: 1px solid rgba(0, 255, 136, 0.3);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
        }

        .hamburger span {
          display: block;
          width: 18px; height: 2px;
          background: var(--neon-green);
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 90;
        }

        @media (max-width: 900px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .main-content { margin-left: 0; }
          .main-content::before { left: 0; }
          .hamburger { display: flex; }
          .overlay.show { display: block; }
          .lesson-container { padding: 28px 16px 60px; }
          .lesson-title { font-size: 22px; }
          .top-bar { padding: 14px 16px 14px 64px; }
          .lesson-actions { flex-direction: column; }
          .lesson-actions > * { width: 100%; justify-content: center; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="hamburger" onClick={toggleSidebar}>
        <span></span><span></span><span></span>
      </div>
      <div className={`overlay ${sidebarOpen ? 'show' : ''}`} onClick={toggleSidebar}></div>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">ADHD PRODUCTIVITY</div>
          <div className="sidebar-sub">► COURSE PLAYER</div>

          <div className="player-hud">
            <div className="avatar">🧠</div>
            <div>
              <div className="name">YOUR BRAIN</div>
              <div className="level">STATUS: {getPlayerStatus()}</div>
            </div>
          </div>

          <div className="xp-section">
            <div className="xp-label">
              <span>COURSE XP</span>
              <span>{completedCount}/{totalLessons} — {xpPercent}%</span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpPercent}%` }}></div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {modules.map((mod, mi) => (
            <div key={mi} className="module-group">
              <div className="module-group-title">
                <span className="mod-num">M{mi + 1}</span> {mod.title}
              </div>
              {mod.lessons.map((lesson, li) => {
                // Calculate global index: sum of lessons in previous modules + current lesson index
                let idx = 0
                for (let i = 0; i < mi; i++) {
                  idx += modules[i].lessons.length
                }
                idx += li
                
                const isActive = idx === currentIndex
                const isDone = completed.has(idx)
                return (
                  <div
                    key={li}
                    className={`lesson-link ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                    onClick={() => goToLesson(idx)}
                  >
                    <div className="lesson-check">
                      {isDone ? '✓' : <span className="lesson-num">{li + 1}</span>}
                    </div>
                    <span>{lesson.title}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="breadcrumb">
            Module {currentLesson.moduleIndex + 1} <span className="current">// {currentLesson.title}</span>
          </div>
          <div className="nav-buttons">
            {currentIndex > 0 && (
              <button className="nav-btn" onClick={prevLesson}>← PREV</button>
            )}
            {!isLast && (
              <button className="nav-btn primary" onClick={nextLesson}>NEXT →</button>
            )}
          </div>
        </div>
        <div className="lesson-container">
          <div className="lesson-module-label">
            ► MODULE {currentLesson.moduleIndex + 1}: {currentLesson.moduleTitle}
          </div>
          <h1 className="lesson-title">{currentLesson.title}</h1>
          {buildVideoHTML()}
          <div className="lesson-status-bar">
            <span className="lesson-type-badge">
              {currentLesson.type === 'loom' ? '► LOOM' : '► YOUTUBE'}
            </span>
            <span className="lesson-index-label">
              LESSON {currentIndex + 1} OF {totalLessons}
            </span>
          </div>
          <div className="lesson-actions">
            <button
              className={`complete-btn ${isCompleted ? 'completed' : 'mark'}`}
              onClick={toggleComplete}
            >
              {isCompleted ? '✓ QUEST COMPLETE' : '○ MARK COMPLETE'}
            </button>
            {isLast ? (
              <div className="finish-btn">★ COURSE COMPLETE ★</div>
            ) : (
              <button className="next-lesson-btn" onClick={nextLesson}>
                <span>► NEXT LESSON</span>
                <span className="arrow">→</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default function ADHDCoursePage() {
  return (
    <CourseEmailGate product="adhd">
      <ADHDCourseContent />
    </CourseEmailGate>
  )
}

