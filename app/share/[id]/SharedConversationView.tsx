'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, Square, Settings, Bot, User, Pause, SkipForward, SkipBack } from 'lucide-react'
import { ConversationData, ConversationMessage } from '@/types'
import { toast } from 'sonner'

interface SharedConversationViewProps {
  conversationData: ConversationData
  conversationId: string
  hasAudio: boolean
}

interface AudioFile {
  filename: string
  messageIndex: number
  agent: string
}

export default function SharedConversationView({
  conversationData,
  conversationId,
  hasAudio,
}: SharedConversationViewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [progress, setProgress] = useState(0)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1)
  const audioPlayerRef = useRef<HTMLAudioElement>(null)

  const loadAudioFiles = async () => {
    try {
      const response = await fetch(`/api/conversations/audio?conversation_id=${conversationId}`)
      const data = await response.json()
      
      if (data.success && data.audioFiles && data.audioFiles.length > 0) {
        // Parse audio files and extract message indices
        const parsedAudioFiles: AudioFile[] = data.audioFiles.map((filename: string) => {
          const indexMatch = filename.match(/message_(\d+)\.mp3/)
          const messageIndex = indexMatch ? parseInt(indexMatch[1]) : 0
          
          // Determine agent from message data
          const message = conversationData.messages[messageIndex]
          const agent = message?.agent || 'unknown'
          
          return {
            filename,
            messageIndex,
            agent
          }
        }).sort((a: AudioFile, b: AudioFile) => a.messageIndex - b.messageIndex)
        
        setAudioFiles(parsedAudioFiles)
        return true
      }
      return false
    } catch (error) {
      console.error('Error loading audio files:', error)
      toast.error('Failed to load audio files')
      return false
    }
  }

  const highlightMessage = (messageIndex: number) => {
    // Remove previous highlights
    document.querySelectorAll('.highlighted').forEach(el => {
      el.classList.remove('highlighted')
    })

    // Add highlight to current message
    const messageElement = document.querySelector(`[data-index="${messageIndex}"]`)
    if (messageElement) {
      messageElement.classList.add('highlighted')
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    
    setCurrentMessageIndex(messageIndex)
  }

  const clearHighlights = () => {
    document.querySelectorAll('.highlighted').forEach(el => {
      el.classList.remove('highlighted')
    })
    setCurrentMessageIndex(-1)
  }

  const playCurrentAudio = () => {
    if (currentAudioIndex < audioFiles.length && audioPlayerRef.current) {
      const audioFile = audioFiles[currentAudioIndex]
      const audioUrl = `/conversations/${conversationId}/audio/${audioFile.filename}`
      
      audioPlayerRef.current.src = audioUrl
      audioPlayerRef.current.onended = playNextAudio
      audioPlayerRef.current.onerror = playNextAudio
      
      // Update progress and highlight
      audioPlayerRef.current.ontimeupdate = () => {
        if (audioPlayerRef.current) {
          const currentTime = audioPlayerRef.current.currentTime
          const duration = audioPlayerRef.current.duration
          if (duration > 0) {
            const audioProgress = (currentTime / duration) * 100
            const totalProgress = ((currentAudioIndex + audioProgress / 100) / audioFiles.length) * 100
            setProgress(totalProgress)
          }
        }
      }
      
      audioPlayerRef.current.play().then(() => {
        highlightMessage(audioFile.messageIndex)
        toast.success(`Playing ${audioFile.agent.toUpperCase()}`, {
          description: `Message ${audioFile.messageIndex + 1} of ${conversationData.messages.length}`,
          duration: 2000
        })
      }).catch(playNextAudio)
    } else {
      resetPlayState()
    }
  }

  const playNextAudio = () => {
    if (currentAudioIndex < audioFiles.length - 1) {
      setCurrentAudioIndex(prev => prev + 1)
    } else {
      resetPlayState()
      toast.success('Audio playback completed')
    }
  }

  const playPreviousAudio = () => {
    if (currentAudioIndex > 0) {
      setCurrentAudioIndex(prev => prev - 1)
    }
  }

  const resetPlayState = () => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentAudioIndex(0)
    setProgress(0)
    clearHighlights()
  }

  const handlePlayToggle = async () => {
    if (isPlaying && !isPaused) {
      // Pause
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        setIsPaused(true)
        toast.info('Audio paused')
      }
    } else if (isPlaying && isPaused) {
      // Resume
      if (audioPlayerRef.current) {
        audioPlayerRef.current.play()
        setIsPaused(false)
        toast.info('Audio resumed')
      }
    } else {
      // Start playing
      if (audioFiles.length === 0) {
        const loadingToast = toast.loading('Loading audio files...')
        const hasAudioFiles = await loadAudioFiles()
        toast.dismiss(loadingToast)
        
        if (!hasAudioFiles) {
          toast.error('No audio files available for this conversation.')
          return
        }
      }
      
      setIsPlaying(true)
      setIsPaused(false)
      setCurrentAudioIndex(0)
      toast.success('Starting audio playback')
    }
  }

  const handleStop = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0
    }
    resetPlayState()
    toast.info('Audio stopped')
  }

  // Update current audio when index changes
  useEffect(() => {
    if (isPlaying && !isPaused && audioFiles.length > 0) {
      playCurrentAudio()
    }
  }, [currentAudioIndex, isPlaying, isPaused, audioFiles])

  const renderMessage = (message: ConversationMessage, index: number) => {
    let messageClass = 'chat-message transition-all duration-300'
    let agentName = 'Human'
    let agentIcon = <User className="w-3 h-3" />

    if (message.agent === 'ai1') {
      messageClass += ' ai1'
      agentName = conversationData.settings?.names?.ai1 || 'AI-1'
      agentIcon = <Bot className="w-3 h-3" />
    } else if (message.agent === 'ai2') {
      messageClass += ' ai2'
      agentName = conversationData.settings?.names?.ai2 || 'AI-2'
      agentIcon = <Bot className="w-3 h-3" />
    } else if (message.role === 'system') {
      messageClass += ' system'
      agentName = 'System'
      agentIcon = <Settings className="w-3 h-3" />
    } else {
      messageClass += ' human'
    }

    // Add highlighted class if this is the current message
    if (currentMessageIndex === index) {
      messageClass += ' highlighted ring-2 ring-primary'
    }

    return (
      <div
        key={message.id}
        className={messageClass}
        data-index={index}
      >
        <div className="agent-name flex items-center gap-1">
          {agentIcon}
          <span>{agentName}</span>
          {currentMessageIndex === index && (
            <div className="ml-2 flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-500 font-medium">Speaking</span>
            </div>
          )}
        </div>
        <div className="text-sm leading-relaxed">{message.content}</div>
        {message.model && (
          <div className="model-badge">{message.model}</div>
        )}
      </div>
    )
  }

  const getCurrentAudioInfo = () => {
    if (currentAudioIndex < audioFiles.length) {
      const audioFile = audioFiles[currentAudioIndex]
      const message = conversationData.messages[audioFile.messageIndex]
      const agentName = message?.agent === 'ai1' 
        ? conversationData.settings?.names?.ai1 || 'AI-1'
        : message?.agent === 'ai2'
        ? conversationData.settings?.names?.ai2 || 'AI-2'
        : 'Human'
      
      return {
        agentName,
        messageIndex: audioFile.messageIndex + 1,
        totalMessages: conversationData.messages.length,
        audioIndex: currentAudioIndex + 1,
        totalAudio: audioFiles.length
      }
    }
    return null
  }

  const audioInfo = getCurrentAudioInfo()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar with conversation settings */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Conversation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversationData.settings && (
              <>
                <div>
                  <h3 className="font-medium mb-2">Message Direction</h3>
                  <p className="text-sm text-muted-foreground">
                    {conversationData.settings.messageDirection || 'N/A'}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Models</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {conversationData.settings.models && Object.entries(conversationData.settings.models).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <strong className="capitalize">{key}:</strong> 
                        <span className="font-mono text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Agent Names</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {conversationData.settings.names && Object.entries(conversationData.settings.names).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <strong className="capitalize">{key}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">System Prompts</h3>
                  {conversationData.settings.prompts && Object.entries(conversationData.settings.prompts).map(([key, value]) => (
                    <div key={key} className="mb-3">
                      <p className="font-medium text-sm capitalize mb-1">{key}:</p>
                      <div className="bg-muted p-2 rounded text-xs max-h-20 overflow-auto">
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
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-semibold">Shared Conversation</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {conversationData.messages?.length || 0} messages
                  {hasAudio && audioFiles.length > 0 && ` • ${audioFiles.length} audio files`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasAudio && (
                  <>
                    <Button
                      onClick={playPreviousAudio}
                      variant="outline"
                      size="sm"
                      disabled={!isPlaying || currentAudioIndex <= 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handlePlayToggle}
                      variant="outline"
                      size="sm"
                    >
                      {isPlaying && !isPaused ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : isPlaying && isPaused ? (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      size="sm"
                      disabled={!isPlaying}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                    <Button
                      onClick={playNextAudio}
                      variant="outline"
                      size="sm"
                      disabled={!isPlaying || currentAudioIndex >= audioFiles.length - 1}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Badge variant="secondary">Viewing</Badge>
              </div>
            </div>
            
            {/* Audio Progress */}
            {isPlaying && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-muted-foreground">
                    {audioInfo && (
                      <>
                        Playing: <strong>{audioInfo.agentName}</strong> • 
                        Message {audioInfo.messageIndex}/{audioInfo.totalMessages} • 
                        Audio {audioInfo.audioIndex}/{audioInfo.totalAudio}
                      </>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(progress)}%
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col space-y-4">
              {conversationData.messages && conversationData.messages.length > 0 ? (
                conversationData.messages.map(renderMessage)
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No messages found in this conversation.</p>
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