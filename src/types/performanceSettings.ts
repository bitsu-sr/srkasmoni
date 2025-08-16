export interface PerformanceSettings {
  // Phase 1: Parallel Database Calls
  enableParallelCalls: boolean
  
  // Phase 2: Single Optimized Queries  
  enableOptimizedQueries: boolean
  
  // Phase 3: Caching Strategy
  enableCaching: boolean
  
  // Metadata
  lastUpdated: string
  version: string
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  // Default to current behavior (all disabled)
  enableParallelCalls: false,
  enableOptimizedQueries: false,
  enableCaching: false,
  
  // Metadata
  lastUpdated: new Date().toISOString(),
  version: '1.0.0'
}

export const PERFORMANCE_OPTIONS = [
  {
    key: 'enableParallelCalls' as keyof PerformanceSettings,
    label: 'Parallel Database Calls',
    description: 'Load multiple database queries simultaneously for faster page loading',
    phase: 'Phase 1',
    impact: '3-5x faster loading'
  },
  {
    key: 'enableOptimizedQueries' as keyof PerformanceSettings,
    label: 'Single Optimized Queries',
    description: 'Use advanced database JOINs to fetch all data in one query',
    phase: 'Phase 2', 
    impact: '10-30x faster loading'
  },
  {
    key: 'enableCaching' as keyof PerformanceSettings,
    label: 'Smart Caching',
    description: 'Cache frequently accessed data for instant loading after first visit',
    phase: 'Phase 3',
    impact: '50-100x faster loading'
  }
] as const
