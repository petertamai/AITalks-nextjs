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
    console.log('🚀 Start Conversation clicked!')
    console.log('📋 Current config:', {
      ai1Model: ai1Config?.model || 'Not provided',
      ai2Model: ai2Config?.model || 'Not provided',
      direction,
      messageLength: startingMessage.trim().length,
      isActive: state.isActive
    })

    // Validation with detailed logging
    if (!startingMessage.trim()) {
      console.log('❌ Validation failed: Empty message')
      alert('Please provide a starting message.')
      return
    }

    // Check if models are provided (but don't block if not - let main component handle)
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
      console.log('🎬 Starting conversation with:', {
        direction,
        message: startingMessage.substring(0, 50) + '...',
        ai1: ai1Config.name,
        ai2: ai2Config.name
      })

      await onStartConversation(direction, startingMessage.trim())
      console.log('✅ Conversation start request completed')
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

  return (
    <Card className="bg-gray-700 border-gray-600">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Conversation Starter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Warning */}
        {validationMessage && (
          <div className="flex items-center gap-2 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-200 text-sm">{validationMessage}</span>
          </div>
        )}

        {/* Current Configuration Display */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-800 rounded-lg">
          <div>
            <label className="text-xs text-gray-400">AI-1 Model</label>
            <div className="text-sm text-white font-mono truncate">
              {ai1Config?.model || 'Not selected'}
            </div>
            <div className="text-xs text-gray-400">
              {ai1Config?.name || 'AI-1'}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">AI-2 Model</label>
            <div className="text-sm text-white font-mono truncate">
              {ai2Config?.model || 'Not selected'}
            </div>
            <div className="text-xs text-gray-400">
              {ai2Config?.name || 'AI-2'}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-white mb-2 block">Message Direction</Label>
          <RadioGroup
            value={direction}
            onValueChange={(value) => {
              console.log('📍 Direction changed to:', value)
              setDirection(value as ConversationDirection)
            }}
            className="flex flex-wrap gap-4"
            disabled={state.isActive || isStarting}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="human-to-ai1" id="human-to-ai1" />
              <Label htmlFor="human-to-ai1" className="text-sm text-white">Human → AI-1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ai1-to-ai2" id="ai1-to-ai2" />
              <Label htmlFor="ai1-to-ai2" className="text-sm text-white">AI-1 → AI-2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="human-to-ai2" id="human-to-ai2" />
              <Label htmlFor="human-to-ai2" className="text-sm text-white">Human → AI-2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ai2-to-ai1" id="ai2-to-ai1" />
              <Label htmlFor="ai2-to-ai1" className="text-sm text-white">AI-2 → AI-1</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm font-medium text-white mb-2 block">Starting Message</Label>
          <Textarea
            value={startingMessage}
            onChange={(e) => {
              console.log('📝 Message changed, length:', e.target.value.length)
              setStartingMessage(e.target.value)
            }}
            placeholder="Enter the message that will start the conversation..."
            className="bg-gray-800 border-gray-600 text-white h-24 lg:h-48"
            disabled={state.isActive || isStarting}
          />
          <div className="text-xs text-gray-400 mt-1">
            {startingMessage.length} characters
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className={`font-bold ${
              canStart 
                ? 'bg-custom-btn hover:bg-blue-600' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
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
            className="font-bold"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Conversation
          </Button>
        </div>

        {/* Debug Info */}
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-white">Debug Info</summary>
          <pre className="mt-2 p-2 bg-black rounded text-green-400 overflow-auto">
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