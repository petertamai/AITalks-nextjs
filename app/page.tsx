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
import { toast } from 'sonner'

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
  const [isClientSide, setIsClientSide] = useState(false)
  
  // Use useRef to track conversation state to avoid closure issues
  const isConversationActive = useRef(false)
  
  // Initialize audio elements only on client side to avoid SSR issues
  const audioElements = useRef<{ [key: string]: HTMLAudioElement }>({})

  // Sync ref with actual state
  useEffect(() => {
    isConversationActive.current = state.isActive
    log(`🔄 State sync: isActive = ${state.isActive}, ref = ${isConversationActive.current}`)
  }, [state.isActive])

  // Initialize client-side only components
  useEffect(() => {
    setIsClientSide(true)
    setConversationId(generateId())
    
    if (typeof window !== 'undefined') {
      audioElements.current = {
        ai1: new Audio(),
        ai2: new Audio(),
      }
      console.log('🔊 Audio elements initialized on client side')
    }
  }, [])

  const log = (message: string, data?: any) => {
    debugLog(message, data)
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    console.log(logEntry, data || '')
    setDebugLogs(prev => [...prev.slice(-19), logEntry])
  }

  const getAIResponse = async (
    aiId: 'ai1' | 'ai2',
    prompt: string,
    conversationHistory: any[] = []
  ) => {
    const config = aiId === 'ai1' ? ai1Config : ai2Config
    const otherConfig = aiId === 'ai1' ? ai2Config : ai1Config
    
    log(`🤖 Getting ${aiId} response using model: ${config.model}`)
    
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
      credentials: 'include',
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const data: OpenRouterResponse = await response.json()
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    } else {
      throw new Error('Invalid response format from API')
    }
  }

  // FIXED: Enhanced speakText function that handles all cases
  const speakText = async (aiId: 'ai1' | 'ai2', text: string, messageIndex: number) => {
    if (!isClientSide || !audioElements.current[aiId]) {
      log(`Audio not available for ${aiId}, skipping TTS`)
      return
    }

    const config = aiId === 'ai1' ? ai1Config : ai2Config
    
    if (!config.tts.enabled) {
      log(`TTS disabled for ${aiId}, skipping speech`)
      return
    }

    try {
      log(`🎵 Starting TTS for ${aiId}: ${text.substring(0, 50)}...`)
      setSpeakingState(aiId, true)
      
      const response = await fetch('/api/groq/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
          log(`🔊 TTS completed for ${aiId}`)
          resolve()
        }
        
        audioElement.onerror = () => {
          setSpeakingState(aiId, false)
          URL.revokeObjectURL(audioUrl)
          log(`❌ TTS audio error for ${aiId}`)
          setTimeout(resolve, speakingTime)
        }

        // Fallback timer
        setTimeout(() => {
          if (!audioElement.paused && !audioElement.ended) {
            audioElement.pause()
            setSpeakingState(aiId, false)
            URL.revokeObjectURL(audioUrl)
            log(`⏰ TTS timeout for ${aiId}`)
            resolve()
          }
        }, speakingTime + 500)

        audioElement.play().catch(() => {
          setSpeakingState(aiId, false)
          log(`❌ TTS play failed for ${aiId}`)
          setTimeout(resolve, 1000)
        })
      })
    } catch (error) {
      log(`❌ Error in speakText for ${aiId}: ${error}`)
      setSpeakingState(aiId, false)
      return new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const addThinkingDelay = async (aiId: 'ai1' | 'ai2') => {
    log(`💭 ${aiId} is thinking...`)
    setTypingIndicator(aiId, true)
    const thinkingTime = 1000 + Math.random() * 2000
    await new Promise(resolve => setTimeout(resolve, thinkingTime))
  }

  // FIXED: Better processTurn that handles TTS for both agents
  const processTurn = async (
    currentAi: 'ai1' | 'ai2',
    message: string,
    isFirstMessage = false
  ): Promise<void> => {
    log(`🎬 Processing turn for ${currentAi}, first: ${isFirstMessage}, isConversationActive: ${isConversationActive.current}`)
    
    if (!isConversationActive.current) {
      log(`❌ Conversation not active (ref), stopping turn for ${currentAi}`)
      return
    }

    try {
      await addThinkingDelay(currentAi)
      
      // Check again after thinking delay
      if (!isConversationActive.current) {
        log(`❌ Conversation stopped during thinking for ${currentAi}`)
        setTypingIndicator(currentAi, false)
        return
      }

      log(`📞 Getting AI response for ${currentAi}`)
      const response = await getAIResponse(currentAi, message, [])
      
      // Check for #END# condition
      if (response && response.includes('#END#')) {
        log(`🔚 ${currentAi} responded with #END#. Ending conversation.`)
        setTypingIndicator(currentAi, false)
        isConversationActive.current = false
        stopConversation('Conversation has ended')
        return
      }

      setTypingIndicator(currentAi, false)

      if (!response || response.trim() === '') {
        throw new Error(`Empty response from ${currentAi}`)
      }

      const messageIndex = state.messages.length
      log(`💬 Adding message from ${currentAi}, index: ${messageIndex}`)
      
      // Add the AI's response message
      addMessage({
        role: 'assistant',
        content: response,
        agent: currentAi,
        model: currentAi === 'ai1' ? ai1Config.model : ai2Config.model,
      })

      // FIXED: Always speak the AI response if TTS is enabled
      await speakText(currentAi, response, messageIndex)

      if (!isConversationActive.current) {
        log(`❌ Conversation stopped after speech for ${currentAi}`)
        return
      }

      // Brief pause between turns
      log(`⏸️ Pause between turns`)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Determine next step based on conversation direction
      const direction = getCurrentDirection()
      
      if ((direction === 'human-to-ai1' && currentAi === 'ai1') ||
          (direction === 'human-to-ai2' && currentAi === 'ai2')) {
        log(`✅ Conversation completed for direction: ${direction}`)
        isConversationActive.current = false
        stopConversation('Conversation ended')
        return
      }

      // Continue conversation with the other AI
      const otherAi = currentAi === 'ai1' ? 'ai2' : 'ai1'
      log(`🔄 Continuing conversation with ${otherAi}`)
      await processTurn(otherAi, response, false)
      
    } catch (error) {
      log(`❌ Error in processTurn for ${currentAi}: ${error}`)
      setTypingIndicator(currentAi, false)
      setSpeakingState(currentAi, false)
      isConversationActive.current = false
      
      addMessage({
        role: 'system',
        content: `An error occurred: ${error}. Stopping conversation.`,
      })
      stopConversation('Conversation stopped due to error')
    }
  }

  const getCurrentDirection = (): ConversationDirection => {
    // This would normally come from state, using default for now
    return 'ai1-to-ai2'
  }

  // FIXED: Enhanced handleStartConversation with proper TTS for initial message
  const handleStartConversation = async (direction: ConversationDirection, message: string) => {
    log('🚀 STARTING CONVERSATION', {
      direction,
      message: message.substring(0, 50) + '...',
      ai1Model: ai1Config.model,
      ai2Model: ai2Config.model,
      ai1Name: ai1Config.name,
      ai2Name: ai2Config.name,
      currentlyActive: state.isActive,
      refActive: isConversationActive.current
    })

    if (!ai1Config.model || !ai2Config.model) {
      toast.error('Setup Required', {
        description: 'Please select models for both AI agents in the settings first.'
      })
      return
    }

    if (!message.trim()) {
      toast.error('Missing Message', {
        description: 'Please provide a starting message.'
      })
      return
    }

    if (state.isActive || isConversationActive.current) {
      toast.warning('Conversation Active', {
        description: 'A conversation is already active. Stop it first.'
      })
      return
    }

    try {
      log('🎬 Initializing conversation')
      
      // FIXED: Set ref state immediately to prevent any race conditions
      isConversationActive.current = true
      
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

      log(`📝 Adding initial message from ${sender} to ${receiver}`)

      // Add initial message
      const initialMessageIndex = 0
      addMessage({
        role: sender === 'human' ? 'human' : 'assistant',
        content: message,
        agent: sender === 'human' ? undefined : sender,
        model: sender === 'ai1' ? ai1Config.model : sender === 'ai2' ? ai2Config.model : undefined,
      })

      // FIXED: If the sender is an AI, generate TTS for the initial message
      if (sender === 'ai1' || sender === 'ai2') {
        log(`🎵 Generating TTS for initial message from ${sender}`)
        await speakText(sender, message, initialMessageIndex)
      }

      toast.success('Conversation Started', {
        description: `Starting conversation: ${sender} → ${receiver}`
      })

      log(`🎯 Starting conversation flow with ${receiver}, isConversationActive.current: ${isConversationActive.current}`)
      
      // Start the conversation flow
      await processTurn(receiver, message, true)
      
    } catch (error) {
      log(`❌ Error starting conversation: ${error}`)
      isConversationActive.current = false
      addMessage({
        role: 'system',
        content: `Failed to start conversation: ${error}`,
      })
      stopConversation('Conversation failed to start')
      toast.error('Conversation Failed', {
        description: `Failed to start conversation: ${error}`
      })
    }
  }

  const handleShareConversation = async () => {
    if (state.messages.length === 0) {
      toast.error('Nothing to Share', {
        description: 'No conversation to share. Start a conversation first.'
      })
      return
    }

    const loadingToast = toast.loading('Sharing conversation...')

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
        const shareUrl = data.shareUrl
        
        toast.dismiss(loadingToast)
        
        toast.success('Conversation Shared Successfully!', {
          description: 'Link expires in 30 days',
          action: {
            label: 'Copy Link',
            onClick: () => {
              navigator.clipboard.writeText(shareUrl).then(() => {
                toast.success('Link copied to clipboard!')
              }).catch(() => {
                toast.error('Failed to copy link')
              })
            }
          },
          duration: 10000,
        })

        toast.info('Share Link', {
          description: shareUrl,
          action: {
            label: 'Open',
            onClick: () => window.open(shareUrl, '_blank')
          },
          duration: 15000,
        })
        
      } else {
        toast.dismiss(loadingToast)
        toast.error('Share Failed', {
          description: data.error || 'Unknown error occurred while sharing.'
        })
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Share Error', {
        description: 'An unexpected error occurred while sharing the conversation.'
      })
    }
  }

  const handlePlayAudio = async () => {
    try {
      const response = await fetch(`/api/conversations/audio?conversation_id=${conversationId}`)
      const data = await response.json()
      
      if (data.success && data.audioFiles && data.audioFiles.length > 0) {
        toast.success('Playing Audio', {
          description: `Found ${data.audioFiles.length} audio files`
        })
        
        // TODO: Implement proper sequential audio playback with highlighting
        const audioUrl = `/conversations/${conversationId}/audio/${data.audioFiles[0]}`
        
        if (isClientSide && typeof window !== 'undefined') {
          const audio = new Audio(audioUrl)
          audio.play().catch(console.error)
        }
      } else {
        toast.warning('No Audio Available', {
          description: 'No audio files available for this conversation.'
        })
      }
    } catch (error) {
      toast.error('Audio Error', {
        description: 'Error loading audio files.'
      })
    }
  }

  if (!isClientSide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">AI Conversation System</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              <Bug className="h-4 w-4 mr-1" />
              Debug
            </Button>
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-muted p-4 text-sm font-mono max-h-48 overflow-y-auto">
          {debugLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          <ConversationStarter 
            onStartConversation={handleStartConversation}
            ai1Config={ai1Config}
            ai2Config={ai2Config}
          />
          <ConversationPanel
            onShare={handleShareConversation}
            onPlayAudio={handlePlayAudio}
            hasAudio={hasAudio}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
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