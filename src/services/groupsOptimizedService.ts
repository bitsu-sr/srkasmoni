import { supabase } from '../lib/supabase'

export interface GroupWithDetails {
  id: number
  name: string
  description: string
  monthlyAmount: number
  startDate: string
  endDate: string
  maxMembers: number
  duration: number
  paymentDeadlineDay: number
  lateFinePercentage: number
  lateFineFixedAmount: number
  created_at: string
  updated_at: string
  members: GroupMember[]
  slotsInfo: {
    paid: number
    total: number
  }
}

export interface GroupMember {
  id: number
  memberId: number
  groupId: number
  assignedMonthDate: string
  member: {
    id: number
    firstName: string
    lastName: string
    phone: string
    email: string
  }
}

export const groupsOptimizedService = {
  // Get all groups with members and slot information in a single optimized query
  async getAllGroupsWithDetails(): Promise<GroupWithDetails[]> {
    try {
      // Single optimized query to get all groups with member and slot info
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(
            id,
            member_id,
            group_id,
            assigned_month_date,
            members!inner(
              id,
              first_name,
              last_name,
              phone,
              email
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      if (!groupsData || groupsData.length === 0) return []

      // Get payment information to calculate slots correctly
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

      // Transform the data
      const groupsWithDetails: GroupWithDetails[] = groupsData.map((group: any) => {
        const members: GroupMember[] = (group.group_members || []).map((member: any) => ({
          id: member.id,
          memberId: member.member_id,
          groupId: member.group_id,
          assignedMonthDate: member.assigned_month_date,
          member: {
            id: member.members.id,
            firstName: member.members.first_name,
            lastName: member.members.last_name,
            phone: member.members.phone,
            email: member.members.email
          }
        }))

        // Calculate slots info correctly using payment data
        const slotsTotal = members.length
        
        // Count slots that have received payments for this group
        let slotsPaid = 0
        if (paymentsData && members.length > 0) {
          const groupPayments = paymentsData.filter((payment: any) => payment.group_id === group.id)
          
          // Count unique slot payments using slot_id
          const paidSlots = new Set()
          
          groupPayments.forEach((payment: any) => {
            if (payment.slot_id) {
              const slotKey = `${payment.group_id}-${payment.member_id}-${payment.slot_id}`
              paidSlots.add(slotKey)
            }
          })
          
          slotsPaid = paidSlots.size
        }

        // Calculate duration
        const startDate = group.start_date || group.startDate
        const endDate = group.end_date || group.endDate
        const duration = this.calculateDuration(startDate, endDate)

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          monthlyAmount: group.monthly_amount || group.monthlyAmount,
          startDate: group.start_date || group.startDate,
          endDate: group.end_date || group.endDate,
          maxMembers: group.max_members || group.maxMembers || 0,
          duration: duration,
          paymentDeadlineDay: group.payment_deadline_day || group.paymentDeadlineDay || 1,
          lateFinePercentage: group.late_fine_percentage || group.lateFinePercentage || 0,
          lateFineFixedAmount: group.late_fine_fixed_amount || group.lateFineFixedAmount || 0,
          created_at: group.created_at,
          updated_at: group.updated_at,
          members,
          slotsInfo: {
            paid: slotsPaid,
            total: slotsTotal
          }
        }
      })

      return groupsWithDetails
    } catch (error) {
      console.error('Error loading groups with details:', error)
      throw error
    }
  },

  // Get recent groups for dashboard
  async getRecentGroups(limit: number = 3): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching recent groups:', error)
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
  }
}
