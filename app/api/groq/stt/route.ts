import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    let groqApiKey = cookieStore.get('groq_api_key')?.value

    // If no server-side cookie, try to get from client-side cookie via headers
    if (!groqApiKey) {
      const clientCookie = request.headers.get('cookie')
      if (clientCookie) {
        const match = clientCookie.match(/groq_api_key=([^;]+)/)
        if (match) {
          groqApiKey = decodeURIComponent(match[1])
        }
      }
    }

    if (!groqApiKey) {
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

    // Create form data for Groq API
    const groqFormData = new FormData()
    groqFormData.append('file', audioFile)
    groqFormData.append('model', 'whisper-large-v3-turbo')
    groqFormData.append('response_format', 'verbose_json')

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: groqFormData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Groq STT API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in Groq STT:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}