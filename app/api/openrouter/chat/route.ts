import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const FIXED_SYSTEM_MESSAGE = {
  role: 'system',
  content: 'As for emojis use UTF-8 emoji, now, track entire conversation and if you decide this is final end and no need to respond further, USE #END# ONLY AND ONLY THEN if all conversation should be ended. DONT ADD #END# to every single message, add end only conversation indicates good bye, see you etc!'
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    let apiKey = cookieStore.get('openrouter_api_key')?.value

    // If no server-side cookie, try to get from client-side cookie via headers
    if (!apiKey) {
      const clientCookie = request.headers.get('cookie')
      if (clientCookie) {
        const match = clientCookie.match(/openrouter_api_key=([^;]+)/)
        if (match) {
          apiKey = decodeURIComponent(match[1])
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not found. Please provide an API key in the settings.' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body.model || !body.messages) {
      return NextResponse.json(
        { error: 'Missing required fields (model or messages)' },
        { status: 400 }
      )
    }

    // Inject the fixed system message at the beginning
    const messages = [FIXED_SYSTEM_MESSAGE, ...body.messages]

    const requestData = {
      ...body,
      messages
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Conversation System',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in OpenRouter chat:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get AI response' },
      { status: 500 }
    )
  }
}