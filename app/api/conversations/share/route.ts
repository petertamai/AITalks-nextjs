import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile, access } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { ConversationData, SharedConversation } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.conversation_id || !body.data) {
      return NextResponse.json(
        { error: 'Missing conversation ID or data' },
        { status: 400 }
      )
    }

    const conversationId = body.conversation_id.replace(/[^a-zA-Z0-9_]/g, '')
    
    if (conversationId !== body.conversation_id) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 400 }
      )
    }

    // Create directory structure
    const conversationsDir = path.join(process.cwd(), 'public', 'conversations')
    const conversationPath = path.join(conversationsDir, conversationId)
    const audioPath = path.join(conversationPath, 'audio')

    if (!existsSync(conversationsDir)) {
      await mkdir(conversationsDir, { recursive: true })
    }
    if (!existsSync(conversationPath)) {
      await mkdir(conversationPath, { recursive: true })
    }
    if (!existsSync(audioPath)) {
      await mkdir(audioPath, { recursive: true })
    }

    // Add shared flag to conversation data
    const conversationData: ConversationData = {
      ...body.data,
      shared: true,
      shared_at: new Date().toISOString(),
    }

    // Save conversation data
    const conversationFile = path.join(conversationPath, 'conversation.json')
    await writeFile(conversationFile, JSON.stringify(conversationData, null, 2))

    // Check for audio files
    let hasAudio = false
    try {
      const files = await readFile(audioPath)
      // This will throw if directory doesn't exist or is empty
      hasAudio = true
    } catch {
      // Directory doesn't exist or is empty
      hasAudio = false
    }

    // Update shared conversations tracker
    const dataDir = path.join(process.cwd(), 'data')
    const sharedConversationsFile = path.join(dataDir, 'shared_conversations.json')

    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true })
    }

    let sharedConversations: Record<string, SharedConversation> = {}

    try {
      const fileContent = await readFile(sharedConversationsFile, 'utf-8')
      sharedConversations = JSON.parse(fileContent)
    } catch {
      // File doesn't exist or is invalid, start with empty object
    }

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    sharedConversations[conversationId] = {
      conversation_id: conversationId,
      shared_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString(),
      has_audio: hasAudio,
      title: conversationData.messages?.[0]?.content?.substring(0, 50) + '...' || 'Shared Conversation'
    }

    await writeFile(sharedConversationsFile, JSON.stringify(sharedConversations, null, 2))

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/share/${conversationId}`

    return NextResponse.json({
      success: true,
      shareUrl,
      expiresAt: sharedConversations[conversationId].expires_at
    })

  } catch (error) {
    console.error('Error sharing conversation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to share conversation' },
      { status: 500 }
    )
  }
}