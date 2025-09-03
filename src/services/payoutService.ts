import { supabase } from '../lib/supabase'
import { Payout } from '../types/payout'

export const payoutService = {
  // Get all payouts for a specific month's slots
  async getAllPayouts(month?: string): Promise<Payout[]> {
    try {
      const targetMonth = month || new Date().toISOString().split('T')[0].substring(0, 7)
      
      // Get all groups with members whose assigned month is current month
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(
            member_id,
            assigned_month_date,
            members!inner(
              id,
              first_name,
              last_name,
              bank_name,
              account_number
            )
          )
        `)
        .eq('group_members.assigned_month_date', targetMonth)

      if (groupsError) throw groupsError

      // Transform the data into Payout objects
      const payouts: Payout[] = []
      
      groupsData?.forEach((group: any) => {
        group.group_members?.forEach((memberSlot: any) => {
          if (memberSlot.assigned_month_date === targetMonth && memberSlot.members) {
            const member = memberSlot.members
            const payout: Payout = {
              id: memberSlot.id || Math.random(), // Use slot ID or generate random
              memberName: `${member.first_name} ${member.last_name}`,
              memberId: member.id,
              groupName: group.name,
              groupId: group.id,
              monthlyAmount: parseFloat(group.monthly_amount),
              totalAmount: parseFloat(group.monthly_amount) * group.duration,
              duration: group.duration,
              receiveMonth: targetMonth,
              status: 'pending', // Default status
              bankName: member.bank_name,
              accountNumber: member.account_number,
              // Initialize new fields with default values
              lastSlot: false,
              administrationFee: false,
              payout: false
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
  }
}

