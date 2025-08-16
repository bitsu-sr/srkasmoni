import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { PerformanceSettings } from '../types/performanceSettings'
import { performanceSettingsService } from '../services/performanceSettingsService'

interface PerformanceSettingsContextType {
  settings: PerformanceSettings
  updateSetting: <K extends keyof PerformanceSettings>(
    key: K, 
    value: PerformanceSettings[K]
  ) => void
  resetToDefaults: () => void
  isFeatureEnabled: (feature: keyof PerformanceSettings) => boolean
  hasAnyFeaturesEnabled: () => boolean
}

const PerformanceSettingsContext = createContext<PerformanceSettingsContextType | undefined>(undefined)

interface PerformanceSettingsProviderProps {
  children: ReactNode
}

export const PerformanceSettingsProvider: React.FC<PerformanceSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PerformanceSettings>(() => 
    performanceSettingsService.getSettings()
  )

  // Update a specific setting
  const updateSetting = <K extends keyof PerformanceSettings>(
    key: K, 
    value: PerformanceSettings[K]
  ) => {
    performanceSettingsService.updateSetting(key, value)
    setSettings(prev => ({
      ...prev,
      [key]: value,
      lastUpdated: new Date().toISOString()
    }))
  }

  // Reset all settings to defaults
  const resetToDefaults = () => {
    performanceSettingsService.resetToDefaults()
    setSettings(performanceSettingsService.getSettings())
  }

  // Check if a specific feature is enabled
  const isFeatureEnabled = (feature: keyof PerformanceSettings): boolean => {
    return Boolean(settings[feature])
  }

  // Check if any features are enabled
  const hasAnyFeaturesEnabled = (): boolean => {
    return performanceSettingsService.hasAnyFeaturesEnabled()
  }

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = performanceSettingsService.getSettings()
    setSettings(storedSettings)
  }, [])

  const value: PerformanceSettingsContextType = {
    settings,
    updateSetting,
    resetToDefaults,
    isFeatureEnabled,
    hasAnyFeaturesEnabled
  }

  return (
    <PerformanceSettingsContext.Provider value={value}>
      {children}
    </PerformanceSettingsContext.Provider>
  )
}

// Custom hook to use performance settings
export const usePerformanceSettings = (): PerformanceSettingsContextType => {
  const context = useContext(PerformanceSettingsContext)
  if (context === undefined) {
    throw new Error('usePerformanceSettings must be used within a PerformanceSettingsProvider')
  }
  return context
}
