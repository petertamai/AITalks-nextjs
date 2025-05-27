export interface AIAgent {
    id: 'ai1' | 'ai2'
    name: string
    model: string
    prompt: string
    maxTokens: number
    temperature: number
    tts: {
      enabled: boolean
      voice: string
    }
  }
  
  export interface ConversationMessage {
    id: string
    role: 'system' | 'human' | 'assistant'
    content: string
    timestamp: string
    agent?: 'ai1' | 'ai2'
    model?: string
  }
  
  export interface ConversationData {
    id: string
    settings: {
      messageDirection: 'human-to-ai1' | 'ai1-to-ai2' | 'human-to-ai2' | 'ai2-to-ai1'
      models: {
        ai1: string
        ai2: string
      }
      names: {
        ai1: string
        ai2: string
      }
      prompts: {
        ai1: string
        ai2: string
      }
      tts: {
        ai1: {
          enabled: boolean
          voice: string
        }
        ai2: {
          enabled: boolean
          voice: string
        }
      }
      parameters: {
        ai1: {
          maxTokens: number
          temperature: number
        }
        ai2: {
          maxTokens: number
          temperature: number
        }
      }
    }
    messages: ConversationMessage[]
    created_at: string
    shared?: boolean
    shared_at?: string
  }
  
  export interface SharedConversation {
    conversation_id: string
    shared_at: string
    expires_at: string
    has_audio: boolean
    title: string
  }
  
  export interface OpenRouterModel {
    id: string
    name: string
    description?: string
    context_length?: number
    pricing?: {
      prompt: string
      completion: string
    }
  }
  
  export interface OpenRouterResponse {
    choices: Array<{
      message: {
        content: string
        role: string
      }
      finish_reason: string
    }>
    usage?: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
  }
  
  export interface GroqTTSRequest {
    voice: string
    input: string
    conversation_id?: string
    message_index?: number
    agent?: string
  }
  
  export interface GroqSTTRequest {
    audio: File
  }
  
  export interface ConversationState {
    isActive: boolean
    currentAI: 'ai1' | 'ai2' | null
    messages: ConversationMessage[]
    typingIndicator: {
      ai1: boolean
      ai2: boolean
    }
    speakingState: {
      ai1: boolean
      ai2: boolean
    }
  }
  
  export type ConversationDirection = 'human-to-ai1' | 'ai1-to-ai2' | 'human-to-ai2' | 'ai2-to-ai1'
  
  export type VoiceOption = 'Arista-PlayAI' | 'Angelo-PlayAI' | 'Nova-PlayAI' | 'Atlas-PlayAI' | 'Indigo-PlayAI'
  
  export interface AudioPlaybackState {
    isPlaying: boolean
    currentIndex: number
    audioFiles: string[]
    conversationId: string
  }