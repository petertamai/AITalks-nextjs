import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = cookies()
    const messages: string[] = []

    // Handle OpenRouter API key
    if ('openrouter_api_key' in body) {
      const key = body.openrouter_api_key?.trim()
      
      if (!key) {
        // Clear the cookie if empty
        cookieStore.set('openrouter_api_key', '', {
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        messages.push('OpenRouter API key cleared')
      } else {
        // Set the cookie
        cookieStore.set('openrouter_api_key', key, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        messages.push('OpenRouter API key saved')
      }
    }

    // Handle Groq API key
    if ('groq_api_key' in body) {
      const key = body.groq_api_key?.trim()
      
      if (!key) {
        // Clear the cookie if empty
        cookieStore.set('groq_api_key', '', {
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        messages.push('Groq API key cleared')
      } else {
        // Set the cookie
        cookieStore.set('groq_api_key', key, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        messages.push('Groq API key saved')
      }
    }

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Error saving API keys:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save API keys' },
      { status: 500 }
    )
  }
}