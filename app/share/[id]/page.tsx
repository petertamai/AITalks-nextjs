import { notFound } from 'next/navigation'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { ConversationData } from '@/types'
import SharedConversationView from './SharedConversationView'

interface SharePageProps {
  params: Promise<{ id: string }>
}

async function getSharedConversation(id: string) {
  try {
    // Clean the conversation ID
    const cleanId = id.replace(/[^a-zA-Z0-9_]/g, '')
    
    if (cleanId !== id) {
      return null
    }

    // Check if conversation exists
    const conversationPath = path.join(process.cwd(), 'public', 'conversations', id, 'conversation.json')
    
    if (!existsSync(conversationPath)) {
      return null
    }

    // Read conversation data
    const fileContent = await readFile(conversationPath, 'utf-8')
    const conversationData: ConversationData = JSON.parse(fileContent)

    // Check if conversation is shared and not expired
    if (!conversationData.shared) {
      return null
    }

    // Check expiry (if shared_at exists, it expires in 30 days)
    if (conversationData.shared_at) {
      const sharedDate = new Date(conversationData.shared_at)
      const expiryDate = new Date(sharedDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      
      if (new Date() > expiryDate) {
        return null
      }
    }

    // Check for audio files
    const audioPath = path.join(process.cwd(), 'public', 'conversations', id, 'audio')
    let hasAudio = false
    
    if (existsSync(audioPath)) {
      try {
        const { readdir } = await import('fs/promises')
        const files = await readdir(audioPath)
        const audioFiles = files.filter(file => file.endsWith('.mp3'))
        hasAudio = audioFiles.length > 0
      } catch {
        hasAudio = false
      }
    }

    return {
      conversationData,
      hasAudio
    }
  } catch (error) {
    console.error('Error loading shared conversation:', error)
    return null
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params
  const result = await getSharedConversation(id)

  if (!result) {
    notFound()
  }

  const { conversationData, hasAudio } = result

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center p-4">
          <div>
            <h1 className="text-2xl font-bold">AI Conversation System</h1>
            <p className="text-sm text-muted-foreground">Shared Conversation</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Shared on {conversationData.shared_at ? new Date(conversationData.shared_at).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <SharedConversationView
          conversationData={conversationData}
          conversationId={id}
          hasAudio={hasAudio}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Piotr Tamulewicz | <a href="https://petertam.pro/" className="underline">petertam.pro</a></p>
        </div>
      </footer>
    </div>
  )
}