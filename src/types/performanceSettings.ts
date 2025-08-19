export interface PerformanceSettings {
  enableParallelCalls: boolean
  enableOptimizedQueries: boolean
  enableCaching: boolean
  paginationType: 'simple' | 'infinite' | 'true'
  pageSize: 10 | 25 | 50 | 100
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  enableParallelCalls: false,
  enableOptimizedQueries: false,
  enableCaching: false,
  paginationType: 'simple',
  pageSize: 25
}

export const PERFORMANCE_OPTIONS = [
  {
    key: 'enableParallelCalls',
    label: 'Phase 1: Parallel Database Calls',
    description: 'Load data from multiple tables simultaneously for faster loading'
  },
  {
    key: 'enableOptimizedQueries',
    label: 'Phase 2: Single Optimized Queries',
    description: 'Use advanced JOIN queries to reduce database round trips'
  },
  {
    key: 'enableCaching',
    label: 'Phase 3: Smart Caching',
    description: 'Cache frequently accessed data for instant loading'
  }
]

export const PAGINATION_OPTIONS = {
  type: [
    { value: 'simple', label: 'Simple Pagination' },
    { value: 'infinite', label: 'Infinite Scroll' },
    { value: 'true', label: 'True Infinite Scroll' }
  ],
  size: [
    { value: 10, label: '10 rows' },
    { value: 25, label: '25 rows' },
    { value: 50, label: '50 rows' },
    { value: 100, label: '100 rows' }
  ]
}
