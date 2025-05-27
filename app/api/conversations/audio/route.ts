import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
        { status: 400 }
      )
    }

    const cleanConversationId = conversationId.replace(/[^a-zA-Z0-9_]/g, '')
    
    if (cleanConversationId !== conversationId) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 400 }
      )
    }

    const audioPath = path.join(process.cwd(), 'public', 'conversations', conversationId, 'audio')

    if (!existsSync(audioPath)) {
      return NextResponse.json({
        success: true,
        audioFiles: []
      })
    }

    try {
      const files = await readdir(audioPath)
      const audioFiles = files.filter(file => file.endsWith('.mp3'))

      // Sort audio files by their message index
      audioFiles.sort((a, b) => {
        const indexA = parseInt(a.match(/_(\d+)/)?.[1] || '0')
        const indexB = parseInt(b.match(/_(\d+)/)?.[1] || '0')
        return indexA - indexB
      })

      return NextResponse.json({
        success: true,
        audioFiles
      })
    } catch (error) {
      console.error('Error reading audio files:', error)
      return NextResponse.json({
        success: true,
        audioFiles: []
      })
    }

  } catch (error) {
    console.error('Error getting conversation audio:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get conversation audio' },
      { status: 500 }
    )
  }
}