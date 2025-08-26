import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePerformanceSettings } from '../contexts/PerformanceSettingsContext'
import { cachingService } from '../services/cachingService'
import { paymentService } from '../services/paymentService'
import { memberService } from '../services/memberService'
import { groupService } from '../services/groupService'
import { paymentSlotService } from '../services/paymentSlotService'
import { optimizedQueryService } from '../services/optimizedQueryService'
import { dashboardService } from '../services/dashboardService'

// Custom hook for cached payments data
export const useCachedPayments = (filters?: any) => {
  const { isFeatureEnabled } = usePerformanceSettings()
  
  const queryKey = cachingService.generateKey('payments', filters)
  
  return useQuery({
    queryKey,
    queryFn: () => paymentService.getPayments(filters),
    staleTime: cachingService.defaultConfigs.payments.staleTime,
    gcTime: cachingService.defaultConfigs.payments.gcTime,
    enabled: isFeatureEnabled('enableCaching'),
  })
}

// Custom hook for cached members data
export const useCachedMembers = (filters?: any) => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = cachingService.generateKey('members', filters)
  
  return useQuery({
    queryKey,
    queryFn: () => memberService.getAllMembers(),
    staleTime: cachingService.defaultConfigs.members.staleTime,
    gcTime: cachingService.defaultConfigs.members.gcTime,
    enabled: isFeatureEnabled('enableCaching'),
  })
}

// Custom hook for cached groups data
export const useCachedGroups = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = cachingService.generateKey('groups')
  
  return useQuery({
    queryKey,
    queryFn: () => groupService.getAllGroups(),
    staleTime: cachingService.defaultConfigs.groups.staleTime,
    gcTime: cachingService.defaultConfigs.groups.gcTime,
    enabled: isFeatureEnabled('enableCaching'),
  })
}

// Custom hook for cached payment slots data
export const useCachedPaymentSlots = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = cachingService.generateKey('slots')
  
  return useQuery({
    queryKey,
    queryFn: () => paymentSlotService.getAllSlots(),
    staleTime: cachingService.defaultConfigs.slots.staleTime,
    gcTime: cachingService.defaultConfigs.slots.gcTime,
    enabled: isFeatureEnabled('enableCaching'),
  })
}

// Custom hook for cached payment statistics
export const useCachedPaymentStats = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = ['paymentStats']
  
  return useQuery({
    queryKey,
    queryFn: () => paymentService.getPaymentStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 2 * 60 * 1000,    // 2 minutes
    enabled: isFeatureEnabled('enableCaching'),
  })
}

// Custom hook for cached optimized slots (Phase 2)
export const useCachedOptimizedSlots = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = ['optimizedSlots']
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedQueryService.getAllSlotsOptimized(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: isFeatureEnabled('enableCaching') && isFeatureEnabled('enableOptimizedQueries'),
  })
}

// Custom hook for cached optimized groups (Phase 2)
export const useCachedOptimizedGroups = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = ['optimizedGroups']
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedQueryService.getAllGroupsOptimized(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000,    // 3 minutes
    enabled: isFeatureEnabled('enableCaching') && isFeatureEnabled('enableOptimizedQueries'),
  })
}

// Custom hook for cached optimized payment stats (Phase 2)
export const useCachedOptimizedPaymentStats = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const queryKey = ['optimizedPaymentStats']
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedQueryService.getPaymentStatsOptimized(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: isFeatureEnabled('enableCaching') && isFeatureEnabled('enableOptimizedQueries'),
  })
}

// Custom hook for cached dashboard data
export const useCachedDashboard = () => {
  const queryKey = ['dashboard']
  
  return useQuery({
    queryKey,
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: true, // Temporarily always enabled to debug the issue
  })
}

// Custom hook for payment mutations with cache invalidation
export const usePaymentMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (paymentData: any) => paymentService.createPayment(paymentData),
    onSuccess: () => {
      // Invalidate related cache entries
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['paymentStats'] })
      queryClient.invalidateQueries({ queryKey: ['optimizedPaymentStats'] })
    },
  })
}

// Custom hook for cache management
export const useCacheManagement = () => {
  const queryClient = useQueryClient()
  
  return {
    clearCache: () => {
      queryClient.clear()
  
    },
    getCacheStats: () => cachingService.getCacheStats(),
    cleanupCache: () => cachingService.cleanupCache(),
    prefetchData: (type: string, queryFn: () => Promise<any>, params?: any) => 
      cachingService.prefetchData(type, queryFn, params),
  }
}
