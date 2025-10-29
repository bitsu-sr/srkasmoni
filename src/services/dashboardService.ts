import { supabase } from '../lib/supabase'
import { paymentService } from './paymentService'
import { memberInactivityService } from './memberInactivityService'

export interface DashboardStats {
  totalExpected: number
  totalPaid: number
  totalReceived: number
  totalPending: number
  totalOverdue: number
  totalAmountDue: number
  totalPayouts: number
  activeGroups: number
  totalMembers: number
  activeMembers: number
}

export interface DashboardGroup {
  id: number
  name: string
  description: string
  monthlyAmount: number
  startDate: string
  endDate: string
  nextRecipient: string
  slotsPaid: number
  slotsTotal: number
  created_at: string
}

export interface DashboardData {
  stats: DashboardStats
  groups: DashboardGroup[]
  recentPayments: any[]
  recentMembers: any[]
  recentGroups: any[]
}

export const dashboardService = {
  // Test method to check database connectivity
  async testDatabaseConnection() {
    try {
      // Test 1: Simple groups query
      const { data: groupsTest } = await supabase
        .from('groups')
        .select('id, name')
        .limit(1)
      
      // Test 2: Simple members query
      const { data: membersTest } = await supabase
        .from('members')
        .select('id, first_name')
        .limit(1)
      
      // Test 3: Simple payments query
      const { data: paymentsTest } = await supabase
        .from('payments')
        .select('id, amount')
        .limit(1)
      
      // Test 4: Check if groups table has any data at all
      const { count: groupsCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
      
      return { groupsTest, membersTest, paymentsTest, groupsCount }
    } catch (error) {
      console.error('Database connection test failed:', error)
      return null
    }
  },

  // Get all dashboard data in a single optimized query with parallel fetching
  async getDashboardData(selectedMonth?: string): Promise<DashboardData> {
    try {
      // First, mark inactive members (run in background, don't wait for it)
      memberInactivityService.markInactiveMembers().catch(error => {
        console.warn('Error marking inactive members:', error)
      })

      // First get groups data to determine active group IDs
      const groupsData = await this.getGroupsWithMembers()
      
      // Filter groups to get active ones and extract their IDs
      const currentMonth = selectedMonth || new Date().toISOString().split('T')[0].substring(0, 7)
      const activeGroups = groupsData.filter((group: any) => {
        // Check if group has started (start date check)
        if (group.start_date) {
          const startMonth = group.start_date.substring(0, 7) // Extract YYYY-MM format
          if (currentMonth < startMonth) {
            return false // Group hasn't started yet
          }
        }
        
        // Check if group has ended (end date check)
        if (group.end_date || group.endDate) {
          const endDate = group.end_date || group.endDate
          const endMonth = endDate.substring(0, 7) // Extract YYYY-MM format
          
          // Group is active if selected month is before or equal to end month
          return currentMonth <= endMonth
        }
        
        // Groups without end date are considered active (if they've started)
        return true
      })
      
      const activeGroupIds = activeGroups.map((group: any) => group.id)

      // Fetch remaining data in parallel for maximum performance
      const [
        paymentsData,
        paymentStats,
        overduePayments,
        totalPayouts,
        recentPayments,
        recentMembers,
        recentGroups
      ] = await Promise.all([
        // Get payment information for all groups
        this.getPaymentsForGroups(selectedMonth),
        // Get payment statistics for selected month (filtered by active groups)
        this.getCurrentMonthPaymentStats(selectedMonth, activeGroupIds),
        // Get overdue payments for selected month (filtered by active groups)
        this.getCurrentMonthOverduePayments(selectedMonth, activeGroupIds),
        // Get total payouts for selected month
        this.getTotalPayouts(selectedMonth),
        // Get recent payments (limited to 5)
        this.getRecentPaymentsOptimized(5),
        // Get recent members (limited to 3)
        this.getRecentMembersOptimized(3),
        // Get recent groups (limited to 3)
        this.getRecentGroupsOptimized(3)
      ])

      // Calculate dashboard stats (using only active groups)
      const stats = await this.calculateDashboardStats(activeGroups, paymentStats, overduePayments, selectedMonth, totalPayouts)
      
      // Transform groups data (using only active groups)
      const groups = this.transformDashboardGroups(activeGroups, paymentStats, paymentsData, selectedMonth)

      // Create the result object first
      const result = {
        stats,
        groups,
        recentPayments,
        recentMembers,
        recentGroups
      }

      // If we still have no meaningful data, try to create basic stats from payments
      if ((!groups || groups.length === 0) && (!stats || stats.activeGroups === 0)) {
        // Try to get basic payment stats
        try {
          const { data: basicPayments, error: basicError } = await supabase
            .from('payments')
            .select('amount, status, group_id, member_id')
            .limit(100)
          
          if (!basicError && basicPayments && basicPayments.length > 0) {
            // Calculate basic stats from payments
            const totalAmount = basicPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
            // Include both 'received' and 'settled' statuses as paid amounts
            const receivedAmount = basicPayments.filter((p: any) => ['received', 'settled'].includes(p.status)).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
            const pendingAmount = basicPayments.filter((p: any) => p.status === 'pending').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
            
            // Get unique groups and members from payments
            const uniqueGroups = new Set(basicPayments.filter((p: any) => p.group_id).map((p: any) => p.group_id))
            const uniqueMembers = new Set(basicPayments.filter((p: any) => p.member_id).map((p: any) => p.member_id))
            
            result.stats = {
              totalExpected: totalAmount,
              totalPaid: totalAmount,
              totalReceived: receivedAmount,
              totalPending: pendingAmount,
              totalOverdue: 0,
              totalAmountDue: Math.max(0, totalAmount - totalAmount),
              totalPayouts: 0,
              activeGroups: uniqueGroups.size,
              totalMembers: uniqueMembers.size,
              activeMembers: uniqueMembers.size
            }
          }
        } catch (error) {
          console.error('❌ Error creating basic stats from payments:', error)
        }
      }

      // Always ensure we have valid data structure, even if empty
      if (!result.stats) {
        result.stats = {
          totalExpected: 0,
          totalPaid: 0,
          totalReceived: 0,
          totalPending: 0,
          totalOverdue: 0,
          totalAmountDue: 0,
          totalPayouts: 0,
          activeGroups: 0,
          totalMembers: 0,
          activeMembers: 0
        }
      }

      if (!result.groups) {
        result.groups = []
      }

      if (!result.recentPayments) {
        result.recentPayments = []
      }

      if (!result.recentMembers) {
        result.recentMembers = []
      }

      if (!result.recentGroups) {
        result.recentGroups = []
      }

      return result
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      
      // Return fallback data structure on error
      return {
        stats: {
          totalExpected: 0,
          totalPaid: 0,
          totalReceived: 0,
          totalPending: 0,
          totalOverdue: 0,
          totalAmountDue: 0,
          totalPayouts: 0,
          activeGroups: 0,
          totalMembers: 0,
          activeMembers: 0
        },
        groups: [],
        recentPayments: [],
        recentMembers: [],
        recentGroups: []
      }
    }
  },

  // Helper: Get payment stats for the selected month using payments table payment_month
  async getCurrentMonthPaymentStats(selectedMonth?: string, activeGroupIds?: number[]) {
    const currentMonth = selectedMonth || new Date().toISOString().substring(0, 7)
    // Reuse getPayments with month filter and compute client-side like Payments page
    const payments = await paymentService.getPayments({ paymentMonth: currentMonth })
    
    // Filter payments to only include those from active groups
    const filteredPayments = activeGroupIds 
      ? payments.filter(payment => activeGroupIds.includes(payment.groupId))
      : payments
    
    return {
      totalPayments: filteredPayments.length,
      totalAmount: filteredPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      receivedAmount: filteredPayments.filter((p: any) => p.status === 'received').reduce((s: number, p: any) => s + (p.amount || 0), 0),
      pendingAmount: filteredPayments.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + (p.amount || 0), 0),
      notPaidAmount: filteredPayments.filter((p: any) => p.status === 'not_paid').reduce((s: number, p: any) => s + (p.amount || 0), 0),
      settledAmount: filteredPayments.filter((p: any) => p.status === 'settled').reduce((s: number, p: any) => s + (p.amount || 0), 0)
    }
  },

  // Helper: Get overdue payments only for the selected month
  async getCurrentMonthOverduePayments(selectedMonth?: string, activeGroupIds?: number[]) {
    const currentMonth = selectedMonth || new Date().toISOString().substring(0, 7)
    const overduePayments = await paymentService.getOverduePaymentsForMonth(currentMonth)
    
    // Filter overdue payments to only include those from active groups
    if (activeGroupIds && overduePayments) {
      // Since getOverduePaymentsForMonth returns { count, amount }, we need to recalculate
      // for active groups only. For now, return the original data.
      // TODO: Implement proper filtering for overdue payments by active groups
      return overduePayments
    }
    
    return overduePayments
  },

  // Get total payouts for a specific month using the same logic as payouts page
  async getTotalPayouts(selectedMonth?: string): Promise<number> {
    try {
      const targetMonth = selectedMonth || new Date().toISOString().split('T')[0].substring(0, 7)
      
      // Get all payouts for the selected month with all necessary fields
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select(`
          calculated_total_amount,
          monthly_amount,
          duration,
          last_slot,
          administration_fee,
          additional_cost,
          settled_deduction_enabled,
          member_id
        `)
        .eq('payout_month', targetMonth)

      if (payoutsError) {
        console.error('Error fetching total payouts:', payoutsError)
        return 0
      }

      if (!payoutsData || payoutsData.length === 0) {
        return 0
      }

      // Get all settled payments for members in this month's payouts to calculate settled deduction
      const memberIds = payoutsData.map((p: any) => p.member_id)
      const { data: settledPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('member_id, amount')
        .in('member_id', memberIds)
        .eq('status', 'settled')

      if (paymentsError) {
        console.warn('Error fetching settled payments:', paymentsError)
      }

      // Create a map of settled amounts by member ID
      const settledAmountsByMember = new Map<number, number>()
      if (settledPayments) {
        settledPayments.forEach((payment: any) => {
          const currentAmount = settledAmountsByMember.get(payment.member_id) || 0
          settledAmountsByMember.set(payment.member_id, currentAmount + payment.amount)
        })
      }

      // Calculate total using the same logic as payouts page
      const totalPayouts = payoutsData.reduce((sum: number, payout: any) => {
        // Use stored calculated amount if available
        if (payout.calculated_total_amount && payout.calculated_total_amount > 0) {
          return sum + parseFloat(payout.calculated_total_amount)
        }
        
        // Fallback calculation for payouts without stored calculated amount
        // This matches the calculateToReceiveAmount logic in Payouts.tsx
        const baseAmount = parseFloat(payout.monthly_amount) * payout.duration
        
        const lastSlotDeduction = payout.last_slot ? 0 : parseFloat(payout.monthly_amount)
        const adminFeeDeduction = payout.administration_fee ? 0 : 200
        
        // Calculate settled deduction: only apply if enabled (default is true)
        const settledDeductionEnabled = payout.settled_deduction_enabled ?? true
        const settledDeduction = settledDeductionEnabled 
          ? (settledAmountsByMember.get(payout.member_id) || 0)
          : 0
        
        const additionalCostAmount = parseFloat(payout.additional_cost || 0)
        
        // Calculate sub-total after main deductions
        const subTotal = baseAmount - settledDeduction - lastSlotDeduction - adminFeeDeduction
        
        // Subtract additional cost from sub-total
        const calculatedAmount = subTotal - additionalCostAmount
        
        return sum + calculatedAmount
      }, 0)

      return totalPayouts
    } catch (error) {
      console.error('Error in getTotalPayouts:', error)
      return 0
    }
  },

  // Optimized method to get groups with members
  async getGroupsWithMembers() {
    try {
      // First, try a simple groups query to see if the table has data
      const { data: simpleGroups, error: simpleError } = await supabase
        .from('groups')
        .select('id, name, description, monthly_amount, start_date, end_date, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (simpleError) {
        console.error('❌ Error in simple groups query:', simpleError)
        return []
      }
      
      // If we have groups, try to get member info for each one
      if (simpleGroups && simpleGroups.length > 0) {
        const groupsWithMembers = await Promise.all(
          simpleGroups.map(async (group: any) => {
            try {
              const { data: members, error: membersError } = await supabase
                .from('group_members')
                .select(`
                  member_id,
                  assigned_month_date,
                  members(
                    first_name,
                    last_name
                  )
                `)
                .eq('group_id', group.id)
              
              if (membersError) {
                console.error(`❌ Error fetching members for group ${group.id}:`, membersError)
                return { ...group, group_members: [] }
              }
              
              return { ...group, group_members: members || [] }
            } catch (error) {
              console.error(`❌ Error processing group ${group.id}:`, error)
              return { ...group, group_members: [] }
            }
          })
        )
        
        return groupsWithMembers
      }
      
      return simpleGroups || []
    } catch (error) {
      console.error('❌ Error in getGroupsWithMembers:', error)
      return []
    }
  },

  // Optimized method to get payments for groups
  async getPaymentsForGroups(selectedMonth?: string) {
    try {
      const currentMonth = selectedMonth || new Date().toISOString().slice(0, 7)
      const { data, error } = await supabase
        .from('payments')
        .select(`
          group_id,
          member_id,
          slot_id,
          status,
          amount
        `)
        .in('status', ['received', 'settled'])
        .eq('payment_month', currentMonth)
        .limit(1000) // Reasonable limit for dashboard

      if (error) {
        console.error('❌ Error fetching payments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Error in getPaymentsForGroups:', error)
      return []
    }
  },

  // Calculate dashboard statistics
  async calculateDashboardStats(groupsData: any[], paymentStats: any, overduePayments: any, selectedMonth?: string, totalPayouts?: number): Promise<DashboardStats> {
    try {
      let totalExpected = 0
      const uniqueMemberIds = new Set()

      if (groupsData && Array.isArray(groupsData)) {
        groupsData.forEach(group => {
          const startDate = group.start_date || group.startDate
          const endDate = group.end_date || group.endDate
          const monthlyAmount = group.monthly_amount || group.monthlyAmount
          
          if (startDate && endDate && monthlyAmount) {
            const duration = this.calculateDuration(startDate, endDate)
            totalExpected += (monthlyAmount * duration)
          }
          
          // Count unique members
          if (group.group_members && Array.isArray(group.group_members)) {
            group.group_members.forEach((member: any) => {
              if (member.member_id) {
                uniqueMemberIds.add(member.member_id)
              }
            })
          }
        })
      }

      // Safely access payment stats with fallbacks
      const totalPaid = (paymentStats?.receivedAmount || 0) + (paymentStats?.pendingAmount || 0) + (paymentStats?.settledAmount || 0)
      const totalReceived = paymentStats?.receivedAmount || 0
      const totalPending = paymentStats?.pendingAmount || 0
      const totalOverdue = overduePayments?.amount || 0
      
      // Calculate total amount due using the same logic as PaymentsDue page
      const totalAmountDue = Math.max(0, totalExpected - totalPaid)

      // Get member counts using month-based logic
      const [totalMembers, activeMembers] = await Promise.all([
        memberInactivityService.getTotalMembersCount(),
        this.getActiveMembersCountForMonth(selectedMonth)
      ])

      const stats = {
        totalExpected,
        totalPaid,
        totalReceived,
        totalPending,
        totalOverdue,
        totalAmountDue,
        totalPayouts: totalPayouts || 0,
        activeGroups: groupsData?.length || 0,
        totalMembers,
        activeMembers
      }

      return stats
    } catch (error) {
      console.error('Error calculating dashboard stats:', error)
      return {
        totalExpected: 0,
        totalPaid: 0,
        totalReceived: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalAmountDue: 0,
        totalPayouts: 0,
        activeGroups: 0,
        totalMembers: 0,
        activeMembers: 0
      }
    }
  },

  // Get active members count for a specific month
  async getActiveMembersCountForMonth(selectedMonth?: string): Promise<number> {
    try {
      const currentMonth = selectedMonth || new Date().toISOString().split('T')[0].substring(0, 7)
      
      // First, get all groups to determine which ones are active for the selected month
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, start_date, end_date')
      
      if (groupsError) {
        console.error('Error fetching groups:', groupsError)
        return 0
      }
      
      // Determine which groups are active for the selected month
      const activeGroupIds = new Set<number>()
      groupsData.forEach((group: any) => {
        let isActive = true
        
        // Check if group has started
        if (group.start_date) {
          const startMonth = group.start_date.substring(0, 7)
          if (currentMonth < startMonth) {
            isActive = false
          }
        }
        
        // Check if group has ended
        if (isActive && group.end_date) {
          const endMonth = group.end_date.substring(0, 7)
          if (currentMonth > endMonth) {
            isActive = false
          }
        }
        
        if (isActive) {
          activeGroupIds.add(group.id)
        }
      })
      
      if (activeGroupIds.size === 0) {
        return 0
      }
      
      // Get unique member IDs who are part of active groups using a single query
      const { data: activeMemberData, error: membersError } = await supabase
        .from('group_members')
        .select('member_id')
        .in('group_id', Array.from(activeGroupIds))
      
      if (membersError) {
        console.error('Error fetching active members:', membersError)
        return 0
      }
      
      if (!activeMemberData || activeMemberData.length === 0) {
        return 0
      }
      
      // Count unique members (remove duplicates)
      const uniqueMemberIds = new Set(activeMemberData.map((item: any) => item.member_id))
      return uniqueMemberIds.size
    } catch (error) {
      console.error('Error getting active members count for month:', error)
      return 0
    }
  },

  // Transform groups data for dashboard
  transformDashboardGroups(groupsData: any[], _paymentStats: any, paymentsData: any[], selectedMonth?: string): DashboardGroup[] {
    try {
      const currentMonth = selectedMonth || new Date().toISOString().split('T')[0].substring(0, 7)

      if (!groupsData || !Array.isArray(groupsData)) {
        return []
      }

      // groupsData already contains only active groups, so no need to filter again
      const transformedGroups = groupsData.map(group => {
        // Find next recipient for current month
        let nextRecipient = 'No recipient this month'
        if (group.group_members && Array.isArray(group.group_members)) {
          const currentMonthMember = group.group_members.find((member: any) => 
            member.assigned_month_date === currentMonth
          )
          
          if (currentMonthMember?.members) {
            nextRecipient = `${currentMonthMember.members.first_name} ${currentMonthMember.members.last_name}`
          }
        }

        // Calculate slots info correctly using payment data
        const slotsTotal = group.group_members?.length || 0
        
        // Count slots that have received payments for this group
        let slotsPaid = 0
        if (paymentsData && Array.isArray(paymentsData) && group.group_members) {
          const groupPayments = paymentsData.filter(payment => payment.group_id === group.id)
          
          // Count unique slot payments using slot_id
          const paidSlots = new Set()
          
          groupPayments.forEach(payment => {
            if (payment.slot_id) {
              const slotKey = `${payment.group_id}-${payment.member_id}-${payment.slot_id}`
              paidSlots.add(slotKey)
            }
          })
          
          slotsPaid = paidSlots.size
        }

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          monthlyAmount: group.monthly_amount || group.monthlyAmount,
          startDate: group.start_date || group.startDate,
          endDate: group.end_date || group.endDate,
          nextRecipient,
          slotsPaid,
          slotsTotal,
          created_at: group.created_at
        }
      })

      return transformedGroups
    } catch (error) {
      console.error('Error transforming dashboard groups:', error)
      return []
    }
  },

  // Helper function to calculate duration
  calculateDuration(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0
    
    const [startYear, startMonth] = startDate.split('-').map(Number)
    const [endYear, endMonth] = endDate.split('-').map(Number)
    
    if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
      return 0
    }
    
    return (endYear - startYear) * 12 + (endMonth - startMonth) + 1
  },

  // Optimized method to get recent payments
  async getRecentPaymentsOptimized(limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          payment_date,
          created_at,
          member_id,
          group_id,
          members!inner(
            first_name,
            last_name
          ),
          groups!inner(
            name
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent payments:', error)
        return []
      }

      return (data || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        payment_date: payment.payment_date,
        created_at: payment.created_at,
        member_name: payment.members ? `${payment.members.first_name} ${payment.members.last_name}` : 'Unknown Member',
        group_name: payment.groups?.name || 'Unknown Group'
      }))
    } catch (error) {
      console.error('Error in getRecentPaymentsOptimized:', error)
      return []
    }
  },

  // Optimized method to get recent members
  async getRecentMembersOptimized(limit: number = 3) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent members:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentMembersOptimized:', error)
      return []
    }
  },

  // Optimized method to get recent groups
  async getRecentGroupsOptimized(limit: number = 3) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          monthly_amount,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent groups:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentGroupsOptimized:', error)
      return []
    }
  }
}
