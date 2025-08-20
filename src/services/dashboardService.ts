import { supabase } from '../lib/supabase'
import { paymentService } from './paymentService'

export interface DashboardStats {
  totalExpected: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
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
  // Get all dashboard data in a single optimized query
  async getDashboardData(): Promise<DashboardData> {
    try {
      // Single optimized query to get all groups with member and slot info
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(
            member_id,
            assigned_month_date,
            members!inner(
              first_name,
              last_name
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Get payment information for all groups to calculate slots correctly
      // The payments table has slot_id, so we need to join with payment_slots
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          group_id,
          member_id,
          slot_id,
          status
        `)
        .eq('status', 'received')

      if (paymentsError) throw paymentsError

      if (groupsError) throw groupsError

      // Get payment stats in parallel
      const [paymentStats, overduePayments, recentPayments, recentMembers, recentGroups] = await Promise.all([
        paymentService.getPaymentStats(),
        paymentService.getOverduePayments(),
        paymentService.getRecentPayments(5),
        this.getRecentMembersOptimized(3),
        this.getRecentGroupsOptimized(3)
      ])

      // Calculate dashboard stats
      const stats = this.calculateDashboardStats(groupsData, paymentStats, overduePayments)
      
      // Transform groups data
      const groups = this.transformDashboardGroups(groupsData, paymentStats, paymentsData)

      return {
        stats,
        groups,
        recentPayments,
        recentMembers,
        recentGroups
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      throw error
    }
  },

  // Calculate dashboard statistics
  calculateDashboardStats(groupsData: any[], paymentStats: any, overduePayments: any): DashboardStats {
    let totalExpected = 0
    const uniqueMemberIds = new Set()

    groupsData.forEach(group => {
      const startDate = group.start_date || group.startDate
      const endDate = group.end_date || group.endDate
      const monthlyAmount = group.monthly_amount || group.monthlyAmount
      
      if (startDate && endDate) {
        const duration = this.calculateDuration(startDate, endDate)
        totalExpected += (monthlyAmount * duration)
      }
      
      // Count unique members
      group.group_members?.forEach((member: any) => {
        uniqueMemberIds.add(member.member_id)
      })
    })

    const totalPaid = paymentStats.receivedAmount + paymentStats.pendingAmount + paymentStats.settledAmount
    const totalPending = paymentStats.pendingAmount

    return {
      totalExpected,
      totalPaid,
      totalPending,
      totalOverdue: overduePayments.amount,
      activeGroups: groupsData.length,
      totalMembers: uniqueMemberIds.size,
      activeMembers: uniqueMemberIds.size
    }
  },

  // Transform groups data for dashboard
  transformDashboardGroups(groupsData: any[], _paymentStats: any, paymentsData: any[]): DashboardGroup[] {
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7)

    return groupsData.map(group => {
      // Find next recipient for current month
      let nextRecipient = 'No recipient this month'
      const currentMonthMember = group.group_members?.find((member: any) => 
        member.assigned_month_date === currentMonth
      )
      
      if (currentMonthMember?.members) {
        nextRecipient = `${currentMonthMember.members.first_name} ${currentMonthMember.members.last_name}`
      }

      // Calculate slots info correctly using payment data
      const slotsTotal = group.group_members?.length || 0
      
      // Count slots that have received payments for this group
      let slotsPaid = 0
      if (paymentsData && group.group_members) {
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

  // Optimized recent members query
  async getRecentMembersOptimized(limit: number = 3): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      
      // Transform the data to match expected format
      return (data || []).map((member: any) => ({
        ...member,
        firstName: member.first_name,
        lastName: member.last_name,
        createdAt: member.created_at,
        updatedAt: member.updated_at
      }))
    } catch (error) {
      console.error('Error fetching recent members:', error)
      return []
    }
  },

  // Optimized recent groups query
  async getRecentGroupsOptimized(limit: number = 3): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      
      // Transform the data to match expected format
      return (data || []).map((group: any) => ({
        ...group,
        monthlyAmount: group.monthly_amount,
        createdAt: group.created_at,
        updatedAt: group.updated_at
      }))
    } catch (error) {
      console.error('Error fetching recent groups:', error)
      return []
    }
  }
}
