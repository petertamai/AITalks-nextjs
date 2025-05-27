import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    let apiKey = ''

    // Try to get API key from cookies (client-side cookies in request headers)
    const cookieHeader = request.headers.get('cookie')
    console.log('Cookie header:', cookieHeader)
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = decodeURIComponent(value || '')
        return acc
      }, {} as Record<string, string>)
      
      apiKey = cookies['openrouter_api_key'] || ''
      console.log('Found API key in cookies:', apiKey ? 'Yes' : 'No')
    }

    if (!apiKey) {
      console.log('No OpenRouter API key found in cookies')
      return NextResponse.json(
        { error: 'OpenRouter API key not found. Please save your API key in the settings first.' },
        { status: 400 }
      )
    }

    console.log('Making request to OpenRouter with API key')
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Conversation System',
      },
    })

    console.log('OpenRouter response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('OpenRouter error response:', errorText)
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Models fetched successfully, count:', data.data?.length || 0)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    )
  }
}