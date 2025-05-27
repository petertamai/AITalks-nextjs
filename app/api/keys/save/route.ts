import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  console.log('🔐 API Keys Save Request Started')
  
  try {
    const body = await request.json()
    const cookieStore = cookies()
    const messages: string[] = []
    
    console.log('📋 Request body keys:', Object.keys(body))

    // Cookie options optimized for localhost and production
    const cookieOptions = {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
      sameSite: 'lax' as const, // Better compatibility
      path: '/', // Available site-wide
      domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle
    }

    console.log('🍪 Cookie options:', cookieOptions)

    // Handle OpenRouter API key
    if ('openrouter_api_key' in body) {
      const key = body.openrouter_api_key?.trim()
      
      if (!key) {
        console.log('🗑️ Clearing OpenRouter API key')
        try {
          cookieStore.set('openrouter_api_key', '', {
            ...cookieOptions,
            maxAge: 0 // Expire immediately
          })
          messages.push('OpenRouter API key cleared')
        } catch (error) {
          console.error('❌ Error clearing OpenRouter cookie:', error)
          messages.push('Error clearing OpenRouter API key')
        }
      } else {
        // Validate key format
        if (!key.startsWith('sk-or')) {
          console.log('⚠️ Invalid OpenRouter key format:', `${key.substring(0, 10)}...`)
          return NextResponse.json(
            { 
              error: 'Invalid OpenRouter API key format. Keys should start with "sk-or-".',
              success: false
            },
            { status: 400 }
          )
        }
        
        console.log('💾 Setting OpenRouter API key:', `${key.substring(0, 15)}...`)
        try {
          cookieStore.set('openrouter_api_key', key, cookieOptions)
          messages.push('OpenRouter API key saved')
          console.log('✅ OpenRouter cookie set successfully')
        } catch (error) {
          console.error('❌ Error setting OpenRouter cookie:', error)
          messages.push('Error saving OpenRouter API key')
        }
      }
    }

    // Handle Groq API key
    if ('groq_api_key' in body) {
      const key = body.groq_api_key?.trim()
      
      if (!key) {
        console.log('🗑️ Clearing Groq API key')
        try {
          cookieStore.set('groq_api_key', '', {
            ...cookieOptions,
            maxAge: 0 // Expire immediately
          })
          messages.push('Groq API key cleared')
        } catch (error) {
          console.error('❌ Error clearing Groq cookie:', error)
          messages.push('Error clearing Groq API key')
        }
      } else {
        // Validate key format (Groq keys typically start with gsk_)
        if (!key.startsWith('gsk_')) {
          console.log('⚠️ Invalid Groq key format:', `${key.substring(0, 10)}...`)
          return NextResponse.json(
            { 
              error: 'Invalid Groq API key format. Keys should start with "gsk_".',
              success: false
            },
            { status: 400 }
          )
        }
        
        console.log('💾 Setting Groq API key:', `${key.substring(0, 15)}...`)
        try {
          cookieStore.set('groq_api_key', key, cookieOptions)
          messages.push('Groq API key saved')
          console.log('✅ Groq cookie set successfully')
        } catch (error) {
          console.error('❌ Error setting Groq cookie:', error)
          messages.push('Error saving Groq API key')
        }
      }
    }

    console.log('📝 Save results:', messages)

    // Return success response
    const response = NextResponse.json({
      success: true,
      messages,
      timestamp: new Date().toISOString()
    })

    // Add CORS headers for development
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error) {
    console.error('💥 Error saving API keys:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save API keys',
        success: false,
        debug: 'Server error during key save'
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}