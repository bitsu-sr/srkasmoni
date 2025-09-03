import { supabase } from '../lib/supabase'
import { PayoutDetails } from '../types/payout'

export const payoutDetailsService = {
  // Get payout details for a specific group-member combination
  async getPayoutDetails(groupId: number, memberId: number): Promise<PayoutDetails | null> {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('group_id', groupId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error
      }

      if (!data) {
        return null
      }

      // Transform database data to PayoutDetails interface
      return {
        id: data.id,
        groupId: data.group_id,
        memberId: data.member_id,
        monthlyAmount: parseFloat(data.monthly_amount),
        duration: data.duration,
        lastSlot: data.last_slot,
        administrationFee: data.administration_fee,
        payout: data.payout,
        additionalCost: parseFloat(data.additional_cost || 0),
        payoutDate: data.payout_date || new Date().toISOString().split('T')[0],
        baseAmount: parseFloat(data.monthly_amount) * data.duration,
        settledDeduction: 0 // This will be calculated separately
      }
    } catch (error) {
      console.error('Error fetching payout details:', error)
      throw error
    }
  },

  // Save or update payout details
  async savePayoutDetails(payoutDetails: PayoutDetails): Promise<PayoutDetails> {
    try {
      if (payoutDetails.id) {
        // Update existing record
        const { data, error } = await supabase
          .from('payouts')
          .update({
            last_slot: payoutDetails.lastSlot,
            administration_fee: payoutDetails.administrationFee,
            payout: payoutDetails.payout,
            additional_cost: payoutDetails.additionalCost,
            payout_date: payoutDetails.payoutDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', payoutDetails.id)
          .select()
          .single()

        if (error) throw error

        return {
          ...payoutDetails,
          id: data.id
        }
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('payouts')
          .insert({
            group_id: payoutDetails.groupId,
            member_id: payoutDetails.memberId,
            monthly_amount: payoutDetails.monthlyAmount,
            duration: payoutDetails.duration,
            last_slot: payoutDetails.lastSlot,
            administration_fee: payoutDetails.administrationFee,
            payout: payoutDetails.payout,
            additional_cost: payoutDetails.additionalCost,
            payout_date: payoutDetails.payoutDate
          })
          .select()
          .single()

        if (error) throw error

        return {
          ...payoutDetails,
          id: data.id
        }
      }
    } catch (error) {
      console.error('Error saving payout details:', error)
      throw error
    }
  },

  // Check if payout details exist for a group-member combination
  async payoutDetailsExist(groupId: number, memberId: number): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('payouts')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('member_id', memberId)

      if (error) throw error

      return (count || 0) > 0
    } catch (error) {
      console.error('Error checking if payout details exist:', error)
      return false
    }
  }
}
