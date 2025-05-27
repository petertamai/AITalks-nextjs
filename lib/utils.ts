import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

export function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function calculateSpeakingTime(text: string) {
  const words = text.split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length
  const secondsPerWord = 0.4
  const pauseTime = Math.min(2, wordCount * 0.05)
  const speakingTimeMs = (wordCount * secondsPerWord + pauseTime) * 1000
  return Math.max(1500, speakingTimeMs)
}

export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return fallback
  }
}

export function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, data || '')
}