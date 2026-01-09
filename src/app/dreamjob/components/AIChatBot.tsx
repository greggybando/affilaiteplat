'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatBotProps {
  userName: string
}

export function AIChatBot({ userName }: AIChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hey ${userName}! 👋 I'm Matt's AI assistant for the Dream Job course. I'm here to help you land your dream job - no BS, just real advice. Ask me anything about the course, projects, outreach, or whatever you're stuck on. Let's get you that job!`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/course-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error. Please try again.'
      }])
    } catch (error) {
      console.error('Error calling AI assistant:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again in a moment.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* DEBUG: Test marker */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        background: 'red',
        color: 'white',
        padding: '20px',
        zIndex: 999999,
        fontSize: '20px',
        fontWeight: 'bold',
        borderRadius: '10px'
      }}>
        AI BOT HERE
      </div>

      {/* Chat Button */}
      <button
        onClick={() => {
          console.log('AI Chat button clicked!')
          setIsOpen(!isOpen)
        }}
        className="w-20 h-20 rounded-full animate-bounce"
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: 'linear-gradient(135deg, #ff0000, #ff6600)',
          border: '5px solid yellow',
          boxShadow: '0 0 60px rgba(255,0,0,1)',
          cursor: 'pointer'
        }}
      >
        <div style={{ fontSize: '40px' }}>💬</div>
      </button>

      {/* Chat Window */}
      <div
        className={`
          w-[400px] h-[550px]
          rounded-2xl shadow-2xl
          flex flex-col overflow-hidden
          border
          transition-all duration-300 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
        `}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          pointerEvents: isOpen ? 'auto' : 'none',
          background: 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(6,182,212,0.3)',
          boxShadow: '0 0 40px rgba(6,182,212,0.4), 0 8px 32px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))',
            borderColor: 'rgba(6,182,212,0.3)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.4), rgba(59,130,246,0.4))',
                boxShadow: '0 0 20px rgba(6,182,212,0.5)'
              }}
            >
              <svg className="w-5 h-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Matt's Dream Job AI</h3>
              <p className="text-cyan-300 text-xs">Always here to help</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[rgba(255,255,255,0.7)] hover:text-white transition-colors p-1 hover:bg-[rgba(255,255,255,0.1)] rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ background: 'rgba(15,23,42,0.6)' }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-4 py-3 rounded-2xl text-sm
                  ${message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}
                `}
                style={message.role === 'user' ? {
                  background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(6,182,212,0.3)'
                } : {
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0'
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div 
                className="px-4 py-3 rounded-2xl rounded-bl-md"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form 
          onSubmit={handleSubmit} 
          className="p-4 border-t"
          style={{
            background: 'rgba(15,23,42,0.8)',
            borderColor: 'rgba(6,182,212,0.2)'
          }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about the course..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(6,182,212,0.4)'
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </>
  )
}






