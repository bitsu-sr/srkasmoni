import { 
  PerformanceSettings, 
  DEFAULT_PERFORMANCE_SETTINGS 
} from '../types/performanceSettings'

const STORAGE_KEY = 'srkasmoni_performance_settings'

export const performanceSettingsService = {
  // Get current performance settings from localStorage
  getSettings(): PerformanceSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return DEFAULT_PERFORMANCE_SETTINGS
      }
      
      const parsed = JSON.parse(stored) as Partial<PerformanceSettings>
      
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_PERFORMANCE_SETTINGS,
        ...parsed,
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      }
    } catch (error) {
      console.error('Error loading performance settings:', error)
      return DEFAULT_PERFORMANCE_SETTINGS
    }
  },

  // Save performance settings to localStorage
  saveSettings(settings: Partial<PerformanceSettings>): void {
    try {
      const current = this.getSettings()
      const updated = {
        ...current,
        ...settings,
        lastUpdated: new Date().toISOString()
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      console.log('Performance settings saved:', updated)
    } catch (error) {
      console.error('Error saving performance settings:', error)
    }
  },

  // Update a specific setting
  updateSetting<K extends keyof PerformanceSettings>(
    key: K, 
    value: PerformanceSettings[K]
  ): void {
    this.saveSettings({ [key]: value })
  },

  // Reset all settings to defaults
  resetToDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('Performance settings reset to defaults')
    } catch (error) {
      console.error('Error resetting performance settings:', error)
    }
  },

  // Check if a specific performance feature is enabled
  isFeatureEnabled(feature: keyof PerformanceSettings): boolean {
    const settings = this.getSettings()
    return Boolean(settings[feature])
  },

  // Get all enabled features
  getEnabledFeatures(): string[] {
    const settings = this.getSettings()
    return Object.entries(settings)
      .filter(([key, value]) => 
        key !== 'lastUpdated' && 
        key !== 'version' && 
        value === true
      )
      .map(([key]) => key)
  },

  // Check if any performance features are enabled
  hasAnyFeaturesEnabled(): boolean {
    return this.getEnabledFeatures().length > 0
  }
}
