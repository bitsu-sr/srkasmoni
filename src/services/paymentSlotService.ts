import { supabase } from '../lib/supabase'
import type { PaymentSlot, PaymentSlotFormData, GroupMember } from '../types/paymentSlot'

export const paymentSlotService = {
  // Get all members in a specific group
  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    try {
      // Get members from the relationship table where group_id = 4
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          member_id,
          member:members(id, first_name, last_name)
        `)
        .eq('group_id', groupId)

      if (membersError) {
        throw new Error(`Failed to fetch group members: ${membersError.message}`)
      }

      // Transform to GroupMember format
      const groupMembers: GroupMember[] = (membersData || []).map((item: any) => ({
        id: Date.now() + Math.random(), // Generate temporary ID
        groupId: groupId,
        memberId: item.member_id,
        assignedMonthDate: '', // Will be set when creating slots
        member: {
          id: item.member.id,
          firstName: item.member.first_name,
          lastName: item.member.last_name,
          birthDate: '',
          birthplace: '',
          address: '',
          city: '',
          phone: '',
          email: '',
          nationalId: '',
          occupation: '',
          bankName: '',
          accountNumber: '',
          dateOfRegistration: '',
          totalReceived: 0,
          lastPayment: '',
          nextPayment: '',
          notes: null,
          created_at: '',
          updated_at: ''
        },
        createdAt: new Date().toISOString()
      }))

      console.log(`Found ${groupMembers.length} members for group ${groupId}`)
      return groupMembers
    } catch (error) {
      console.error('Error in getGroupMembers:', error)
      throw error
    }
  },

  // Get available slots for a member in a specific group
  async getMemberSlots(memberId: number, groupId: number): Promise<PaymentSlot[]> {
    try {
      // First, get the group's monthly amount
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('monthly_amount')
        .eq('id', groupId)
        .single()

      if (groupError) {
        throw new Error(`Failed to fetch group monthly amount: ${groupError.message}`)
      }

      const monthlyAmount = groupData?.monthly_amount || 0

      // Get assigned_month_date from group_members table where group_id = 4 AND member_id = 5
      const { data, error } = await supabase
        .from('group_members')
        .select('assigned_month_date')
        .eq('member_id', memberId)
        .eq('group_id', groupId)

      if (error) {
        throw new Error(`Failed to fetch member slots: ${error.message}`)
      }

      // Transform the assigned_month_date to PaymentSlot format
      const transformedSlots: PaymentSlot[] = (data || [])
        .filter((item: any) => item.assigned_month_date) // Only include items with assigned_month_date
        .map((item: any, index: number) => ({
          id: index + 1, // Generate temporary ID
          groupId: groupId,
          memberId: memberId,
          monthDate: item.assigned_month_date, // Use assigned_month_date from group_members
          amount: monthlyAmount, // Use the group's monthly_amount
          dueDate: '', // Not needed for display
          createdAt: new Date().toISOString()
        }))
      
      console.log(`Found ${transformedSlots.length} assigned slots for member ${memberId} in group ${groupId} with monthly amount ${monthlyAmount}`)
      return transformedSlots
    } catch (error) {
      console.error('Error in getMemberSlots:', error)
      throw error
    }
  },

  // Get all slots for a specific group
  async getGroupSlots(groupId: number): Promise<PaymentSlot[]> {
    const { data, error } = await supabase
      .from('payment_slots')
      .select(`
        *,
        member:members(first_name, last_name)
      `)
      .eq('group_id', groupId)
      .order('month_date', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch group slots: ${error.message}`)
    }

    // Transform the database data to match our PaymentSlot interface
    const transformedSlots: PaymentSlot[] = (data || []).map((slot: any) => ({
      id: slot.id,
      groupId: slot.group_id,
      memberId: slot.member_id,
      monthDate: slot.month_date,
      amount: slot.amount,
      dueDate: slot.due_date,
      createdAt: slot.created_at
    }))

    return transformedSlots
  },

  // Create new payment slot
  async createPaymentSlot(slotData: PaymentSlotFormData): Promise<PaymentSlot> {
    // Transform the data to match database column names
    const dbSlotData = {
      group_id: slotData.groupId,
      member_id: slotData.memberId,
      month_date: slotData.monthDate,
      amount: slotData.amount,
      due_date: slotData.dueDate
    }
    
         const { data, error } = await supabase
       .from('payment_slots')
       .insert([dbSlotData])
       .select()
       .single()

     if (error) {
       console.error('Error creating payment slot:', error)
       throw new Error(`Failed to create payment slot: ${error.message}`)
     }
     
     // Transform back to match our interface
    const transformedSlot: PaymentSlot = {
      id: data.id,
      groupId: data.group_id,
      memberId: data.member_id,
      monthDate: data.month_date,
      amount: data.amount,
      dueDate: data.due_date,
      createdAt: data.created_at
    }
    
    return transformedSlot
  },

  // Update payment slot
  async updatePaymentSlot(id: number, slotData: Partial<PaymentSlotFormData>): Promise<PaymentSlot> {
    const { data, error } = await supabase
      .from('payment_slots')
      .update(slotData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update payment slot: ${error.message}`)
    }

    return data
  },

  // Delete payment slot
  async deletePaymentSlot(id: number): Promise<void> {
    const { error } = await supabase
      .from('payment_slots')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete payment slot: ${error.message}`)
    }
  },

  // Get specific slot by month
  async getSlotByMonth(groupId: number, memberId: number, monthDate: string): Promise<PaymentSlot | null> {
    const { data, error } = await supabase
      .from('payment_slots')
      .select('*')
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .eq('month_date', monthDate)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to fetch slot: ${error.message}`)
    }

    return data
  },

  // Check if a slot exists for a member in a group for a specific month
  async slotExists(groupId: number, memberId: number, monthDate: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('payment_slots')
      .select('id')
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .eq('month_date', monthDate)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check slot existence: ${error.message}`)
    }

    return !!data
  },

  // Clean up auto-generated slots for a member in a group (keep only specific assigned slots)
  async cleanupAutoGeneratedSlots(groupId: number, memberId: number, keepMonthDates: string[]): Promise<void> {
    try {
      // Get all slots for this member in this group
      const { data: existingSlots, error } = await supabase
        .from('payment_slots')
        .select('id, month_date')
        .eq('group_id', groupId)
        .eq('member_id', memberId)

      if (error) {
        throw new Error(`Failed to fetch existing slots: ${error.message}`)
      }

      if (!existingSlots || existingSlots.length === 0) {
        return
      }

      // Find slots to delete (those not in keepMonthDates)
      const slotsToDelete = existingSlots.filter((slot: any) => 
        !keepMonthDates.includes(slot.month_date)
      )

      if (slotsToDelete.length === 0) {
        return
      }

      // Delete the extra slots
      const slotIdsToDelete = slotsToDelete.map((slot: any) => slot.id)
      const { error: deleteError } = await supabase
        .from('payment_slots')
        .delete()
        .in('id', slotIdsToDelete)

      if (deleteError) {
        throw new Error(`Failed to delete extra slots: ${deleteError.message}`)
      }

      console.log(`Cleaned up ${slotsToDelete.length} auto-generated slots for member ${memberId} in group ${groupId}`)
    } catch (error) {
      console.error('Error cleaning up auto-generated slots:', error)
      throw error
    }
  },

  // Get monthly amount for a group
  async getGroupMonthlyAmount(groupId: number): Promise<number> {
    const { data, error } = await supabase
      .from('groups')
      .select('monthly_amount')
      .eq('id', groupId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch group monthly amount: ${error.message}`)
    }

    return data?.monthly_amount || 0
  },

  // Format month date for display (MM-YYYY)
  formatMonthDate(monthDate: string): string {
    if (!monthDate || monthDate.length !== 7) {
      return monthDate
    }
    
    const [year, month] = monthDate.split('-')
    return `${month}-${year}`
  },

  // Parse display format back to database format (YYYY-MM)
  parseMonthDate(displayDate: string): string {
    if (!displayDate || displayDate.length !== 7) return displayDate
    
    const [month, year] = displayDate.split('-')
    return `${year}-${month}`
  }
}
