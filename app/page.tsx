'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, Bug } from 'lucide-react'
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext'
import ConversationPanel from '@/components/ConversationPanel'
import ConversationStarter from '@/components/ConversationStarter'
import SettingsPanel from '@/components/SettingsPanel'
import { AIAgent, ConversationDirection, OpenRouterResponse } from '@/types'
import { generateId, calculateSpeakingTime, debugLog } from '@/lib/utils'

const DEFAULT_AI1_CONFIG: AIAgent = {
  id: 'ai1',
  name: 'AI-1',
  model: '',
  prompt: "You are a curious and friendly AI who loves asking questions. You're having a conversation with another AI. Keep your responses brief and engaging. Ask follow-up questions. Answer short to the point.",
  maxTokens: 1200,
  temperature: 0.5,
  tts: {
    enabled: false,
    voice: 'Arista-PlayAI',
  },
}

const DEFAULT_AI2_CONFIG: AIAgent = {
  id: 'ai2',
  name: 'AI-2',
  model: '',
  prompt: "You are a knowledgeable and thoughtful AI. You're having a conversation with another AI. Respond to questions with interesting facts and insights. Keep responses concise. Answer short to the point.",
  maxTokens: 1200,
  temperature: 0.5,
  tts: {
    enabled: false,
    voice: 'Angelo-PlayAI',
  },
}

function MainApp() {
  const { 
    state, 
    addMessage, 
    startConversation, 
    stopConversation, 
    setTypingIndicator, 
    setSpeakingState, 
    clearMessages 
  } = useConversation()
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [ai1Config, setAI1Config] = useState<AIAgent>(DEFAULT_AI1_CONFIG)
  const [ai2Config, setAI2Config] = useState<AIAgent>(DEFAULT_AI2_CONFIG)
  const [conversationId, setConversationId] = useState('')
  const [hasAudio, setHasAudio] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  
  const audioElements = useRef<{ [key: string]: HTMLAudioElement }>({
    ai1: new Audio(),
    ai2: new Audio(),
  })

  useEffect(() => {
    setConversationId(generateId())
  }, [])

  const log = (message: string, data?: any) => {
    debugLog(message, data)
    setDebugLogs(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const getAIResponse = async (
    aiId: 'ai1' | 'ai2',
    prompt: string,
    conversationHistory: any[] = []
  ) => {
    const config = aiId === 'ai1' ? ai1Config : ai2Config
    const otherConfig = aiId === 'ai1' ? ai2Config : ai1Config
    
    const messages = [
      {
        role: 'system',
        content: `${config.prompt} You are ${config.name} and you are talking to ${otherConfig.name}. Keep your responses concise and engaging.`
      },
      ...conversationHistory.slice(-10),
      {
        role: 'user',
        content: prompt,
        name: otherConfig.name
      }
    ]

    const response = await fetch('/api/openrouter/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // This ensures cookies are sent
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: OpenRouterResponse = await response.json()
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    } else {
      throw new Error('Invalid response format from API')
    }
  }

  const speakText = async (aiId: 'ai1' | 'ai2', text: string, messageIndex: number) => {
    const config = aiId === 'ai1' ? ai1Config : ai2Config
    
    if (!config.tts.enabled) {
      log(`TTS disabled for ${aiId}, skipping speech`)
      return
    }

    try {
      setSpeakingState(aiId, true)
      
      const response = await fetch('/api/groq/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This ensures cookies are sent
        body: JSON.stringify({
          voice: config.tts.voice,
          input: text,
          conversation_id: conversationId,
          message_index: messageIndex,
          agent: aiId,
        }),
      })

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audioElement = audioElements.current[aiId]

      return new Promise<void>((resolve) => {
        const speakingTime = calculateSpeakingTime(text)
        
        audioElement.src = audioUrl
        audioElement.onended = () => {
          setSpeakingState(aiId, false)
          URL.revokeObjectURL(audioUrl)
          setHasAudio(true)
          resolve()
        }
        
        audioElement.onerror = () => {
          setSpeakingState(aiId, false)
          URL.revokeObjectURL(audioUrl)
          setTimeout(resolve, speakingTime)
        }

        // Fallback timer
        setTimeout(() => {
          if (!audioElement.paused && !audioElement.ended) {
            audioElement.pause()
            setSpeakingState(aiId, false)
            URL.revokeObjectURL(audioUrl)
            resolve()
          }
        }, speakingTime + 500)

        audioElement.play().catch(() => {
          setSpeakingState(aiId, false)
          setTimeout(resolve, 1000)
        })
      })
    } catch (error) {
      log(`Error in speakText: ${error}`)
      setSpeakingState(aiId, false)
      return new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const addThinkingDelay = async (aiId: 'ai1' | 'ai2') => {
    setTypingIndicator(aiId, true)
    const thinkingTime = 1000 + Math.random() * 2000
    await new Promise(resolve => setTimeout(resolve, thinkingTime))
  }

  const processTurn = async (
    currentAi: 'ai1' | 'ai2',
    message: string,
    isFirstMessage = false
  ): Promise<void> => {
    if (!state.isActive) return

    try {
      await addThinkingDelay(currentAi)
      
      if (!state.isActive) {
        setTypingIndicator(currentAi, false)
        return
      }

      const response = await getAIResponse(currentAi, message, [])
      
      // Check for #END# condition
      if (response && response.includes('#END#')) {
        log(`AI ${currentAi} responded with #END#. Ending conversation.`)
        setTypingIndicator(currentAi, false)
        stopConversation('Conversation has ended')
        return
      }

      setTypingIndicator(currentAi, false)

      if (!response || response.trim() === '') {
        throw new Error(`Empty response from ${currentAi}`)
      }

      const messageIndex = state.messages.length
      addMessage({
        role: 'assistant',
        content: response,
        agent: currentAi,
        model: currentAi === 'ai1' ? ai1Config.model : ai2Config.model,
      })

      // Speak the response
      await speakText(currentAi, response, messageIndex)

      if (!state.isActive) return

      // Brief pause between turns
      await new Promise(resolve => setTimeout(resolve, 800))

      // Determine next step
      const direction = getCurrentDirection()
      
      if ((direction === 'human-to-ai1' && currentAi === 'ai1') ||
          (direction === 'human-to-ai2' && currentAi === 'ai2')) {
        stopConversation('Conversation ended')
        return
      }

      // Continue conversation
      const otherAi = currentAi === 'ai1' ? 'ai2' : 'ai1'
      await processTurn(otherAi, response, false)
      
    } catch (error) {
      log(`Error in processTurn for ${currentAi}: ${error}`)
      setTypingIndicator(currentAi, false)
      setSpeakingState(currentAi, false)
      
      if (state.isActive) {
        addMessage({
          role: 'system',
          content: `An error occurred: ${error}. Stopping conversation.`,
        })
        stopConversation('Conversation stopped due to error')
      }
    }
  }

  const getCurrentDirection = (): ConversationDirection => {
    // This would normally come from state, using default for now
    return 'ai1-to-ai2'
  }

  const handleStartConversation = async (direction: ConversationDirection, message: string) => {
    if (!ai1Config.model || !ai2Config.model) {
      alert('Please select models for both AI agents in the settings.')
      return
    }

    log('Starting conversation')
    clearMessages()
    startConversation()
    setConversationId(generateId())
    setHasAudio(false)

    let sender: 'ai1' | 'ai2' | 'human'
    let receiver: 'ai1' | 'ai2'

    if (direction === 'human-to-ai1') {
      sender = 'human'
      receiver = 'ai1'
    } else if (direction === 'human-to-ai2') {
      sender = 'human'
      receiver = 'ai2'
    } else if (direction === 'ai1-to-ai2') {
      sender = 'ai1'
      receiver = 'ai2'
    } else {
      sender = 'ai2'
      receiver = 'ai1'
    }

    // Add initial message
    addMessage({
      role: sender === 'human' ? 'human' : 'assistant',
      content: message,
      agent: sender === 'human' ? undefined : sender,
      model: sender === 'ai1' ? ai1Config.model : sender === 'ai2' ? ai2Config.model : undefined,
    })

    try {
      await processTurn(receiver, message, true)
    } catch (error) {
      log(`Error starting conversation: ${error}`)
      addMessage({
        role: 'system',
        content: `Failed to start conversation: ${error}`,
      })
      stopConversation('Conversation failed to start')
    }
  }

  const handleShareConversation = async () => {
    if (state.messages.length === 0) {
      alert('No conversation to share')
      return
    }

    try {
      const conversationData = {
        id: conversationId,
        settings: {
          messageDirection: 'ai1-to-ai2' as ConversationDirection,
          models: {
            ai1: ai1Config.model,
            ai2: ai2Config.model,
          },
          names: {
            ai1: ai1Config.name,
            ai2: ai2Config.name,
          },
          prompts: {
            ai1: ai1Config.prompt,
            ai2: ai2Config.prompt,
          },
          tts: {
            ai1: ai1Config.tts,
            ai2: ai2Config.tts,
          },
          parameters: {
            ai1: {
              maxTokens: ai1Config.maxTokens,
              temperature: ai1Config.temperature,
            },
            ai2: {
              maxTokens: ai2Config.maxTokens,
              temperature: ai2Config.temperature,
            },
          },
        },
        messages: state.messages,
        created_at: new Date().toISOString(),
      }

      const response = await fetch('/api/conversations/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          data: conversationData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Show share URL
        const shareUrl = data.shareUrl
        
        // Create a simple dialog to show the share URL
        const result = prompt(
          `Conversation shared successfully!\n\nShare this link:\n${shareUrl}\n\nLink expires in 30 days.\n\nPress OK to copy to clipboard, or Cancel to close.`
        )
        
        if (result !== null) {
          navigator.clipboard.writeText(shareUrl).catch(() => {
            alert('Could not copy to clipboard. Please copy the URL manually.')
          })
        }
      } else {
        alert(`Failed to share conversation: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      log(`Error sharing conversation: ${error}`)
      alert('An unexpected error occurred while sharing the conversation.')
    }
  }

  const handlePlayAudio = async () => {
    try {
      const response = await fetch(`/api/conversations/audio?conversation_id=${conversationId}`)
      const data = await response.json()
      
      if (data.success && data.audioFiles && data.audioFiles.length > 0) {
        // Simple implementation - just play the first audio file
        // In a full implementation, you'd have a proper audio player
        const audioUrl = `/conversations/${conversationId}/audio/${data.audioFiles[0]}`
        const audio = new Audio(audioUrl)
        audio.play().catch(console.error)
      } else {
        alert('No audio files available for this conversation.')
      }
    } catch (error) {
      log(`Error playing audio: ${error}`)
      alert('Error loading audio files.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow p-3">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-white">AI Conversation System</h1>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="bg-gray-600 hover:bg-gray-500"
            >
              <Settings className="h-5 w-5 mr-1" />
              <span className="hidden md:inline">Settings</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="bg-gray-600 hover:bg-gray-500"
            >
              <Bug className="h-5 w-5 mr-1" />
              <span className="hidden md:inline">Debug</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-black text-green-400 p-2 text-xs font-mono max-h-48 overflow-y-auto">
          {debugLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-3 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
          <ConversationStarter onStartConversation={handleStartConversation} />
          <ConversationPanel
            onShare={handleShareConversation}
            onPlayAudio={handlePlayAudio}
            hasAudio={hasAudio}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-2 px-3">
        <div className="container mx-auto text-center text-sm opacity-75">
          <p>&copy; {new Date().getFullYear()} Piotr Tamulewicz | <a href="https://petertam.pro/" className="underline">petertam.pro</a></p>
        </div>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ai1Config={ai1Config}
        ai2Config={ai2Config}
        onAI1ConfigChange={(config) => setAI1Config(prev => ({ ...prev, ...config }))}
        onAI2ConfigChange={(config) => setAI2Config(prev => ({ ...prev, ...config }))}
      />
    </div>
  )
}

export default function Page() {
  return (
    <ConversationProvider>
      <MainApp />
    </ConversationProvider>
  )
}