import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  console.log('🔄 OpenRouter Models API Request Started')
  
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
        // More robust cookie parsing
        const cookieMatches = cookieHeader.match(/openrouter_api_key=([^;]+)/)
        if (cookieMatches && cookieMatches[1]) {
          apiKey = decodeURIComponent(cookieMatches[1].trim())
          console.log('🍪 Client-side cookie found:', `${apiKey.substring(0, 15)}...`)
        }
      }
    }

    // Validate API key format
    if (!apiKey || !apiKey.trim()) {
      console.log('❌ No API key found in any location')
      return NextResponse.json(
        { 
          error: 'OpenRouter API key not found. Please save your API key in the settings first.',
          debug: 'No key in server or client cookies'
        },
        { status: 400 }
      )
    }

    // Validate key format (OpenRouter keys typically start with sk-or-v1- or sk-or-)
    const trimmedKey = apiKey.trim()
    if (!trimmedKey.startsWith('sk-or')) {
      console.log('❌ Invalid API key format:', `${trimmedKey.substring(0, 10)}...`)
      return NextResponse.json(
        { 
          error: 'Invalid OpenRouter API key format. Keys should start with "sk-or-".',
          debug: `Key format: ${trimmedKey.substring(0, 10)}...`
        },
        { status: 400 }
      )
    }

    console.log('✅ Valid API key found, making OpenRouter request...')

    // Make request to OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Conversation System',
        'User-Agent': 'AI-Conversation-System/1.0',
        'Content-Type': 'application/json'
      },
    })

    console.log('📡 OpenRouter API response:', {
      status: openRouterResponse.status,
      statusText: openRouterResponse.statusText,
      ok: openRouterResponse.ok
    })

    // Handle response
    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error('❌ OpenRouter API error:', {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        body: errorText.substring(0, 500) // Limit error text length
      })
      
      // Provide specific error messages
      if (openRouterResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid OpenRouter API key. Please check your API key in settings.',
            debug: 'Authentication failed with OpenRouter'
          },
          { status: 401 }
        )
      } else if (openRouterResponse.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please try again later.',
            debug: 'OpenRouter rate limit hit'
          },
          { status: 429 }
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
            error: `OpenRouter API error: ${openRouterResponse.status} - ${errorText}`,
            debug: `HTTP ${openRouterResponse.status}`
          },
          { status: openRouterResponse.status }
        )
      }
    }

    // Parse successful response
    const data = await openRouterResponse.json()
    console.log('📊 OpenRouter response data:', {
      hasData: Boolean(data.data),
      isArray: Array.isArray(data.data),
      count: data.data?.length || 0
    })
    
    // Validate response format
    if (!data.data || !Array.isArray(data.data)) {
      console.error('❌ Invalid response format from OpenRouter:', data)
      return NextResponse.json(
        { 
          error: 'Invalid response format from OpenRouter API',
          debug: 'Expected data.data to be an array'
        },
        { status: 502 }
      )
    }

    console.log(`✅ Successfully fetched ${data.data.length} models from OpenRouter`)
    
    // Return successful response with cache headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('💥 Unexpected error in models API:', error)
    
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
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        debug: 'Unexpected server error'
      },
      { status: 500 }
    )
  }
}