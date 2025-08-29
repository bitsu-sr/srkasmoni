import { supabase } from '../lib/supabase'
import { paymentService } from './paymentService'

export interface DashboardStats {
  totalExpected: number
  totalPaid: number
  totalReceived: number
  totalPending: number
  totalOverdue: number
  totalAmountDue: number
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
  async getDashboardData(): Promise<DashboardData> {
    try {
      // Fetch all data in parallel for maximum performance
      const [
        groupsData,
        paymentsData,
        paymentStats,
        overduePayments,
        recentPayments,
        recentMembers,
        recentGroups
      ] = await Promise.all([
        // Get groups with member info (limited to active groups)
        this.getGroupsWithMembers(),
        // Get payment information for all groups
        this.getPaymentsForGroups(),
        // Get payment statistics
        paymentService.getPaymentStats(),
        // Get overdue payments
        paymentService.getOverduePayments(),
        // Get recent payments (limited to 5)
        this.getRecentPaymentsOptimized(5),
        // Get recent members (limited to 3)
        this.getRecentMembersOptimized(3),
        // Get recent groups (limited to 3)
        this.getRecentGroupsOptimized(3)
      ])

      // Calculate dashboard stats
      const stats = this.calculateDashboardStats(groupsData, paymentStats, overduePayments)
      
      // Transform groups data
      const groups = this.transformDashboardGroups(groupsData, paymentStats, paymentsData)

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
            const receivedAmount = basicPayments.filter((p: any) => p.status === 'received').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
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
  async getPaymentsForGroups() {
    try {
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
  calculateDashboardStats(groupsData: any[], paymentStats: any, overduePayments: any): DashboardStats {
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

      const stats = {
        totalExpected,
        totalPaid,
        totalReceived,
        totalPending,
        totalOverdue,
        totalAmountDue,
        activeGroups: groupsData?.length || 0,
        totalMembers: uniqueMemberIds.size,
        activeMembers: uniqueMemberIds.size
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
        activeGroups: 0,
        totalMembers: 0,
        activeMembers: 0
      }
    }
  },

  // Transform groups data for dashboard
  transformDashboardGroups(groupsData: any[], _paymentStats: any, paymentsData: any[]): DashboardGroup[] {
    try {
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7)

      if (!groupsData || !Array.isArray(groupsData)) {
        return []
      }

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
