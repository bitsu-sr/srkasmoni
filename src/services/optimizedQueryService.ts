import { supabase } from '../lib/supabase'

export interface OptimizedSlotData {
  // Payment slot data
  id: number
  groupId: number
  memberId: number
  monthDate: string
  amount: number
  
  // Member data (joined)
  member_first_name: string
  member_last_name: string
  member_email?: string
  
  // Group data (joined)
  group_name: string
  group_monthly_amount: number
  
  // Payment status (joined)
  has_payment: boolean
  payment_status?: string
  payment_amount?: number
  payment_date?: string
}

export interface OptimizedGroupData {
  // Group data
  id: number
  name: string
  monthlyAmount: number
  description?: string
  
  // Member count and total amount (calculated)
  member_count: number
  total_monthly_amount: number
  
  // Members array (joined)
  members: Array<{
    id: number
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }>
}

export const optimizedQueryService = {
  // Phase 2: Single optimized query to get all slots with member, group, and payment data
  async getAllSlotsOptimized(): Promise<OptimizedSlotData[]> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          member_id,
          members!inner (
            first_name,
            last_name,
            email
          ),
          groups!inner (
            name,
            monthly_amount
          ),
          payment_slots (
            month_date,
            amount,
            payments (
              status,
              amount,
              payment_date
            )
          )
        `)
        .order('id', { ascending: true })
      
      if (error) {
        console.error('Error in optimized query:', error)
        throw error
      }
      
      // Transform the joined data into our optimized format
      const optimizedSlots: OptimizedSlotData[] = (data || []).map((groupMember: any) => {
        const member = groupMember.members as any
        const group = groupMember.groups as any
        const paymentSlots = groupMember.payment_slots as any[]
        
        // For each group member, we need to create a slot for each month
        // For now, let's create a single slot with the monthly amount
        // In the future, this could be enhanced to create multiple monthly slots
        
        // Check if this member has any payment slots with payments
        let hasPayment = false
        let latestPayment = null
        let monthDate = new Date().toISOString().slice(0, 7) // Current month as default
        
        if (paymentSlots && paymentSlots.length > 0) {
          // Find the latest payment slot with a payment
          for (const slot of paymentSlots) {
            if (slot.payments && slot.payments.length > 0) {
              hasPayment = true
              latestPayment = slot.payments[0]
              monthDate = slot.month_date
              break
            }
          }
        }
        
        return {
          id: groupMember.id,
          groupId: groupMember.group_id,
          memberId: groupMember.member_id,
          monthDate: monthDate,
          amount: group?.monthly_amount || 0,
          
          // Member data
          member_first_name: member?.first_name || '',
          member_last_name: member?.last_name || '',
          member_email: member?.email,
          
          // Group data
          group_name: group?.name || '',
          group_monthly_amount: group?.monthly_amount || 0,
          
          // Payment status
          has_payment: hasPayment,
          payment_status: latestPayment?.status,
          payment_amount: latestPayment?.amount,
          payment_date: latestPayment?.payment_date
        }
      })
      
      return optimizedSlots
      
    } catch (error) {
      console.error('Phase 2: Optimized query failed:', error)
      throw error
    }
  },

  // Phase 2: Single optimized query to get all groups with members and calculated totals
  async getAllGroupsOptimized(): Promise<OptimizedGroupData[]> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          monthly_amount,
          description,
          group_members!inner (
            members (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error in optimized groups query:', error)
        throw error
      }
      
      // Transform and calculate totals
      const optimizedGroups: OptimizedGroupData[] = (data || []).map((group: any) => {
        const groupMembers = group.group_members as any[]
        const members = groupMembers.map(gm => gm.members).filter(Boolean)
        
        return {
          id: group.id,
          name: group.name,
          monthlyAmount: group.monthly_amount,
          description: group.description,
          member_count: members.length,
          total_monthly_amount: members.length * group.monthly_amount,
          members: members.map((member: any) => ({
            id: member.id,
            firstName: member.first_name,
            lastName: member.last_name,
            email: member.email,
            phone: member.phone
          }))
        }
      })
      
      return optimizedGroups
      
    } catch (error) {
      console.error('Phase 2: Optimized groups query failed:', error)
      throw error
    }
  },

  // Phase 2: Single optimized query to get payment statistics with all calculations
  async getPaymentStatsOptimized(): Promise<{
    totalPayments: number
    totalAmount: number
    receivedAmount: number
    pendingAmount: number
    notPaidAmount: number
    settledAmount: number
    cashPayments: number
    bankTransferPayments: number
    receivedCount: number
    pendingCount: number
    notPaidCount: number
    settledCount: number
  }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status, amount, payment_method')
      
      if (error) {
        console.error('Error in optimized payment stats query:', error)
        throw error
      }
      
      // Calculate all statistics in memory (much faster than multiple DB calls)
      const stats = {
        totalPayments: data?.length || 0,
        totalAmount: 0,
        receivedAmount: 0,
        pendingAmount: 0,
        notPaidAmount: 0,
        settledAmount: 0,
        cashPayments: 0,
        bankTransferPayments: 0,
        receivedCount: 0,
        pendingCount: 0,
        notPaidCount: 0,
        settledCount: 0
      }
      
      data?.forEach((payment: any) => {
        const amount = payment.amount || 0
        stats.totalAmount += amount
        
        // Count by status
        switch (payment.status) {
          case 'received':
            stats.receivedAmount += amount
            stats.receivedCount++
            break
          case 'pending':
            stats.pendingAmount += amount
            stats.pendingCount++
            break
          case 'settled':
            stats.settledAmount += amount
            stats.settledCount++
            break
          case 'not_paid':
            stats.notPaidAmount += amount
            stats.notPaidCount++
            break
        }
        
        // Count by payment method
        if (payment.payment_method === 'cash') {
          stats.cashPayments++
        } else if (payment.payment_method === 'bank_transfer') {
          stats.bankTransferPayments++
        }
      })
      
      return stats
      
    } catch (error) {
      console.error('Phase 2: Optimized payment stats failed:', error)
      throw error
    }
  },

  // Phase 2: Single optimized query to check payment status for multiple slots
  async checkMultipleSlotsPaymentStatusOptimized(slots: { groupId: number; memberId: number; monthDate: string }[]): Promise<Set<string>> {
    try {
      if (slots.length === 0) return new Set()
      
      // Create a single query to check all slots at once using JOIN with payment_slots
      const { data, error } = await supabase
        .from('payments')
        .select(`
          group_id,
          member_id,
          payment_slots!inner (
            month_date
          )
        `)
        .in('group_id', slots.map(s => s.groupId))
        .in('member_id', slots.map(s => s.memberId))
      
      if (error) {
        console.error('Error in optimized bulk payment status check:', error)
        throw error
      }
      
      // Create a set of slots that have payments
      const slotsWithPayments = new Set<string>()
      data?.forEach((payment: any) => {
        const monthDate = payment.payment_slots?.month_date
        if (monthDate) {
          const slotKey = `${payment.group_id}-${payment.member_id}-${monthDate}`
          slotsWithPayments.add(slotKey)
        }
      })
      
      return slotsWithPayments
      
    } catch (error) {
      console.error('Phase 2: Optimized bulk payment status check failed:', error)
      throw error
    }
  }
}
