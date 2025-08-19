import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { PerformanceSettings } from '../types/performanceSettings'
import { 
  getPerformanceSettings, 
  updatePerformanceSetting, 
  resetPerformanceSettings 
} from '../services/performanceSettingsService'

interface PerformanceSettingsContextType {
  settings: PerformanceSettings
  updateSetting: <K extends keyof PerformanceSettings>(
    key: K, 
    value: PerformanceSettings[K]
  ) => void
  resetToDefaults: () => void
  isFeatureEnabled: (feature: keyof PerformanceSettings) => boolean
}

const PerformanceSettingsContext = createContext<PerformanceSettingsContextType | undefined>(undefined)

export const usePerformanceSettings = (): PerformanceSettingsContextType => {
  const context = useContext(PerformanceSettingsContext)
  if (!context) {
    throw new Error('usePerformanceSettings must be used within a PerformanceSettingsProvider')
  }
  return context
}

interface PerformanceSettingsProviderProps {
  children: ReactNode
}

export const PerformanceSettingsProvider: React.FC<PerformanceSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PerformanceSettings>(() => getPerformanceSettings())

  const updateSetting = <K extends keyof PerformanceSettings>(
    key: K, 
    value: PerformanceSettings[K]
  ): void => {
    const updated = updatePerformanceSetting(key, value)
    setSettings(updated)
  }

  const resetToDefaults = (): void => {
    const defaultSettings = resetPerformanceSettings()
    setSettings(defaultSettings)
  }

  const isFeatureEnabled = (feature: keyof PerformanceSettings): boolean => {
    return Boolean(settings[feature])
  }

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = getPerformanceSettings()
    setSettings(storedSettings)
  }, [])

  const value: PerformanceSettingsContextType = {
    settings,
    updateSetting,
    resetToDefaults,
    isFeatureEnabled
  }

  return (
    <PerformanceSettingsContext.Provider value={value}>
      {children}
    </PerformanceSettingsContext.Provider>
  )
}
