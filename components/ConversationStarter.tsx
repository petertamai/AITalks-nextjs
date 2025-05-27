'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Play, Square } from 'lucide-react'
import { ConversationDirection } from '@/types'
import { useConversation } from '@/contexts/ConversationContext'

interface ConversationStarterProps {
  onStartConversation: (direction: ConversationDirection, message: string) => void
}

export default function ConversationStarter({ onStartConversation }: ConversationStarterProps) {
  const { state, stopConversation } = useConversation()
  const [direction, setDirection] = useState<ConversationDirection>('ai1-to-ai2')
  const [startingMessage, setStartingMessage] = useState(
    "Hello! I'm excited to chat with you today. What interests you the most about artificial intelligence?"
  )

  const handleStart = () => {
    if (!startingMessage.trim()) {
      alert('Please provide a starting message.')
      return
    }
    onStartConversation(direction, startingMessage.trim())
  }

  const handleStop = () => {
    stopConversation('Conversation stopped')
  }

  return (
    <Card className="bg-gray-700 border-gray-600">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Conversation Starter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-white mb-2 block">Message Direction</Label>
          <RadioGroup
            value={direction}
            onValueChange={(value) => setDirection(value as ConversationDirection)}
            className="flex flex-wrap gap-4"
            disabled={state.isActive}
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
            onChange={(e) => setStartingMessage(e.target.value)}
            placeholder="Enter the message that will start the conversation..."
            className="bg-gray-800 border-gray-600 text-white h-24 lg:h-48"
            disabled={state.isActive}
          />
        </div>

        <div className="flex justify-between">
          <Button
            onClick={handleStart}
            disabled={state.isActive || !startingMessage.trim()}
            className="bg-custom-btn hover:bg-blue-600 font-bold"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Conversation
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
      </CardContent>
    </Card>
  )
}