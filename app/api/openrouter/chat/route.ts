import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const FIXED_SYSTEM_MESSAGE = {
  role: 'system',
  content: 'As for emojis use UTF-8 emoji, now, track entire conversation and if you decide this is final end and no need to respond further, USE #END# ONLY AND ONLY THEN if all conversation should be ended. DONT ADD #END# to every single message, add end only conversation indicates good bye, see you etc!'
}

export async function POST(request: NextRequest) {
  console.log('💬 OpenRouter Chat API Request Started')
  
  try {
    // Method 1: Try server-side cookies first
    const cookieStore = cookies()
    let apiKey = ''
    
    try {
      apiKey = cookieStore.get('openrouter_api_key')?.value || ''
      console.log('🍪 Server-side cookie:', apiKey ? `${apiKey.substring(0, 15)}...` : 'None')
    } catch (serverCookieError) {
      console.log('⚠️ Server cookie access failed:', serverCookieError)
    }
    
    // Method 2: If no server cookie, try client-side cookie from headers
    if (!apiKey) {
      const cookieHeader = request.headers.get('cookie')
      console.log('🔍 Checking client cookie header:', Boolean(cookieHeader))
      
      if (cookieHeader) {
        const cookieMatches = cookieHeader.match(/openrouter_api_key=([^;]+)/)
        if (cookieMatches && cookieMatches[1]) {
          apiKey = decodeURIComponent(cookieMatches[1].trim())
          console.log('🍪 Client-side cookie found:', `${apiKey.substring(0, 15)}...`)
        }
      }
    }

    // Validate API key
    if (!apiKey || !apiKey.trim()) {
      console.log('❌ No API key found')
      return NextResponse.json(
        { 
          error: 'OpenRouter API key not found. Please provide an API key in the settings.',
          debug: 'No key in server or client cookies'
        },
        { status: 400 }
      )
    }

    // Validate key format
    const trimmedKey = apiKey.trim()
    if (!trimmedKey.startsWith('sk-or')) {
      console.log('❌ Invalid API key format:', `${trimmedKey.substring(0, 10)}...`)
      return NextResponse.json(
        { 
          error: 'Invalid OpenRouter API key format. Keys should start with "sk-or-".',
          debug: 'Invalid key format'
        },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()

    if (!body.model || !body.messages) {
      console.log('❌ Missing required fields:', { hasModel: Boolean(body.model), hasMessages: Boolean(body.messages) })
      return NextResponse.json(
        { 
          error: 'Missing required fields (model or messages)',
          debug: 'Request validation failed'
        },
        { status: 400 }
      )
    }

    console.log('📋 Chat request details:', {
      model: body.model,
      messageCount: body.messages.length,
      hasApiKey: Boolean(trimmedKey)
    })

    // Inject the fixed system message at the beginning if not already present
    const messages = body.messages.some((msg: any) => msg.role === 'system' && msg.content.includes('#END#')) 
      ? body.messages 
      : [FIXED_SYSTEM_MESSAGE, ...body.messages]

    // Prepare request data
    const requestData = {
      ...body,
      messages,
      // Ensure required parameters have defaults
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1000,
      top_p: body.top_p ?? 1.0
    }

    console.log('🚀 Making OpenRouter request...')

    // Make request to OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Conversation System',
        'User-Agent': 'AI-Conversation-System/1.0'
      },
      body: JSON.stringify(requestData),
    })

    console.log('📡 OpenRouter chat response:', {
      status: openRouterResponse.status,
      statusText: openRouterResponse.statusText,
      ok: openRouterResponse.ok
    })

    // Handle response
    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.text()
      console.error('❌ OpenRouter chat error:', {
        status: openRouterResponse.status,
        body: errorData.substring(0, 500)
      })
      
      // Provide specific error messages
      if (openRouterResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid OpenRouter API key. Please check your API key in settings.',
            debug: 'Authentication failed'
          },
          { status: 401 }
        )
      } else if (openRouterResponse.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please try again later.',
            debug: 'Rate limit hit'
          },
          { status: 429 }
        )
      } else if (openRouterResponse.status === 400) {
        return NextResponse.json(
          { 
            error: 'Invalid request parameters. Please check your model selection and message format.',
            debug: `Bad request: ${errorData}`
          },
          { status: 400 }
        )
      } else if (openRouterResponse.status >= 500) {
        return NextResponse.json(
          { 
            error: 'OpenRouter service temporarily unavailable. Please try again later.',
            debug: `Server error: ${openRouterResponse.status}`
          },
          { status: 502 }
        )
      } else {
        return NextResponse.json(
          { 
            error: `OpenRouter API error: ${openRouterResponse.status} - ${errorData}`,
            debug: `HTTP ${openRouterResponse.status}`
          },
          { status: openRouterResponse.status }
        )
      }
    }

    // Parse successful response
    const data = await openRouterResponse.json()
    console.log('✅ Chat response successful:', {
      hasChoices: Boolean(data.choices),
      choiceCount: data.choices?.length || 0,
      hasUsage: Boolean(data.usage)
    })
    
    // Validate response format
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('❌ Invalid response format:', data)
      return NextResponse.json(
        { 
          error: 'Invalid response format from OpenRouter API',
          debug: 'Missing or empty choices array'
        },
        { status: 502 }
      )
    }

    // Return successful response
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('💥 Error in OpenRouter chat:', error)
    
    // Handle different types of errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Network error connecting to OpenRouter. Please check your internet connection.',
          debug: 'Fetch error'
        },
        { status: 503 }
      )
    }
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body.',
          debug: 'JSON parse error'
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get AI response',
        debug: 'Unexpected server error'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}