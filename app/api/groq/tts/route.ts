import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

    const body = await request.json()

    if (!body.voice || !body.input) {
      return NextResponse.json(
        { error: 'Missing required fields (voice or input)' },
        { status: 400 }
      )
    }

    const requestData = {
      model: 'playai-tts',
      voice: body.voice,
      input: body.input,
      response_format: 'mp3'
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Groq TTS API error: ${response.status} - ${errorData}`)
    }

    const audioArrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(audioArrayBuffer)

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

        console.log(`Audio saved: ${audioFilePath}`)
      } catch (saveError) {
        console.error('Error saving audio file:', saveError)
        // Continue even if saving fails
      }
    }

    // Return the audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error in Groq TTS:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate speech' },
      { status: 500 }
    )
  }
}