import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PWASettings {
  showInstallPrompt: boolean
  promptDismissed: boolean
  promptDismissedPermanently: boolean
}

interface PWASettingsContextType {
  pwaSettings: PWASettings
  updatePWASettings: (settings: Partial<PWASettings>) => void
  dismissPrompt: () => void
  dismissPromptPermanently: () => void
  resetPWASettings: () => void
}

const PWASettingsContext = createContext<PWASettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'pwa-settings'

const defaultSettings: PWASettings = {
  showInstallPrompt: true,
  promptDismissed: false,
  promptDismissedPermanently: false
}

export const PWASettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pwaSettings, setPwaSettings] = useState<PWASettings>(() => {
    // Initialize with stored settings if available
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedSettings = JSON.parse(stored)
        return { ...defaultSettings, ...parsedSettings }
      }
    } catch (error) {
      console.error('Failed to load PWA settings on init:', error)
    }
    return defaultSettings
  })


  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pwaSettings))
    } catch (error) {
      console.error('Failed to save PWA settings:', error)
    }
  }, [pwaSettings])

  const updatePWASettings = (newSettings: Partial<PWASettings>) => {
    setPwaSettings(prev => ({ ...prev, ...newSettings }))
  }

  const dismissPrompt = () => {
    updatePWASettings({ 
      promptDismissed: true,
      showInstallPrompt: false 
    })
  }

  const dismissPromptPermanently = () => {
    updatePWASettings({ 
      promptDismissed: true,
      promptDismissedPermanently: true,
      showInstallPrompt: false 
    })
  }

  const resetPWASettings = () => {
    setPwaSettings(defaultSettings)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value: PWASettingsContextType = {
    pwaSettings,
    updatePWASettings,
    dismissPrompt,
    dismissPromptPermanently,
    resetPWASettings
  }

  return (
    <PWASettingsContext.Provider value={value}>
      {children}
    </PWASettingsContext.Provider>
  )
}

export const usePWASettings = (): PWASettingsContextType => {
  const context = useContext(PWASettingsContext)
  if (context === undefined) {
    throw new Error('usePWASettings must be used within a PWASettingsProvider')
  }
  return context
}
