import { supabase } from '../lib/supabase'
import { Payout } from '../types/payout'

export const payoutService = {
  // Get all payouts for a specific month's slots
  async getAllPayouts(month?: string): Promise<Payout[]> {
    try {
      const targetMonth = month || new Date().toISOString().split('T')[0].substring(0, 7)
      
      // Execute all queries in parallel for better performance
      const [groupsResult, payoutDetailsResult, groupPaymentCounts] = await Promise.all([
        // Get all groups with members whose assigned month is current month
        supabase
          .from('groups')
          .select(`
            *,
            group_members!inner(
              id,
              member_id,
              assigned_month_date,
              members!inner(
                id,
                first_name,
                last_name,
                national_id,
                bank_name,
                account_number
              )
            )
          `)
          .eq('group_members.assigned_month_date', targetMonth),
        
        // Get payout details from payouts table for this month
        supabase
          .from('payouts')
          .select('*')
          .eq('payout_month', targetMonth),
        
        // Get payment counts for each group for the selected month
        this.getGroupPaymentCounts(targetMonth)
      ])

      if (groupsResult.error) throw groupsResult.error

      const groupsData = groupsResult.data
      const payoutDetails = payoutDetailsResult.data
      
      if (payoutDetailsResult.error) {
        console.warn('Error fetching payout details:', payoutDetailsResult.error)
      }

      // Create a map of payout details for quick lookup by slot_id
      const payoutDetailsMap = new Map()
      payoutDetails?.forEach((detail: any) => {
        // Use slot_id as the key since each slot should have its own payout record
        payoutDetailsMap.set(detail.slot_id, detail)
      })

      // Transform the data into Payout objects
      const payouts: Payout[] = []
      
      groupsData?.forEach((group: any) => {
        group.group_members?.forEach((memberSlot: any) => {
          if (memberSlot.assigned_month_date === targetMonth && memberSlot.members) {
            const member = memberSlot.members
            const slotId = memberSlot.id
            const payoutDetail = payoutDetailsMap.get(slotId)
            
            // Get payment count for this group
            const paymentCount = groupPaymentCounts.get(group.id) || { received: 0, total: 0 }
            
            const payout: Payout = {
              id: payoutDetail?.id || 0, // Use payout record ID if it exists
              slotId: slotId, // The slot ID from group_members table
              memberName: `${member.first_name} ${member.last_name}`,
              memberId: member.id,
              nationalId: member.national_id,
              groupName: group.name,
              groupId: group.id,
              monthlyAmount: parseFloat(group.monthly_amount),
              totalAmount: parseFloat(group.monthly_amount) * group.duration,
              duration: group.duration,
              receiveMonth: targetMonth,
              status: `${paymentCount.received}/${paymentCount.total}`, // New status format
              bankName: member.bank_name,
              accountNumber: member.account_number,
              // Use actual payout data if available, otherwise defaults
              lastSlot: payoutDetail?.last_slot || false,
              administrationFee: payoutDetail?.administration_fee || false,
              payout: payoutDetail?.payout || false,
              additionalCost: parseFloat(payoutDetail?.additional_cost || 0),
              settledDeduction: 0, // This will be calculated separately when needed
              calculatedTotalAmount: parseFloat(payoutDetail?.calculated_total_amount || 0),
              settledDeductionEnabled: payoutDetail?.settled_deduction_enabled ?? true
            }
            payouts.push(payout)
          }
        })
      })

      return payouts
    } catch (error) {
      console.error('Error fetching payouts:', error)
      throw error
    }
  },

  // Get payment counts for each group for a specific month (OPTIMIZED)
  async getGroupPaymentCounts(month: string): Promise<Map<number, { received: number; total: number }>> {
    try {
      const countsMap = new Map<number, { received: number; total: number }>()

      // Get all groups that have members assigned to this month
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          group_members!inner(
            member_id,
            assigned_month_date
          )
        `)
        .eq('group_members.assigned_month_date', month)

      if (groupsError) {
        console.error('Error fetching groups for payment counts:', groupsError)
        return countsMap
      }

      if (!groupsData || groupsData.length === 0) {
        return countsMap
      }

      const groupIds = groupsData.map((group: any) => group.id)

      // Get total member counts for all groups in one query
      const { data: allGroupMembers, error: totalMembersError } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds)

      if (totalMembersError) {
        console.warn('Error fetching total members for groups:', totalMembersError)
      }

      // Count members per group
      const memberCounts = new Map<number, number>()
      allGroupMembers?.forEach((member: any) => {
        const groupId = member.group_id
        memberCounts.set(groupId, (memberCounts.get(groupId) || 0) + 1)
      })

      // Get paid payments for all groups in one query
      const { data: paidPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('payment_month', month)
        .in('status', ['received', 'settled'])

      if (paymentsError) {
        console.warn('Error fetching received/settled payments for groups:', paymentsError)
      }

      // Count paid payments per group
      const paymentCounts = new Map<number, number>()
      paidPayments?.forEach((payment: any) => {
        const groupId = payment.group_id
        paymentCounts.set(groupId, (paymentCounts.get(groupId) || 0) + 1)
      })

      // Build the final counts map
      groupIds.forEach((groupId: any) => {
        countsMap.set(groupId, {
          received: paymentCounts.get(groupId) || 0,
          total: memberCounts.get(groupId) || 0
        })
      })

      return countsMap
    } catch (error) {
      console.error('Error getting group payment counts:', error)
      return new Map()
    }
  },

  // Get payouts by status
  async getPayoutsByStatus(status: string, month?: string): Promise<Payout[]> {
    const allPayouts = await this.getAllPayouts(month)
    return allPayouts.filter(payout => payout.status === status)
  },

  // Get payouts by group
  async getPayoutsByGroup(groupId: number, month?: string): Promise<Payout[]> {
    const allPayouts = await this.getAllPayouts(month)
    return allPayouts.filter(payout => payout.groupId === groupId)
  },

  // Get payouts by member
  async getPayoutsByMember(memberId: number, month?: string): Promise<Payout[]> {
    const allPayouts = await this.getAllPayouts(month)
    return allPayouts.filter(payout => payout.memberId === memberId)
  },

  // Get payout by ID
  async getPayoutById(id: number, month?: string): Promise<Payout | null> {
    const allPayouts = await this.getAllPayouts(month)
    return allPayouts.find(payout => payout.id === id) || null
  },

  // Update payout status
  async updatePayoutStatus(id: number, status: string): Promise<boolean> {
    try {
      // In a real implementation, you would update the database
      // For now, we'll just return success
      console.log(`Updating payout ${id} status to ${status}`)
      return true
    } catch (error) {
      console.error('Error updating payout status:', error)
      return false
    }
  },

  // Search payouts
  async searchPayouts(query: string, month?: string): Promise<Payout[]> {
    const allPayouts = await this.getAllPayouts(month)
    const searchTerm = query.toLowerCase()
    
    return allPayouts.filter(payout => 
      payout.memberName.toLowerCase().includes(searchTerm) ||
      payout.groupName.toLowerCase().includes(searchTerm) ||
      payout.bankName.toLowerCase().includes(searchTerm)
    )
  },

  // Get payout statistics
  async getPayoutStats(month?: string): Promise<{
    totalPayouts: number
    totalAmount: number
    completedPayouts: number
    pendingPayouts: number
  }> {
    const allPayouts = await this.getAllPayouts(month)
    
    return {
      totalPayouts: allPayouts.length,
      totalAmount: allPayouts.reduce((sum, payout) => sum + payout.totalAmount, 0),
      completedPayouts: allPayouts.filter(p => p.status === 'completed').length,
      pendingPayouts: allPayouts.filter(p => p.status === 'pending').length
    }
  },

  // Update calculated total amount and settled deduction toggle for a payout
  async updatePayoutCalculatedAmount(
    slotId: number, 
    calculatedTotalAmount: number, 
    settledDeductionEnabled: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payouts')
        .update({
          calculated_total_amount: calculatedTotalAmount,
          settled_deduction_enabled: settledDeductionEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('slot_id', slotId)

      if (error) {
        console.error('Error updating payout calculated amount:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating payout calculated amount:', error)
      return false
    }
  },
  // Get group members with their payment status for a specific month
  async getGroupMembersWithPaymentStatus(groupId: number, month: string): Promise<Array<{
    groupMemberId: number
    memberId: number
    memberName: string
    paymentStatus: 'not_paid' | 'pending' | 'received' | 'settled'
    paymentDate?: string
    paymentAmount?: number
  }>> {
    try {
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          member_id,
          members!inner(
            id,
            first_name,
            last_name
          )
        `)
        .eq('group_id', groupId)

      if (membersError) {
        throw new Error(`Failed to fetch group members: ${membersError.message}`)
      }

      if (!groupMembers || groupMembers.length === 0) {
        return []
      }

      const memberIds = groupMembers.map((gm: any) => gm.member_id)

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('member_id, status, payment_date, amount')
        .eq('group_id', groupId)
        .eq('payment_month', month)
        .in('member_id', memberIds)
        .in('status', ['received', 'settled', 'pending'])

      if (paymentsError) {
        console.warn('Error fetching payments:', paymentsError)
      }

      const paymentMap = new Map<number, { status: string; paymentDate?: string; paymentAmount?: number }>()
      payments?.forEach((payment: any) => {
        const existing = paymentMap.get(payment.member_id)
        if (
          !existing ||
          (payment.status === 'settled' && existing.status !== 'settled') ||
          (payment.status === 'received' && existing.status === 'pending') ||
          (payment.status === existing.status && payment.payment_date > (existing.paymentDate || ''))
        ) {
          paymentMap.set(payment.member_id, {
            status: payment.status,
            paymentDate: payment.payment_date,
            paymentAmount: payment.amount
          })
        }
      })

      const result: Array<{
        groupMemberId: number
        memberId: number
        memberName: string
        paymentStatus: 'not_paid' | 'pending' | 'received' | 'settled'
        paymentDate?: string
        paymentAmount?: number
      }> = groupMembers.map((gm: any) => {
        const member = gm.members
        const paymentInfo = paymentMap.get(member.id)

        return {
          groupMemberId: gm.id,
          memberId: member.id,
          memberName: `${member.first_name} ${member.last_name}`,
          paymentStatus: (paymentInfo?.status as 'not_paid' | 'pending' | 'received' | 'settled') || 'not_paid',
          paymentDate: paymentInfo?.paymentDate,
          paymentAmount: paymentInfo?.paymentAmount
        }
      })

      result.sort((a: typeof result[number], b: typeof result[number]) =>
        a.memberName.localeCompare(b.memberName)
      )

      return result
    } catch (error) {
      console.error('Error getting group members with payment status:', error)
      throw error
    }
  }
}

