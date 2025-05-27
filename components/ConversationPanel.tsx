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

  const getStatusVariant = () => {
    if (state.speakingState.ai1 || state.speakingState.ai2) return 'default'
    if (state.typingIndicator.ai1 || state.typingIndicator.ai2) return 'secondary'
    if (state.isActive) return 'default'
    return 'outline'
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
        <div className="text-sm leading-relaxed">{message.content}</div>
        {message.model && (
          <div className="model-badge">{message.model}</div>
        )}
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            {isSharedView ? 'Shared Conversation' : 'Conversation'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isSharedView && (
              <>
                {!state.isActive && state.messages.length > 0 && onShare && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onShare}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                )}
                {hasAudio && onPlayAudio && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onPlayAudio}
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
                variant="outline"
                onClick={onPlayAudio}
              >
                <Play className="h-4 w-4 mr-1" />
                Play
              </Button>
            )}
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full bg-muted/30 rounded-lg p-4 overflow-y-auto custom-scrollbar flex flex-col">
          {state.messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No conversation yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isSharedView 
                    ? "This shared conversation appears to be empty."
                    : "Start a conversation to see messages appear here."
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}