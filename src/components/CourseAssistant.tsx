// components/CourseAssistant.tsx
// ================================
// AI chat component that helps with course content

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

// Format assistant message: remove markdown bold, format ALL CAPS headlines
function formatAssistantMessage(text: string): string {
  // First, remove markdown bold syntax (**text**) and convert to plain text
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Split into lines and process each
  const lines = formatted.split('\n');
  const processedLines: string[] = [];
  let lastWasEmpty = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Empty lines - skip them entirely (no spacing between paragraphs)
    if (!trimmed) {
      lastWasEmpty = true;
      continue;
    }
    
    // If previous line was empty and this is a regular line, add a small space
    if (lastWasEmpty && processedLines.length > 0) {
      // Only add a small margin-top to create paragraph separation
      processedLines.push('<span style="display: block; margin-top: 0.5em;"></span>');
    }
    
    lastWasEmpty = false;
    
    // Check if line looks like a headline:
    // - At least 3 characters
    // - Mostly uppercase letters (at least 60% of alphabetic chars are uppercase)
    // - May contain numbers, spaces, parentheses, colons, dashes
    const alphaChars = trimmed.match(/[A-Za-z]/g) || [];
    const upperChars = trimmed.match(/[A-Z]/g) || [];
    const isMostlyCaps = alphaChars.length > 0 && (upperChars.length / alphaChars.length) >= 0.6;
    const hasMinLength = trimmed.length >= 3;
    const matchesHeadlinePattern = /^[A-Z0-9\s():-]+$/.test(trimmed);
    
    if (hasMinLength && matchesHeadlinePattern && isMostlyCaps) {
      // It's a headline - make it bold with minimal spacing
      const marginTop = i > 0 && lines[i - 1].trim() ? '0.6em' : '0.2em';
      processedLines.push(`<div style="font-weight: 600; font-size: 1.05em; margin-top: ${marginTop}; margin-bottom: 0.2em; color: rgba(255,255,255,0.95); line-height: 1.4;">${trimmed}</div>`);
    } else {
      // Regular line - escape HTML and preserve, wrap in span for line breaks
      const escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      processedLines.push(`<span style="display: block; line-height: 1.5;">${escaped}</span>`);
    }
  }
  
  return processedLines.join('');
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CourseAssistantProps {
  lessonId?: string;      // Current lesson ID for context
  lessonTitle?: string;   // Display name of current lesson
  moduleName?: string;    // Display name of current module
}

export default function CourseAssistant({ 
  lessonId, 
  lessonTitle,
  moduleName 
}: CourseAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        // Get all conversations for this user
        const convResponse = await fetch('/api/course-assistant/conversations');
        if (!convResponse.ok) {
          throw new Error('Failed to load conversations');
        }

        const convData = await convResponse.json();
        const conversations = convData.conversations || [];

        // Find the most recent conversation for this lesson (or any conversation if no lessonId)
        const relevantConv = conversations.find((conv: any) => 
          lessonId ? conv.lesson_id === lessonId : true
        ) || conversations[0]; // Fall back to most recent if no lesson match

        if (relevantConv) {
          setConversationId(relevantConv.id);

          // Load messages for this conversation
          const messagesResponse = await fetch(`/api/course-assistant/conversations/${relevantConv.id}`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            const loadedMessages = messagesData.messages || [];

            // Format messages: format assistant messages, keep user messages as-is
            const formattedMessages = loadedMessages.map((msg: any) => {
              if (msg.role === 'assistant') {
                return {
                  role: 'assistant',
                  content: formatAssistantMessage(msg.content),
                };
              }
              return {
                role: msg.role,
                content: msg.content,
              };
            });

            if (formattedMessages.length > 0) {
              setMessages(formattedMessages);
              return; // Don't show welcome message if we have history
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        // Fall through to show welcome message
      }

      // If no conversation found, show welcome message
      const welcomeMessage = lessonTitle 
        ? `Hi! I'm your Dream Job course assistant. I see you're on "${lessonTitle}" in ${moduleName}. Ask me anything about this lesson or the course in general!`
        : `Hi! I'm your Dream Job course assistant. Ask me anything about the course material!`;
      
      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
      }]);
    };

    loadConversation();
  }, [lessonId, lessonTitle, moduleName]);

  // Save a message to the database
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!conversationId) return; // No conversation yet, skip saving

    try {
      await fetch(`/api/course-assistant/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't block UI if saving fails
    }
  };

  // Create or get conversation
  const ensureConversation = async (firstMessage?: string): Promise<string | null> => {
    if (conversationId) return conversationId;

    try {
      const title = firstMessage ? firstMessage.substring(0, 50) : 'New Conversation';
      const response = await fetch('/api/course-assistant/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          lessonTitle,
          moduleName,
          title,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation.id);
        return data.conversation.id;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Ensure we have a conversation
    const convId = await ensureConversation(userMessage);
    
    // Add user message
    const userMsg = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    
    // Save user message
    if (convId) {
      saveMessage('user', userMessage);
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/course-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          lessonId,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          conversationId: convId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to get response');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Format the message: convert markdown bold to HTML, format ALL CAPS headlines
      const formattedMessage = formatAssistantMessage(data.message || 'Sorry, I encountered an error. Please try again.');
      
      const assistantMsg = {
        role: 'assistant' as const,
        content: formattedMessage,
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      // Save assistant message (save original, not formatted HTML)
      if (convId || data.conversationId) {
        const finalConvId = convId || data.conversationId;
        if (finalConvId) {
          setConversationId(finalConvId);
          // Save the original message text, not the formatted HTML
          saveMessage('assistant', data.message || '');
        }
      }

    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error?.message || 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick prompts based on current lesson
  const quickPrompts: string[] = [];

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] rounded-lg">
      {/* Header - Removed since it's in the drawer header */}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f0f1a]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🤖</span>
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.9)] border border-[rgba(255,255,255,0.1)]'
              }`}
            >
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <div className="bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
              <p className="text-[rgba(255,255,255,0.6)]">Thinking...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && quickPrompts.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[rgba(255,255,255,0.5)] mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-xs px-3 py-1.5 bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] rounded-full hover:bg-[rgba(255,255,255,0.15)] transition border border-[rgba(255,255,255,0.1)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(26,26,46,0.8)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about the course..."
            className="flex-1 bg-[rgba(255,255,255,0.05)] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 border border-[rgba(255,255,255,0.1)] placeholder-[rgba(255,255,255,0.4)]"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

