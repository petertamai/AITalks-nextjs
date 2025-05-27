'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { ConversationMessage, ConversationState, ConversationDirection } from '@/types'
import { generateId } from '@/lib/utils'

interface ConversationContextType {
  state: ConversationState
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void
  startConversation: () => void
  stopConversation: (reason?: string) => void
  setTypingIndicator: (ai: 'ai1' | 'ai2', isTyping: boolean) => void
  setSpeakingState: (ai: 'ai1' | 'ai2', isSpeaking: boolean) => void
  clearMessages: () => void
}

type ConversationAction =
  | { type: 'ADD_MESSAGE'; payload: ConversationMessage }
  | { type: 'START_CONVERSATION' }
  | { type: 'STOP_CONVERSATION'; payload?: string }
  | { type: 'SET_TYPING'; payload: { ai: 'ai1' | 'ai2'; isTyping: boolean } }
  | { type: 'SET_SPEAKING'; payload: { ai: 'ai1' | 'ai2'; isSpeaking: boolean } }
  | { type: 'CLEAR_MESSAGES' }

const initialState: ConversationState = {
  isActive: false,
  currentAI: null,
  messages: [],
  typingIndicator: {
    ai1: false,
    ai2: false,
  },
  speakingState: {
    ai1: false,
    ai2: false,
  },
}

function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }
    case 'START_CONVERSATION':
      return {
        ...state,
        isActive: true,
        currentAI: null,
      }
    case 'STOP_CONVERSATION':
      return {
        ...state,
        isActive: false,
        currentAI: null,
        typingIndicator: { ai1: false, ai2: false },
        speakingState: { ai1: false, ai2: false },
      }
    case 'SET_TYPING':
      return {
        ...state,
        typingIndicator: {
          ...state.typingIndicator,
          [action.payload.ai]: action.payload.isTyping,
        },
      }
    case 'SET_SPEAKING':
      return {
        ...state,
        speakingState: {
          ...state.speakingState,
          [action.payload.ai]: action.payload.isSpeaking,
        },
      }
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      }
    default:
      return state
  }
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState)

  const addMessage = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const fullMessage: ConversationMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_MESSAGE', payload: fullMessage })
  }, [])

  const startConversation = useCallback(() => {
    dispatch({ type: 'START_CONVERSATION' })
  }, [])

  const stopConversation = useCallback((reason?: string) => {
    if (reason) {
      addMessage({
        role: 'system',
        content: reason,
      })
    }
    dispatch({ type: 'STOP_CONVERSATION', payload: reason })
  }, [addMessage])

  const setTypingIndicator = useCallback((ai: 'ai1' | 'ai2', isTyping: boolean) => {
    dispatch({ type: 'SET_TYPING', payload: { ai, isTyping } })
  }, [])

  const setSpeakingState = useCallback((ai: 'ai1' | 'ai2', isSpeaking: boolean) => {
    dispatch({ type: 'SET_SPEAKING', payload: { ai, isSpeaking } })
  }, [])

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' })
  }, [])

  return (
    <ConversationContext.Provider
      value={{
        state,
        addMessage,
        startConversation,
        stopConversation,
        setTypingIndicator,
        setSpeakingState,
        clearMessages,
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation() {
  const context = useContext(ConversationContext)
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider')
  }
  return context
}