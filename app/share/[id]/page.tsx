'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Square } from 'lucide-react'
import { ConversationData, ConversationMessage } from '@/types'

interface SharedConversationViewProps {
  conversationData: ConversationData
  conversationId: string
  hasAudio: boolean
}

export default function SharedConversationView({
  conversationData,
  conversationId,
  hasAudio,
}: SharedConversationViewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0)
  const [audioFiles, setAudioFiles] = useState<string[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement>(null)

  const loadAudioFiles = async () => {
    try {
      const response = await fetch(`/api/conversations/audio?conversation_id=${conversationId}`)
      const data = await response.json()
      
      if (data.success && data.audioFiles && data.audioFiles.length > 0) {
        setAudioFiles(data.audioFiles)
        return true
      }
      return false
    } catch (error) {
      console.error('Error loading audio files:', error)
      return false
    }
  }

  const highlightMessage = (audioFile: string) => {
    // Remove previous highlights
    document.querySelectorAll('.highlighted').forEach(el => {
      el.classList.remove('highlighted')
    })

    // Extract index from filename
    const indexMatch = audioFile.match(/_(\d+)/)
    if (indexMatch && indexMatch[1]) {
      const messageIndex = parseInt(indexMatch[1])
      const messageElement = document.querySelector(`[data-index="${messageIndex}"]`)
      if (messageElement) {
        messageElement.classList.add('highlighted')
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const playCurrentAudio = () => {
    if (currentAudioIndex < audioFiles.length && audioPlayerRef.current) {
      const audioFile = audioFiles[currentAudioIndex]
      const audioUrl = `/conversations/${conversationId}/audio/${audioFile}`
      
      audioPlayerRef.current.src = audioUrl
      audioPlayerRef.current.onended = playNextAudio
      audioPlayerRef.current.onerror = playNextAudio
      
      audioPlayerRef.current.play().catch(playNextAudio)
      highlightMessage(audioFile)
    } else {
      resetPlayState()
    }
  }

  const playNextAudio = () => {
    setCurrentAudioIndex(prev => {
      const nextIndex = prev + 1
      if (nextIndex < audioFiles.length) {
        return nextIndex
      } else {
        resetPlayState()
        return 0
      }
    })
  }

  const resetPlayState = () => {
    setIsPlaying(false)
    setCurrentAudioIndex(0)
    document.querySelectorAll('.highlighted').forEach(el => {
      el.classList.remove('highlighted')
    })
  }

  const handlePlayToggle = async () => {
    if (isPlaying) {
      // Stop playing
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.currentTime = 0
      }
      resetPlayState()
    } else {
      // Start playing
      if (audioFiles.length === 0) {
        const hasAudioFiles = await loadAudioFiles()
        if (!hasAudioFiles) {
          alert('No audio files available for this conversation.')
          return
        }
      }
      
      setIsPlaying(true)
      setCurrentAudioIndex(0)
      playCurrentAudio()
    }
  }

  // Update current audio when index changes
  React.useEffect(() => {
    if (isPlaying && audioFiles.length > 0) {
      playCurrentAudio()
    }
  }, [currentAudioIndex, isPlaying])

  const renderMessage = (message: ConversationMessage, index: number) => {
    let messageClass = 'chat-message'
    let agentName = 'Human'

    if (message.agent === 'ai1') {
      messageClass += ' ai1'
      agentName = conversationData.settings?.names?.ai1 || 'AI-1'
    } else if (message.agent === 'ai2') {
      messageClass += ' ai2'
      agentName = conversationData.settings?.names?.ai2 || 'AI-2'
    } else if (message.role === 'system') {
      messageClass += ' system'
      agentName = 'System'
    } else {
      messageClass += ' human'
    }

    return (
      <div
        key={message.id}
        className={messageClass}
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Sidebar with conversation settings */}
      <div className="md:col-span-1">
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Conversation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-white">
            {conversationData.settings && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Message Direction</h3>
                  <p className="text-sm opacity-80">
                    {conversationData.settings.messageDirection || 'N/A'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Models</h3>
                  <div className="text-sm opacity-80 space-y-1">
                    {conversationData.settings.models && Object.entries(conversationData.settings.models).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Agent Names</h3>
                  <div className="text-sm opacity-80 space-y-1">
                    {conversationData.settings.names && Object.entries(conversationData.settings.names).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">System Prompts</h3>
                  {conversationData.settings.prompts && Object.entries(conversationData.settings.prompts).map(([key, value]) => (
                    <div key={key} className="mb-2">
                      <p className="font-medium text-sm">{key}:</p>
                      <div className="bg-gray-800 p-2 rounded text-xs max-h-20 overflow-auto">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main conversation content */}
      <div className="md:col-span-2">
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-white">Shared Conversation</CardTitle>
              <div className="flex items-center gap-2">
                {hasAudio && (
                  <Button
                    onClick={handlePlayToggle}
                    variant="secondary"
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-500"
                  >
                    {isPlaying ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                )}
                <Badge className="bg-gray-600">Viewing</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800 rounded-lg p-3 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col space-y-2">
              {conversationData.messages && conversationData.messages.length > 0 ? (
                conversationData.messages.map(renderMessage)
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No messages found in this conversation.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden audio player */}
      <audio ref={audioPlayerRef} className="hidden" />
    </div>
  )
}