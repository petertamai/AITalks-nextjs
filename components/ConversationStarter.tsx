'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Play, Square, AlertCircle } from 'lucide-react'
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
    if (!startingMessage.trim()) {
      alert('Please provide a starting message.')
      return
    }

    if (!ai1Config?.model || !ai2Config?.model) {
      alert('Please select models for both AI agents in the settings first.')
      return
    }

    if (state.isActive) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Starter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Warning */}
        {validationMessage && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{validationMessage}</span>
          </div>
        )}

        {/* Current Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Agent 1</Label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-mono truncate">
                {ai1Config?.model || 'Not selected'}
              </div>
              <div className="text-xs text-muted-foreground">
                {ai1Config?.name || 'AI-1'}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Agent 2</Label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-mono truncate">
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
          <Label className="text-sm font-medium">Message Direction</Label>
          <RadioGroup
            value={direction}
            onValueChange={(value) => setDirection(value as ConversationDirection)}
            className="flex flex-wrap gap-4"
            disabled={state.isActive || isStarting}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="human-to-ai1" id="human-to-ai1" />
              <Label htmlFor="human-to-ai1" className="text-sm">Human → AI-1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ai1-to-ai2" id="ai1-to-ai2" />
              <Label htmlFor="ai1-to-ai2" className="text-sm">AI-1 → AI-2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="human-to-ai2" id="human-to-ai2" />
              <Label htmlFor="human-to-ai2" className="text-sm">Human → AI-2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ai2-to-ai1" id="ai2-to-ai1" />
              <Label htmlFor="ai2-to-ai1" className="text-sm">AI-2 → AI-1</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Starting Message */}
        <div className="space-y-2">
          <Label htmlFor="message" className="text-sm font-medium">Starting Message</Label>
          <Textarea
            id="message"
            value={startingMessage}
            onChange={(e) => setStartingMessage(e.target.value)}
            placeholder="Enter the message that will start the conversation..."
            className="min-h-[100px]"
            disabled={state.isActive || isStarting}
          />
          <div className="text-xs text-muted-foreground">
            {startingMessage.length} characters
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="font-medium"
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Conversation
          </Button>
        </div>

        {/* Debug Info */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Debug Info</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
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
        </details>
      </CardContent>
    </Card>
  )
}