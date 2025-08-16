import { queryClient } from '../contexts/ReactQueryProvider'

export interface CacheConfig {
  // Cache key prefix for different data types
  keyPrefix: string
  // Time before data is considered stale (in milliseconds)
  staleTime: number
  // Time before inactive queries are garbage collected (in milliseconds)
  gcTime: number
  // Whether to enable background refetching
  backgroundRefetch: boolean
  // Whether to enable optimistic updates
  optimisticUpdates: boolean
}

export interface CacheStats {
  totalQueries: number
  cachedQueries: number
  cacheHitRate: number
  memoryUsage: number
  lastCleanup: Date
}

export const cachingService: {
  defaultConfigs: Record<string, CacheConfig>
  generateKey(type: string, params?: Record<string, any>): string[]
  prefetchData<T>(type: string, queryFn: () => Promise<T>, params?: Record<string, any>): Promise<void>
  getCachedData<T>(type: string, params?: Record<string, any>): T | undefined
  setCachedData<T>(type: string, data: T, params?: Record<string, any>): void
  invalidateCache(type: string, params?: Record<string, any>): void
  clearAllCache(): void
  getCacheStats(): CacheStats
  estimateMemoryUsage(): number
  cleanupCache(): void
  optimisticUpdate<T>(type: string, params: Record<string, any>, updateFn: (oldData: T | undefined) => T): void
  batchCacheOperations(operations: Array<() => void>): void
} = {
  // Default cache configurations for different data types
  defaultConfigs: {
    payments: {
      keyPrefix: 'payments',
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000,    // 5 minutes
      backgroundRefetch: true,
      optimisticUpdates: true,
    },
    members: {
      keyPrefix: 'members',
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 15 * 60 * 1000,    // 15 minutes
      backgroundRefetch: true,
      optimisticUpdates: false,
    },
    groups: {
      keyPrefix: 'groups',
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 20 * 60 * 1000,    // 20 minutes
      backgroundRefetch: true,
      optimisticUpdates: false,
    },
    slots: {
      keyPrefix: 'slots',
      staleTime: 1 * 60 * 1000,  // 1 minute
      gcTime: 3 * 60 * 1000,     // 3 minutes
      backgroundRefetch: true,
      optimisticUpdates: true,
    },
  },

  // Generate cache key for queries
  generateKey(type: keyof typeof cachingService.defaultConfigs, params?: Record<string, any>): string[] {
    const baseKey = [this.defaultConfigs[type].keyPrefix]
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          baseKey.push(`${key}:${value}`)
        }
      })
    }
    
    return baseKey
  },

  // Prefetch data for better UX
  async prefetchData<T>(
    type: keyof typeof cachingService.defaultConfigs,
    queryFn: () => Promise<T>,
    params?: Record<string, any>
  ): Promise<void> {
    const key = this.generateKey(type, params)
    const config = this.defaultConfigs[type]
    
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    })
  },

  // Get cached data if available
  getCachedData<T>(
    type: keyof typeof cachingService.defaultConfigs,
    params?: Record<string, any>
  ): T | undefined {
    const key = this.generateKey(type, params)
    return queryClient.getQueryData(key)
  },

  // Set data in cache
  setCachedData<T>(
    type: keyof typeof cachingService.defaultConfigs,
    data: T,
    params?: Record<string, any>
  ): void {
    const key = this.generateKey(type, params)
    queryClient.setQueryData(key, data)
  },

  // Invalidate cache for specific type
  invalidateCache(type: keyof typeof cachingService.defaultConfigs, params?: Record<string, any>): void {
    const key = this.generateKey(type, params)
    queryClient.invalidateQueries({ queryKey: key })
  },

  // Clear all cache
  clearAllCache(): void {
    queryClient.clear()
  },

  // Get cache statistics
  getCacheStats(): CacheStats {
    const queries = queryClient.getQueryCache().getAll()
    const cachedQueries = queries.filter((query: any) => query.state.data !== undefined)
    
    return {
      totalQueries: queries.length,
      cachedQueries: cachedQueries.length,
      cacheHitRate: queries.length > 0 ? (cachedQueries.length / queries.length) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
      lastCleanup: new Date(),
    }
  },

  // Estimate memory usage of cache
  estimateMemoryUsage(): number {
    try {
      const queries = queryClient.getQueryCache().getAll()
      let totalSize = 0
      
      queries.forEach((query: any) => {
        if (query.state.data) {
          // Rough estimation: JSON stringify size
          const dataSize = JSON.stringify(query.state.data).length
          totalSize += dataSize
        }
      })
      
      // Convert to KB
      return Math.round(totalSize / 1024)
    } catch {
      return 0
    }
  },

  // Clean up old cache entries
  cleanupCache(): void {
    const queries = queryClient.getQueryCache().getAll()
    const now = Date.now()
    
    queries.forEach((query: any) => {
      const lastUpdated = query.state.dataUpdatedAt
      const config = this.defaultConfigs[query.queryKey[0] as string]
      
      if (config && (now - lastUpdated) > config.gcTime) {
        queryClient.removeQueries({ queryKey: query.queryKey })
      }
    })
  },

  // Optimistic update helper
  optimisticUpdate<T>(
    type: keyof typeof cachingService.defaultConfigs,
    params: Record<string, any>,
    updateFn: (oldData: T | undefined) => T
  ): void {
    const key = this.generateKey(type, params)
    
    queryClient.setQueryData(key, (oldData: T | undefined) => {
      return updateFn(oldData)
    })
  },

  // Batch cache operations
  batchCacheOperations(operations: Array<() => void>): void {
    // Execute operations sequentially since batch is not available in this version
    operations.forEach(operation => operation())
  },
}
