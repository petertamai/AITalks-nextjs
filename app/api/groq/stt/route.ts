import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Groq STT API Request ===')
    
    // Try server-side cookies first
    const cookieStore = cookies()
    let groqApiKey = cookieStore.get('groq_api_key')?.value || ''

    // If no server-side cookie, try client-side cookie from headers
    if (!groqApiKey) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          if (key && value) {
            acc[key] = decodeURIComponent(value)
          }
          return acc
        }, {} as Record<string, string>)
        
        groqApiKey = cookies['groq_api_key'] || ''
      }
    }

    if (!groqApiKey?.trim()) {
      console.log('No Groq API key found')
      return NextResponse.json(
        { error: 'Groq API key not found. Please provide a Groq API key in the settings.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    console.log('STT request:', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type
    })

    // Create form data for Groq API
    const groqFormData = new FormData()
    groqFormData.append('file', audioFile)
    groqFormData.append('model', 'whisper-large-v3-turbo')
    groqFormData.append('response_format', 'verbose_json')

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'User-Agent': 'AI-Conversation-System/1.0'
      },
      body: groqFormData,
    })

    console.log('Groq STT response status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Groq STT error:', errorData)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Groq API key. Please check your API key in settings.' },
          { status: 401 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: 'Groq rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      } else {
        return NextResponse.json(
          { error: `Groq STT API error: ${response.status} - ${errorData}` },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    console.log('STT transcription successful')
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in Groq STT:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}