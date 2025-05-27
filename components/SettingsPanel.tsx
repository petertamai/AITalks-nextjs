'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Search } from 'lucide-react'
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
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [apiKeys, setApiKeys] = useState({
    openrouter: '',
    groq: ''
  })
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Load API keys from cookies on component mount
  useEffect(() => {
    const loadApiKeys = () => {
      const openrouterKey = Cookies.get('openrouter_api_key') || ''
      const groqKey = Cookies.get('groq_api_key') || ''
      
      console.log('Loading API keys from cookies:', { openrouterKey: openrouterKey ? 'Found' : 'Not found', groqKey: groqKey ? 'Found' : 'Not found' })
      
      setApiKeys({
        openrouter: openrouterKey,
        groq: groqKey
      })
    }

    loadApiKeys()
  }, [])

  // Also load when panel opens
  useEffect(() => {
    if (isOpen) {
      const openrouterKey = Cookies.get('openrouter_api_key') || ''
      const groqKey = Cookies.get('groq_api_key') || ''
      
      setApiKeys({
        openrouter: openrouterKey,
        groq: groqKey
      })
    }
  }, [isOpen])

  // Filter models based on search
  useEffect(() => {
    console.log('Filtering models, search term:', modelSearch)
    console.log('Total models:', models.length)
    
    if (modelSearch.trim() === '') {
      setFilteredModels(models)
    } else {
      const searchTerm = modelSearch.toLowerCase()
      const filtered = models.filter(model => 
        model.id.toLowerCase().includes(searchTerm) ||
        (model.name && model.name.toLowerCase().includes(searchTerm))
      )
      console.log('Filtered models count:', filtered.length)
      setFilteredModels(filtered)
    }
  }, [models, modelSearch])

  useEffect(() => {
    if (isOpen && !isSharedView && apiKeys.openrouter) {
      console.log('Settings opened with OpenRouter key, fetching models')
      fetchModels()
    }
  }, [isOpen, isSharedView, apiKeys.openrouter])

  const fetchModels = async () => {
    console.log('Starting to fetch models...')
    
    // Check if we have an API key
    const currentKey = Cookies.get('openrouter_api_key')
    console.log('Current OpenRouter API key:', currentKey ? 'Found' : 'Not found')
    
    if (!currentKey) {
      console.log('No API key found, cannot fetch models')
      alert('Please save your OpenRouter API key first')
      return
    }
    
    setIsLoadingModels(true)
    try {
      console.log('Making fetch request to /api/openrouter/models')
      const response = await fetch('/api/openrouter/models', {
        credentials: 'include' // This ensures cookies are sent
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Response data:', data)
        
        if (data.data && Array.isArray(data.data)) {
          const sortedModels = data.data.sort((a: OpenRouterModel, b: OpenRouterModel) => a.id.localeCompare(b.id))
          console.log('Successfully loaded models:', sortedModels.length)
          setModels(sortedModels)
          setFilteredModels(sortedModels)
        } else {
          console.error('Invalid data format:', data)
          alert('Invalid response format from OpenRouter API')
        }
      } else {
        const errorData = await response.json()
        console.error('API error:', errorData)
        alert('Error fetching models: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Fetch error:', error)
      alert('Network error fetching models: ' + error)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const saveApiKey = async (keyType: 'openrouter_api_key' | 'groq_api_key', value: string) => {
    try {
      console.log(`Saving ${keyType}:`, value ? 'Has value' : 'Empty value')
      
      // Save to cookie immediately with proper settings
      if (value.trim()) {
        const cookieOptions = { 
          expires: 30, // 30 days
          path: '/', // Available site-wide
          sameSite: 'lax' as const, // Good compatibility
          secure: false // Allow on localhost
        }
        
        Cookies.set(keyType, value.trim(), cookieOptions)
        console.log(`Cookie set for ${keyType}`)
        
        // Verify cookie was set
        const testRead = Cookies.get(keyType)
        console.log(`Cookie verification for ${keyType}:`, testRead ? 'Success' : 'Failed')
        
      } else {
        Cookies.remove(keyType, { path: '/' })
        console.log(`Cookie removed for ${keyType}`)
      }

      // Update local state immediately
      const keyName = keyType === 'openrouter_api_key' ? 'openrouter' : 'groq'
      setApiKeys(prev => ({ ...prev, [keyName]: value.trim() }))

      // Save via API for server-side access (optional, since we have cookies)
      try {
        const response = await fetch('/api/keys/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            [keyType]: value
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Server save response:', data)
          alert(data.messages.join('\n'))
        } else {
          console.log('Server save failed, but cookie save succeeded')
          alert('API key saved successfully!')
        }
      } catch (serverError) {
        console.log('Server save error, but cookie save succeeded:', serverError)
        alert('API key saved successfully!')
      }

      // Fetch models if OpenRouter key was saved
      if (keyType === 'openrouter_api_key' && value.trim()) {
        setTimeout(() => {
          fetchModels()
        }, 500) // Small delay to ensure cookie is set
      }
      
    } catch (error) {
      console.error('Error saving API key:', error)
      alert('Error saving API key: ' + error)
    }
  }

  const handleApiKeyChange = (keyType: 'openrouter' | 'groq', value: string) => {
    setApiKeys(prev => ({ ...prev, [keyType]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl bg-gray-800 border-gray-600 my-4">
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
                    <CardTitle className="text-lg text-white">OpenRouter API Key</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Enter OpenRouter API key"
                      value={apiKeys.openrouter}
                      onChange={(e) => handleApiKeyChange('openrouter', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-400">Your API key is stored securely in browser cookies.</p>
                    <Button
                      onClick={() => saveApiKey('openrouter_api_key', apiKeys.openrouter)}
                      className="bg-custom-btn hover:bg-blue-600"
                    >
                      Save Key
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">
                      Groq API Key <span className="text-sm font-normal">(Optional for TTS)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Enter Groq API key (optional)"
                      value={apiKeys.groq}
                      onChange={(e) => handleApiKeyChange('groq', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-400">Required only if you want text-to-speech.</p>
                    <Button
                      onClick={() => saveApiKey('groq_api_key', apiKeys.groq)}
                      className="bg-custom-btn hover:bg-blue-600"
                    >
                      Save Key
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* AI Configuration Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-white mb-1">Model</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search models... (e.g. gpt, claude, gemini)"
                        value={modelSearch}
                        onChange={(e) => {
                          console.log('Search input changed:', e.target.value)
                          setModelSearch(e.target.value)
                        }}
                        className="bg-gray-800 border-gray-600 text-white pl-10 pr-10"
                        disabled={isSharedView}
                      />
                      {modelSearch && (
                        <button
                          onClick={() => setModelSearch('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <Select
                      value={ai1Config.model}
                      onValueChange={(value) => onAI1ConfigChange({ model: value })}
                      disabled={isSharedView}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 max-h-60 overflow-y-auto">
                        {filteredModels.length > 0 ? (
                          filteredModels.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-700">
                              <div className="flex flex-col">
                                <span>{model.id}</span>
                                {model.name && model.name !== model.id && (
                                  <span className="text-xs text-gray-400">{model.name}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : modelSearch ? (
                          <SelectItem value="" disabled className="text-gray-400">
                            No models found for "{modelSearch}"
                          </SelectItem>
                        ) : (
                          <SelectItem value="" disabled className="text-gray-400">
                            {isLoadingModels ? 'Loading...' : 'No models available'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {modelSearch && (
                      <p className="text-xs text-gray-400">
                        Showing {filteredModels.length} of {models.length} models
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Max Tokens</label>
                    <Input
                      type="number"
                      value={ai1Config.maxTokens}
                      onChange={(e) => onAI1ConfigChange({ maxTokens: parseInt(e.target.value) })}
                      min={50}
                      max={4000}
                      className="bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Temperature</label>
                    <Input
                      type="number"
                      value={ai1Config.temperature}
                      onChange={(e) => onAI1ConfigChange({ temperature: parseFloat(e.target.value) })}
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
                        disabled={isSharedView}
                      />
                      <label htmlFor="ai1-tts" className="text-xs text-white">Enabled</label>
                    </div>
                  </div>
                  <Select
                    value={ai1Config.tts.voice}
                    onValueChange={(value) => 
                      onAI1ConfigChange({ 
                        tts: { ...ai1Config.tts, voice: value as VoiceOption } 
                      })
                    }
                    disabled={!ai1Config.tts.enabled || isSharedView}
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
                    placeholder="Instructions for AI behavior..."
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
                  <label className="block text-sm font-medium text-white mb-1">Model</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search models..."
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white pl-10"
                        disabled={isSharedView}
                      />
                    </div>
                    <Select
                      value={ai2Config.model}
                      onValueChange={(value) => onAI2ConfigChange({ model: value })}
                      disabled={isSharedView}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 max-h-60 overflow-y-auto">
                        {filteredModels.length > 0 ? (
                          filteredModels.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-700">
                              {model.id}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled className="text-gray-400">
                            {modelSearch ? 'No models found' : 'No models available'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Max Tokens</label>
                    <Input
                      type="number"
                      value={ai2Config.maxTokens}
                      onChange={(e) => onAI2ConfigChange({ maxTokens: parseInt(e.target.value) })}
                      min={50}
                      max={4000}
                      className="bg-gray-800 border-gray-600 text-white"
                      disabled={isSharedView}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Temperature</label>
                    <Input
                      type="number"
                      value={ai2Config.temperature}
                      onChange={(e) => onAI2ConfigChange({ temperature: parseFloat(e.target.value) })}
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
                        disabled={isSharedView}
                      />
                      <label htmlFor="ai2-tts" className="text-xs text-white">Enabled</label>
                    </div>
                  </div>
                  <Select
                    value={ai2Config.tts.voice}
                    onValueChange={(value) => 
                      onAI2ConfigChange({ 
                        tts: { ...ai2Config.tts, voice: value as VoiceOption } 
                      })
                    }
                    disabled={!ai2Config.tts.enabled || isSharedView}
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
                    placeholder="Instructions for AI behavior..."
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