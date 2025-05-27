'use client'

import React from 'react'

export default function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span className="animate-blink" style={{ animationDelay: '0.3333s' }}></span>
      <span className="animate-blink" style={{ animationDelay: '0.6666s' }}></span>
      <span className="animate-blink" style={{ animationDelay: '0.9999s' }}></span>
    </div>
  )
}