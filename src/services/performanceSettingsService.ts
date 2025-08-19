import { PerformanceSettings, DEFAULT_PERFORMANCE_SETTINGS } from '../types/performanceSettings'

const STORAGE_KEY = 'performanceSettings'

export const savePerformanceSettings = (settings: PerformanceSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save performance settings:', error)
  }
}

export const getPerformanceSettings = (): PerformanceSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure all required fields exist and are properly typed
      return {
        enableParallelCalls: Boolean(parsed.enableParallelCalls),
        enableOptimizedQueries: Boolean(parsed.enableOptimizedQueries),
        enableCaching: Boolean(parsed.enableCaching),
        paginationType: parsed.paginationType || 'simple',
        pageSize: parsed.pageSize || 25
      }
    }
  } catch (error) {
    console.error('Failed to load performance settings:', error)
  }
  
  return { ...DEFAULT_PERFORMANCE_SETTINGS }
}

export const updatePerformanceSetting = <K extends keyof PerformanceSettings>(
  key: K,
  value: PerformanceSettings[K]
): PerformanceSettings => {
  const current = getPerformanceSettings()
  const updated = { ...current, [key]: value }
  savePerformanceSettings(updated)
  return updated
}

export const resetPerformanceSettings = (): PerformanceSettings => {
  const defaultSettings = { ...DEFAULT_PERFORMANCE_SETTINGS }
  savePerformanceSettings(defaultSettings)
  return defaultSettings
}
