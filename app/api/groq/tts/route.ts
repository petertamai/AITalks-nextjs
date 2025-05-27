import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  console.log('🎵 Groq TTS API Request Started')
  
  try {
    // Method 1: Try server-side cookies first
    const cookieStore = cookies()
    let groqApiKey = ''
    
    try {
      groqApiKey = cookieStore.get('groq_api_key')?.value || ''
      console.log('🍪 Server-side cookie:', groqApiKey ? `${groqApiKey.substring(0, 15)}...` : 'None')
    } catch (serverCookieError) {
      console.log('⚠️ Server cookie access failed:', serverCookieError)
    }

    // Method 2: If no server cookie, try client-side cookie from headers
    if (!groqApiKey) {
      const cookieHeader = request.headers.get('cookie')
      console.log('🔍 Checking client cookie header:', Boolean(cookieHeader))
      
      if (cookieHeader) {
        const cookieMatches = cookieHeader.match(/groq_api_key=([^;]+)/)
        if (cookieMatches && cookieMatches[1]) {
          groqApiKey = decodeURIComponent(cookieMatches[1].trim())
          console.log('🍪 Client-side cookie found:', `${groqApiKey.substring(0, 15)}...`)
        }
      }
    }

    // Validate API key
    if (!groqApiKey || !groqApiKey.trim()) {
      console.log('❌ No Groq API key found')
      return NextResponse.json(
        { 
          error: 'Groq API key not found. Please provide a Groq API key in the settings.',
          debug: 'No key in server or client cookies'
        },
        { status: 400 }
      )
    }

    // Validate key format
    const trimmedKey = groqApiKey.trim()
    if (!trimmedKey.startsWith('gsk_')) {
      console.log('❌ Invalid Groq API key format:', `${trimmedKey.substring(0, 10)}...`)
      return NextResponse.json(
        { 
          error: 'Invalid Groq API key format. Keys should start with "gsk_".',
          debug: 'Invalid key format'
        },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()

    if (!body.voice || !body.input) {
      console.log('❌ Missing required fields:', { hasVoice: Boolean(body.voice), hasInput: Boolean(body.input) })
      return NextResponse.json(
        { 
          error: 'Missing required fields (voice or input)',
          debug: 'Request validation failed'
        },
        { status: 400 }
      )
    }

    console.log('📋 TTS request details:', {
      voice: body.voice,
      textLength: body.input.length,
      conversationId: body.conversation_id,
      messageIndex: body.message_index
    })

    // Prepare request data for Groq
    const requestData = {
      model: 'playai-tts',
      voice: body.voice,
      input: body.input,
      response_format: 'mp3'
    }

    console.log('🚀 Making Groq TTS request...')

    // Make request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`,
        'User-Agent': 'AI-Conversation-System/1.0'
      },
      body: JSON.stringify(requestData),
    })

    console.log('📡 Groq TTS response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    })

    // Handle response
    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Groq TTS error:', {
        status: response.status,
        body: errorData.substring(0, 500)
      })
      
      // Provide specific error messages
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid Groq API key. Please check your API key in settings.',
            debug: 'Authentication failed'
          },
          { status: 401 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'Groq rate limit exceeded. Please try again later.',
            debug: 'Rate limit hit'
          },
          { status: 429 }
        )
      } else if (response.status === 400) {
        return NextResponse.json(
          { 
            error: 'Invalid TTS request parameters. Please check your voice selection and input text.',
            debug: `Bad request: ${errorData}`
          },
          { status: 400 }
        )
      } else if (response.status >= 500) {
        return NextResponse.json(
          { 
            error: 'Groq TTS service temporarily unavailable. Please try again later.',
            debug: `Server error: ${response.status}`
          },
          { status: 502 }
        )
      } else {
        return NextResponse.json(
          { 
            error: `Groq TTS API error: ${response.status} - ${errorData}`,
            debug: `HTTP ${response.status}`
          },
          { status: response.status }
        )
      }
    }

    // Parse successful response
    const audioArrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(audioArrayBuffer)

    console.log('✅ TTS audio generated successfully:', {
      size: audioBuffer.length,
      sizeKB: Math.round(audioBuffer.length / 1024)
    })

    // Save audio file if conversation details are provided
    if (body.conversation_id && body.message_index !== undefined) {
      try {
        const conversationDir = path.join(process.cwd(), 'public', 'conversations', body.conversation_id)
        const audioDir = path.join(conversationDir, 'audio')

        // Create directories if they don't exist
        if (!existsSync(conversationDir)) {
          await mkdir(conversationDir, { recursive: true })
        }
        if (!existsSync(audioDir)) {
          await mkdir(audioDir, { recursive: true })
        }

        const audioFilePath = path.join(audioDir, `message_${body.message_index}.mp3`)
        await writeFile(audioFilePath, audioBuffer)

        console.log(`💾 Audio saved: ${audioFilePath}`)
      } catch (saveError) {
        console.error('⚠️ Error saving audio file:', saveError)
        // Continue even if saving fails - return the audio anyway
      }
    }

    // Return the audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
    })

  } catch (error) {
    console.error('💥 Error in Groq TTS:', error)
    
    // Handle different types of errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Network error connecting to Groq. Please check your internet connection.',
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
        error: error instanceof Error ? error.message : 'Failed to generate speech',
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