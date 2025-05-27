'use client'

import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConversation } from '@/contexts/ConversationContext'
import { ConversationMessage } from '@/types'
import { Play, Square, Share2 } from 'lucide-react'
import TypingIndicator from './TypingIndicator'

interface ConversationPanelProps {
  onShare?: () => void
  onPlayAudio?: () => void
  hasAudio?: boolean
  isSharedView?: boolean
}

export default function ConversationPanel({ 
  onShare, 
  onPlayAudio, 
  hasAudio = false,
  isSharedView = false 
}: ConversationPanelProps) {
  const { state } = useConversation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  const getStatusText = () => {
    if (state.speakingState.ai1) return 'AI-1 is speaking'
    if (state.speakingState.ai2) return 'AI-2 is speaking'
    if (state.typingIndicator.ai1) return 'AI-1 is thinking'
    if (state.typingIndicator.ai2) return 'AI-2 is thinking'
    if (state.isActive) return 'Active'
    if (isSharedView) return 'Viewing'
    return 'Idle'
  }

  const getStatusColor = () => {
    if (state.speakingState.ai1 || state.speakingState.ai2) return 'bg-green-600'
    if (state.typingIndicator.ai1 || state.typingIndicator.ai2) return 'bg-yellow-600'
    if (state.isActive) return 'bg-blue-600'
    return 'bg-gray-600'
  }

  const renderMessage = (message: ConversationMessage, index: number) => {
    let messageClass = 'chat-message'
    let agentName = 'Human'

    if (message.agent === 'ai1') {
      messageClass += ' ai1'
      agentName = 'AI-1'
    } else if (message.agent === 'ai2') {
      messageClass += ' ai2'
      agentName = 'AI-2'
    } else if (message.role === 'system') {
      messageClass += ' system'
      agentName = 'System'
    } else {
      messageClass += ' human'
    }

    const isSpeaking = (message.agent === 'ai1' && state.speakingState.ai1) ||
                     (message.agent === 'ai2' && state.speakingState.ai2)

    return (
      <div
        key={message.id}
        className={`${messageClass} ${isSpeaking ? 'speaking' : ''}`}
        data-index={index}
      >
        <div className="agent-name">{agentName}</div>
        <div className="message-text">{message.content}</div>
        {message.model && (
          <div className="model-badge">{message.model}</div>
        )}
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full bg-gray-700 border-gray-600">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white">
            {isSharedView ? 'Shared Conversation' : 'Conversation'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isSharedView && (
              <>
                {!state.isActive && state.messages.length > 0 && onShare && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onShare}
                    className="bg-gray-600 hover:bg-gray-500"
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                )}
                {hasAudio && onPlayAudio && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onPlayAudio}
                    className="bg-gray-600 hover:bg-gray-500"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Play
                  </Button>
                )}
              </>
            )}
            {isSharedView && hasAudio && onPlayAudio && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onPlayAudio}
                className="bg-gray-600 hover:bg-gray-500"
              >
                <Play className="h-4 w-4 mr-1" />
                Play
              </Button>
            )}
            <Badge className={`text-xs px-2 py-1 ${getStatusColor()}`}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-3">
        <div className="h-full bg-gray-800 rounded-lg p-3 overflow-y-auto custom-scrollbar flex flex-col">
          {state.messages.map(renderMessage)}
          
          {/* Typing Indicators */}
          {state.typingIndicator.ai1 && (
            <div className="self-start">
              <TypingIndicator />
            </div>
          )}
          {state.typingIndicator.ai2 && (
            <div className="self-end">
              <TypingIndicator />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
    </Card>
  )
}