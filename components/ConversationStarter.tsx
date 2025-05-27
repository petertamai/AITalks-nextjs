'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Play, Square, AlertCircle, Sparkles, Bot, User, ArrowRight } from 'lucide-react'
import { ConversationDirection } from '@/types'
import { useConversation } from '@/contexts/ConversationContext'

interface ConversationStarterProps {
  onStartConversation: (direction: ConversationDirection, message: string) => void
  ai1Config?: { model: string; name: string }
  ai2Config?: { model: string; name: string }
}

export default function ConversationStarter({ 
  onStartConversation, 
  ai1Config, 
  ai2Config 
}: ConversationStarterProps) {
  const { state, stopConversation } = useConversation()
  const [direction, setDirection] = useState<ConversationDirection>('ai1-to-ai2')
  const [startingMessage, setStartingMessage] = useState(
    "Hello! I'm excited to chat with you today. What interests you the most about artificial intelligence?"
  )
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    console.log('🚀 Start Conversation clicked!')

    // Validation with detailed logging
    if (!startingMessage.trim()) {
      console.log('❌ Validation failed: Empty message')
      alert('Please provide a starting message.')
      return
    }

    // Check if models are provided
    if (!ai1Config?.model || !ai2Config?.model) {
      console.log('⚠️ Models not configured:', {
        ai1: ai1Config?.model || 'Missing',
        ai2: ai2Config?.model || 'Missing'
      })
      alert('Please select models for both AI agents in the settings first.')
      return
    }

    if (state.isActive) {
      console.log('⚠️ Conversation already active')
      alert('Conversation is already active. Stop it first.')
      return
    }

    try {
      setIsStarting(true)
      await onStartConversation(direction, startingMessage.trim())
    } catch (error) {
      console.error('❌ Error starting conversation:', error)
      alert(`Failed to start conversation: ${error}`)
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = () => {
    console.log('🛑 Stop Conversation clicked!')
    stopConversation('Conversation stopped by user')
  }

  const getValidationMessage = () => {
    if (!ai1Config?.model && !ai2Config?.model) {
      return 'Configure both AI models in Settings first'
    }
    if (!ai1Config?.model) {
      return 'Configure AI-1 model in Settings first'
    }
    if (!ai2Config?.model) {
      return 'Configure AI-2 model in Settings first'
    }
    if (!startingMessage.trim()) {
      return 'Enter a starting message'
    }
    return null
  }

  const validationMessage = getValidationMessage()
  const canStart = !validationMessage && !state.isActive && !isStarting

  const getDirectionIcon = (dir: ConversationDirection) => {
    switch (dir) {
      case 'human-to-ai1':
        return (
          <div className="flex items-center gap-1 text-xs">
            <User className="w-3 h-3" />
            <ArrowRight className="w-3 h-3" />
            <Bot className="w-3 h-3" />
          </div>
        )
      case 'ai1-to-ai2':
        return (
          <div className="flex items-center gap-1 text-xs">
            <Bot className="w-3 h-3 text-message-ai1" />
            <ArrowRight className="w-3 h-3" />
            <Bot className="w-3 h-3 text-message-ai2" />
          </div>
        )
      case 'human-to-ai2':
        return (
          <div className="flex items-center gap-1 text-xs">
            <User className="w-3 h-3" />
            <ArrowRight className="w-3 h-3" />
            <Bot className="w-3 h-3" />
          </div>
        )
      case 'ai2-to-ai1':
        return (
          <div className="flex items-center gap-1 text-xs">
            <Bot className="w-3 h-3 text-message-ai2" />
            <ArrowRight className="w-3 h-3" />
            <Bot className="w-3 h-3 text-message-ai1" />
          </div>
        )
    }
  }

  return (
    <Card className="modern-card border-border/50 shadow-strong">
      <CardHeader className="pb-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Conversation Starter
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure and start your AI conversation
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Validation Warning */}
        {validationMessage && (
          <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-destructive mb-1">Setup Required</h4>
              <span className="text-sm text-destructive/80">{validationMessage}</span>
            </div>
          </div>
        )}

        {/* Current Configuration Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass p-4 rounded-lg border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-message-ai1" />
              <label className="text-sm font-medium text-foreground">AI Agent 1</label>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-mono text-muted-foreground truncate">
                {ai1Config?.model || 'Not selected'}
              </div>
              <div className="text-xs text-muted-foreground">
                {ai1Config?.name || 'AI-1'}
              </div>
            </div>
          </div>
          
          <div className="glass p-4 rounded-lg border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-message-ai2" />
              <label className="text-sm font-medium text-foreground">AI Agent 2</label>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-mono text-muted-foreground truncate">
                {ai2Config?.model || 'Not selected'}
              </div>
              <div className="text-xs text-muted-foreground">
                {ai2Config?.name || 'AI-2'}
              </div>
            </div>
          </div>
        </div>

        {/* Message Direction */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Message Direction</Label>
          <RadioGroup
            value={direction}
            onValueChange={(value) => setDirection(value as ConversationDirection)}
            className="grid grid-cols-2 gap-3"
            disabled={state.isActive || isStarting}
          >
            <div className="relative">
              <RadioGroupItem 
                value="human-to-ai1" 
                id="human-to-ai1" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="human-to-ai1" 
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border/30 cursor-pointer transition-all hover:border-border/60 peer-checked:border-primary peer-checked:bg-primary/5"
              >
                {getDirectionIcon('human-to-ai1')}
                <span className="text-sm font-medium">Human → AI-1</span>
              </Label>
            </div>
            
            <div className="relative">
              <RadioGroupItem 
                value="ai1-to-ai2" 
                id="ai1-to-ai2" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="ai1-to-ai2" 
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border/30 cursor-pointer transition-all hover:border-border/60 peer-checked:border-primary peer-checked:bg-primary/5"
              >
                {getDirectionIcon('ai1-to-ai2')}
                <span className="text-sm font-medium">AI-1 → AI-2</span>
              </Label>
            </div>
            
            <div className="relative">
              <RadioGroupItem 
                value="human-to-ai2" 
                id="human-to-ai2" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="human-to-ai2" 
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border/30 cursor-pointer transition-all hover:border-border/60 peer-checked:border-primary peer-checked:bg-primary/5"
              >
                {getDirectionIcon('human-to-ai2')}
                <span className="text-sm font-medium">Human → AI-2</span>
              </Label>
            </div>
            
            <div className="relative">
              <RadioGroupItem 
                value="ai2-to-ai1" 
                id="ai2-to-ai1" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="ai2-to-ai1" 
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border/30 cursor-pointer transition-all hover:border-border/60 peer-checked:border-primary peer-checked:bg-primary/5"
              >
                {getDirectionIcon('ai2-to-ai1')}
                <span className="text-sm font-medium">AI-2 → AI-1</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Starting Message */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Starting Message</Label>
          <div className="relative">
            <Textarea
              value={startingMessage}
              onChange={(e) => setStartingMessage(e.target.value)}
              placeholder="Enter the message that will start the conversation..."
              className="min-h-[120px] resize-none focus-modern bg-background/50 border-border/50"
              disabled={state.isActive || isStarting}
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {startingMessage.length} characters
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className={`btn-modern flex-1 h-11 font-medium transition-all duration-200 ${
              canStart 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Conversation
              </>
            )}
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={!state.isActive}
            variant="destructive"
            className="btn-modern h-11 font-medium px-8"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Debug Info - collapsible */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">
            Debug Information
          </summary>
          <div className="mt-3 p-3 bg-muted/20 rounded-lg font-mono text-xs">
            <pre className="whitespace-pre-wrap overflow-auto">
{JSON.stringify({
  isActive: state.isActive,
  isStarting,
  canStart,
  direction,
  messageLength: startingMessage.length,
  ai1Model: ai1Config?.model || 'missing',
  ai2Model: ai2Config?.model || 'missing',
  validationMessage
}, null, 2)}
            </pre>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}