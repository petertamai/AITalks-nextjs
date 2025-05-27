'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Search, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { AIAgent, OpenRouterModel, VoiceOption } from '@/types'
import Cookies from 'js-cookie'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  ai1Config: AIAgent
  ai2Config: AIAgent
  onAI1ConfigChange: (config: Partial<AIAgent>) => void
  onAI2ConfigChange: (config: Partial<AIAgent>) => void
  isSharedView?: boolean
}

const VOICE_OPTIONS: { value: VoiceOption; label: string }[] = [
  { value: 'Arista-PlayAI', label: 'Arista (Female)' },
  { value: 'Angelo-PlayAI', label: 'Angelo (Male)' },
  { value: 'Nova-PlayAI', label: 'Nova (Female)' },
  { value: 'Atlas-PlayAI', label: 'Atlas (Male)' },
  { value: 'Indigo-PlayAI', label: 'Indigo (Neutral)' },
]

export default function SettingsPanel({
  isOpen,
  onClose,
  ai1Config,
  ai2Config,
  onAI1ConfigChange,
  onAI2ConfigChange,
  isSharedView = false
}: SettingsPanelProps) {
  // Models and search states
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [ai1ModelSearch, setAI1ModelSearch] = useState('')
  const [ai2ModelSearch, setAI2ModelSearch] = useState('')
  const [ai1FilteredModels, setAI1FilteredModels] = useState<OpenRouterModel[]>([])
  const [ai2FilteredModels, setAI2FilteredModels] = useState<OpenRouterModel[]>([])
  
  // API key states
  const [apiKeys, setApiKeys] = useState({
    openrouter: '',
    groq: ''
  })
  const [keyStatus, setKeyStatus] = useState({
    openrouter: { saved: false, valid: false },
    groq: { saved: false, valid: false }
  })
  
  // Loading states
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState<string | null>(null)
  const [isValidatingKeys, setIsValidatingKeys] = useState(false)

  // Load API keys from cookies on mount AND when panel opens
  useEffect(() => {
    loadApiKeysFromCookies()
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadApiKeysFromCookies()
    }
  }, [isOpen])

  // Filter models for AI1
  useEffect(() => {
    if (ai1ModelSearch.trim() === '') {
      setAI1FilteredModels(models)
    } else {
      const searchTerm = ai1ModelSearch.toLowerCase().trim()
      const filtered = models.filter(model => 
        model.id.toLowerCase().includes(searchTerm) ||
        (model.name && model.name.toLowerCase().includes(searchTerm))
      )
      setAI1FilteredModels(filtered)
    }
  }, [models, ai1ModelSearch])

  // Filter models for AI2
  useEffect(() => {
    if (ai2ModelSearch.trim() === '') {
      setAI2FilteredModels(models)
    } else {
      const searchTerm = ai2ModelSearch.toLowerCase().trim()
      const filtered = models.filter(model => 
        model.id.toLowerCase().includes(searchTerm) ||
        (model.name && model.name.toLowerCase().includes(searchTerm))
      )
      setAI2FilteredModels(filtered)
    }
  }, [models, ai2ModelSearch])

  const loadApiKeysFromCookies = () => {
    console.log('🔄 Loading API keys from cookies...')
    
    try {
      // Force fresh cookie read
      const allCookies = document.cookie
      console.log('📂 All cookies:', allCookies)
      
      const openrouterKey = Cookies.get('openrouter_api_key') || ''
      const groqKey = Cookies.get('groq_api_key') || ''
      
      console.log('🔑 Keys loaded:', { 
        openrouter: openrouterKey ? `${openrouterKey.substring(0, 20)}...` : 'None',
        groq: groqKey ? `${groqKey.substring(0, 20)}...` : 'None'
      })
      
      // Update state
      setApiKeys({
        openrouter: openrouterKey,
        groq: groqKey
      })
      
      // Update key status
      setKeyStatus({
        openrouter: { saved: Boolean(openrouterKey), valid: false },
        groq: { saved: Boolean(groqKey), valid: false }
      })

      // Auto-fetch models if OpenRouter key exists and we're not in shared view
      if (openrouterKey && !isSharedView) {
        console.log('✅ OpenRouter key found, auto-fetching models...')
        setTimeout(() => {
          fetchModels(openrouterKey)
        }, 500)
      }
      
      // Validate keys if they exist
      if (openrouterKey || groqKey) {
        setTimeout(() => {
          validateApiKeys(openrouterKey, groqKey)
        }, 300)
      }
      
    } catch (error) {
      console.error('❌ Error loading cookies:', error)
    }
  }

  const validateApiKeys = async (openrouterKey?: string, groqKey?: string) => {
    setIsValidatingKeys(true)
    
    try {
      // Validate OpenRouter key
      if (openrouterKey || apiKeys.openrouter) {
        const keyToValidate = openrouterKey || apiKeys.openrouter
        try {
          const response = await fetch('/api/openrouter/models', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          
          const isValid = response.ok
          setKeyStatus(prev => ({
            ...prev,
            openrouter: { ...prev.openrouter, valid: isValid }
          }))
          
          console.log('🔐 OpenRouter key validation:', isValid ? 'Valid' : 'Invalid')
        } catch (error) {
          console.error('❌ OpenRouter key validation failed:', error)
          setKeyStatus(prev => ({
            ...prev,
            openrouter: { ...prev.openrouter, valid: false }
          }))
        }
      }

      // Validate Groq key (simplified validation)
      if (groqKey || apiKeys.groq) {
        const keyToValidate = groqKey || apiKeys.groq
        const isValid = keyToValidate.startsWith('gsk_') // Groq keys start with gsk_
        setKeyStatus(prev => ({
          ...prev,
          groq: { ...prev.groq, valid: isValid }
        }))
        console.log('🔐 Groq key validation:', isValid ? 'Valid format' : 'Invalid format')
      }
    } finally {
      setIsValidatingKeys(false)
    }
  }

  const saveApiKey = async (keyType: 'openrouter' | 'groq') => {
    const keyValue = apiKeys[keyType].trim()
    const cookieKey = keyType === 'openrouter' ? 'openrouter_api_key' : 'groq_api_key'
    
    setIsSavingKey(keyType)
    
    try {
      console.log(`💾 Saving ${keyType} API key...`)
      
      // Validate key format before saving
      if (keyValue) {
        if (keyType === 'openrouter' && !keyValue.startsWith('sk-or')) {
          throw new Error('OpenRouter API keys must start with "sk-or-"')
        }
        if (keyType === 'groq' && !keyValue.startsWith('gsk_')) {
          throw new Error('Groq API keys must start with "gsk_"')
        }
      }
      
      // Save to cookie with explicit settings for localhost
      const cookieOptions = {
        expires: 30, // 30 days
        path: '/',
        sameSite: 'lax' as const,
        secure: false, // Allow HTTP (localhost)
      }
      
      if (keyValue) {
        // Set cookie
        Cookies.set(cookieKey, keyValue, cookieOptions)
        console.log(`✅ ${keyType} cookie set successfully`)
        
        // IMPROVED: Wait and verify cookie with retries
        let verification = ''
        let attempts = 0
        const maxAttempts = 5
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempts + 1))) // Increasing delay
          verification = Cookies.get(cookieKey) || ''
          
          if (verification === keyValue) {
            console.log(`✅ Cookie verification successful on attempt ${attempts + 1}`)
            break
          }
          
          attempts++
          console.log(`⚠️ Cookie verification attempt ${attempts}: Expected "${keyValue.substring(0, 15)}...", got "${verification.substring(0, 15)}..."`)
        }
        
        if (verification !== keyValue) {
          console.warn('⚠️ Cookie verification failed after all attempts, but continuing...')
          // Don't throw error, just warn - cookie might still work
        }
        
        // Update status
        setKeyStatus(prev => ({
          ...prev,
          [keyType]: { saved: true, valid: false }
        }))
        
      } else {
        Cookies.remove(cookieKey, { path: '/' })
        console.log(`🗑️ ${keyType} cookie cleared`)
        
        setKeyStatus(prev => ({
          ...prev,
          [keyType]: { saved: false, valid: false }
        }))
      }

      // Also save via API for server-side access
      try {
        const response = await fetch('/api/keys/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            [cookieKey]: keyValue
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('📤 Server save successful:', data.messages)
          alert(`${keyType === 'openrouter' ? 'OpenRouter' : 'Groq'} API key saved successfully!`)
        } else {
          const errorData = await response.json()
          console.warn('⚠️ Server save failed:', errorData)
          alert(`${keyType === 'openrouter' ? 'OpenRouter' : 'Groq'} API key saved locally! (Server save failed)`)
        }
      } catch (serverError) {
        console.warn('⚠️ Server save error:', serverError)
        alert(`${keyType === 'openrouter' ? 'OpenRouter' : 'Groq'} API key saved locally! (Server not available)`)
      }
      
      // Validate and fetch models if OpenRouter key
      if (keyType === 'openrouter' && keyValue) {
        setTimeout(() => {
          validateApiKeys(keyValue)
          fetchModels(keyValue)
        }, 1000) // Longer delay for validation
      } else if (keyType === 'groq' && keyValue) {
        setTimeout(() => {
          validateApiKeys(undefined, keyValue)
        }, 500)
      }
      
    } catch (error) {
      console.error(`❌ Error saving ${keyType} API key:`, error)
      alert(`Error saving ${keyType} API key: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSavingKey(null)
    }
  }

  const fetchModels = async (keyOverride?: string) => {
    console.log('🔄 Fetching models...')
    
    const currentKey = keyOverride || Cookies.get('openrouter_api_key')
    if (!currentKey) {
      console.log('❌ No OpenRouter API key found')
      alert('Please save your OpenRouter API key first')
      return
    }
    
    setIsLoadingModels(true)
    
    try {
      // Clear cache first
      const timestamp = Date.now()
      const response = await fetch(`/api/openrouter/models?t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      console.log('📡 Models API response:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Raw API response:', data)
        
        if (data.data && Array.isArray(data.data)) {
          const sortedModels = data.data.sort((a: OpenRouterModel, b: OpenRouterModel) => 
            a.id.localeCompare(b.id)
          )
          
          setModels(sortedModels)
          setAI1FilteredModels(sortedModels)
          setAI2FilteredModels(sortedModels)
          
          console.log(`✅ Successfully loaded ${sortedModels.length} models`)
          
          // Update OpenRouter key status to valid
          setKeyStatus(prev => ({
            ...prev,
            openrouter: { ...prev.openrouter, valid: true }
          }))
          
        } else {
          console.error('❌ Invalid models data format:', data)
          alert('Invalid response format from OpenRouter API')
        }
      } else {
        const errorData = await response.text()
        console.error('❌ Models API error:', { status: response.status, body: errorData })
        
        if (response.status === 401) {
          alert('Invalid OpenRouter API key. Please check your key.')
          setKeyStatus(prev => ({
            ...prev,
            openrouter: { ...prev.openrouter, valid: false }
          }))
        } else {
          alert(`Error fetching models: ${response.status} - ${errorData}`)
        }
      }
    } catch (error) {
      console.error('❌ Network error fetching models:', error)
      alert(`Network error: ${error}`)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleApiKeyChange = (keyType: 'openrouter' | 'groq', value: string) => {
    setApiKeys(prev => ({ ...prev, [keyType]: value }))
    // Reset validation status when key changes
    setKeyStatus(prev => ({
      ...prev,
      [keyType]: { ...prev[keyType], valid: false }
    }))
  }

  const getKeyStatusIcon = (keyType: 'openrouter' | 'groq') => {
    const status = keyStatus[keyType]
    if (isValidatingKeys) {
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
    }
    if (status.saved && status.valid) {
      return <CheckCircle className="h-4 w-4 text-green-400" />
    }
    if (status.saved && !status.valid) {
      return <AlertCircle className="h-4 w-4 text-yellow-400" />
    }
    return null
  }

  const getKeyStatusText = (keyType: 'openrouter' | 'groq') => {
    const status = keyStatus[keyType]
    if (isValidatingKeys) return 'Validating...'
    if (status.saved && status.valid) return 'Saved & Valid'
    if (status.saved && !status.valid) return 'Saved (Need validation)'
    return ''
  }

  if (!isOpen) return null

  const hasValidOpenRouterKey = keyStatus.openrouter.saved && keyStatus.openrouter.valid
  const hasValidGroqKey = keyStatus.groq.saved && keyStatus.groq.valid

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-7xl bg-gray-800 border-gray-600 my-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-white">Settings</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSharedView && (
            <>
              {/* API Keys Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white">OpenRouter API Key</CardTitle>
                      <div className="flex items-center gap-2">
                        {getKeyStatusIcon('openrouter')}
                        <span className="text-sm text-gray-300">{getKeyStatusText('openrouter')}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="password"
                      placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={apiKeys.openrouter}
                      onChange={(e) => handleApiKeyChange('openrouter', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">
                      Required for AI models. Get your key from{' '}
                      <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                        openrouter.ai/keys
                      </a>
                      <br />
                      <strong>Format:</strong> Must start with "sk-or-"
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveApiKey('openrouter')}
                        disabled={isSavingKey === 'openrouter'}
                        className="bg-custom-btn hover:bg-blue-600 flex-1"
                      >
                        {isSavingKey === 'openrouter' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Key'
                        )}
                      </Button>
                      {hasValidOpenRouterKey && (
                        <Button
                          onClick={() => fetchModels()}
                          disabled={isLoadingModels}
                          variant="secondary"
                          size="sm"
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white">Groq API Key (Optional)</CardTitle>
                      <div className="flex items-center gap-2">
                        {getKeyStatusIcon('groq')}
                        <span className="text-sm text-gray-300">{getKeyStatusText('groq')}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="password"
                      placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={apiKeys.groq}
                      onChange={(e) => handleApiKeyChange('groq', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">
                      Required only for text-to-speech. Get your key from{' '}
                      <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                        console.groq.com/keys
                      </a>
                      <br />
                      <strong>Format:</strong> Must start with "gsk_"
                    </p>
                    <Button
                      onClick={() => saveApiKey('groq')}
                      disabled={isSavingKey === 'groq'}
                      className="bg-custom-btn hover:bg-blue-600 w-full"
                    >
                      {isSavingKey === 'groq' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Key'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Models Status */}
              {hasValidOpenRouterKey && (
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg text-white">
                        Available Models ({models.length})
                      </CardTitle>
                      <Button
                        onClick={() => fetchModels()}
                        disabled={isLoadingModels}
                        className="bg-custom-btn hover:bg-blue-600"
                        size="sm"
                      >
                        {isLoadingModels ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">
                      {isLoadingModels ? (
                        'Loading models from OpenRouter...'
                      ) : models.length > 0 ? (
                        `${models.length} models loaded successfully. Use the search boxes below to filter models for each AI agent.`
                      ) : (
                        'No models loaded. Click Refresh to load models.'
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* AI Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI 1 Configuration */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-white">AI Agent 1</CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-white">Name:</label>
                    <Input
                      value={ai1Config.name}
                      onChange={(e) => onAI1ConfigChange({ name: e.target.value })}
                      className="w-24 h-8 bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Model Selection</label>
                  
                  {/* AI1 Model Search */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search AI1 models... (e.g. gpt, claude, gemini)"
                      value={ai1ModelSearch}
                      onChange={(e) => setAI1ModelSearch(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white pl-10 pr-10"
                      disabled={isSharedView || !hasValidOpenRouterKey}
                    />
                    {ai1ModelSearch && (
                      <button
                        onClick={() => setAI1ModelSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* AI1 Model Select */}
                  <Select
                    value={ai1Config.model}
                    onValueChange={(value) => onAI1ConfigChange({ model: value })}
                    disabled={isSharedView || !hasValidOpenRouterKey}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder={
                        !hasValidOpenRouterKey ? "Save valid OpenRouter API key first" :
                        isLoadingModels ? "Loading models..." : 
                        "Select AI1 model"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600 max-h-60 overflow-y-auto">
                      {ai1FilteredModels.length > 0 ? (
                        ai1FilteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-700">
                            <div className="flex flex-col">
                              <span className="font-medium">{model.id}</span>
                              {model.name && model.name !== model.id && (
                                <span className="text-xs text-gray-400">{model.name}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : hasValidOpenRouterKey ? (
                        <SelectItem value="" disabled className="text-gray-400">
                          {isLoadingModels ? 'Loading...' : 
                           ai1ModelSearch ? `No models found for "${ai1ModelSearch}"` : 
                           'No models available'}
                        </SelectItem>
                      ) : (
                        <SelectItem value="" disabled className="text-gray-400">
                          Save valid OpenRouter API key first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {ai1ModelSearch && (
                    <p className="text-xs text-gray-400 mt-1">
                      Showing {ai1FilteredModels.length} of {models.length} models for AI1
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Max Tokens</label>
                    <Input
                      type="number"
                      value={ai1Config.maxTokens}
                      onChange={(e) => onAI1ConfigChange({ maxTokens: parseInt(e.target.value) || 1000 })}
                      min={50}
                      max={8000}
                      className="bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Temperature</label>
                    <Input
                      type="number"
                      value={ai1Config.temperature}
                      onChange={(e) => onAI1ConfigChange({ temperature: parseFloat(e.target.value) || 0.5 })}
                      min={0}
                      max={2}
                      step={0.1}
                      className="bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-white">Text-to-Speech</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ai1-tts"
                        checked={ai1Config.tts.enabled}
                        onCheckedChange={(checked) => 
                          onAI1ConfigChange({ 
                            tts: { ...ai1Config.tts, enabled: checked as boolean } 
                          })
                        }
                        disabled={isSharedView || !hasValidGroqKey}
                      />
                      <label htmlFor="ai1-tts" className="text-xs text-white">
                        Enabled {!hasValidGroqKey && '(Requires valid Groq API key)'}
                      </label>
                    </div>
                  </div>
                  <Select
                    value={ai1Config.tts.voice}
                    onValueChange={(value) => 
                      onAI1ConfigChange({ 
                        tts: { ...ai1Config.tts, voice: value as VoiceOption } 
                      })
                    }
                    disabled={!ai1Config.tts.enabled || isSharedView || !hasValidGroqKey}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value} className="text-white">
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">System Prompt</label>
                  <Textarea
                    value={ai1Config.prompt}
                    onChange={(e) => onAI1ConfigChange({ prompt: e.target.value })}
                    placeholder="Instructions for AI1 behavior..."
                    className="bg-gray-800 border-gray-600 text-white h-20"
                    disabled={isSharedView}
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI 2 Configuration */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-white">AI Agent 2</CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-white">Name:</label>
                    <Input
                      value={ai2Config.name}
                      onChange={(e) => onAI2ConfigChange({ name: e.target.value })}
                      className="w-24 h-8 bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Model Selection</label>
                  
                  {/* AI2 Model Search */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search AI2 models... (e.g. gpt, claude, gemini)"
                      value={ai2ModelSearch}
                      onChange={(e) => setAI2ModelSearch(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white pl-10 pr-10"
                      disabled={isSharedView || !hasValidOpenRouterKey}
                    />
                    {ai2ModelSearch && (
                      <button
                        onClick={() => setAI2ModelSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* AI2 Model Select */}
                  <Select
                    value={ai2Config.model}
                    onValueChange={(value) => onAI2ConfigChange({ model: value })}
                    disabled={isSharedView || !hasValidOpenRouterKey}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder={
                        !hasValidOpenRouterKey ? "Save valid OpenRouter API key first" :
                        isLoadingModels ? "Loading models..." : 
                        "Select AI2 model"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600 max-h-60 overflow-y-auto">
                      {ai2FilteredModels.length > 0 ? (
                        ai2FilteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-700">
                            <div className="flex flex-col">
                              <span className="font-medium">{model.id}</span>
                              {model.name && model.name !== model.id && (
                                <span className="text-xs text-gray-400">{model.name}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : hasValidOpenRouterKey ? (
                        <SelectItem value="" disabled className="text-gray-400">
                          {isLoadingModels ? 'Loading...' : 
                           ai2ModelSearch ? `No models found for "${ai2ModelSearch}"` : 
                           'No models available'}
                        </SelectItem>
                      ) : (
                        <SelectItem value="" disabled className="text-gray-400">
                          Save valid OpenRouter API key first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {ai2ModelSearch && (
                    <p className="text-xs text-gray-400 mt-1">
                      Showing {ai2FilteredModels.length} of {models.length} models for AI2
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Max Tokens</label>
                    <Input
                      type="number"
                      value={ai2Config.maxTokens}
                      onChange={(e) => onAI2ConfigChange({ maxTokens: parseInt(e.target.value) || 1000 })}
                      min={50}
                      max={8000}
                      className="bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Temperature</label>
                    <Input
                      type="number"
                      value={ai2Config.temperature}
                      onChange={(e) => onAI2ConfigChange({ temperature: parseFloat(e.target.value) || 0.5 })}
                      min={0}
                      max={2}
                      step={0.1}
                      className="bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-white">Text-to-Speech</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ai2-tts"
                        checked={ai2Config.tts.enabled}
                        onCheckedChange={(checked) => 
                          onAI2ConfigChange({ 
                            tts: { ...ai2Config.tts, enabled: checked as boolean } 
                          })
                        }
                        disabled={isSharedView || !hasValidGroqKey}
                      />
                      <label htmlFor="ai2-tts" className="text-xs text-white">
                        Enabled {!hasValidGroqKey && '(Requires valid Groq API key)'}
                      </label>
                    </div>
                  </div>
                  <Select
                    value={ai2Config.tts.voice}
                    onValueChange={(value) => 
                      onAI2ConfigChange({ 
                        tts: { ...ai2Config.tts, voice: value as VoiceOption } 
                      })
                    }
                    disabled={!ai2Config.tts.enabled || isSharedView || !hasValidGroqKey}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value} className="text-white">
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">System Prompt</label>
                  <Textarea
                    value={ai2Config.prompt}
                    onChange={(e) => onAI2ConfigChange({ prompt: e.target.value })}
                    placeholder="Instructions for AI2 behavior..."
                    className="bg-gray-800 border-gray-600 text-white h-20"
                    disabled={isSharedView}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}