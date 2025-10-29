import { supabase } from '../lib/supabase'
import { PayoutDetails } from '../types/payout'

export const payoutDetailsService = {
  // Get payout details for a specific slot
  async getPayoutDetails(slotId: number): Promise<PayoutDetails | null> {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('slot_id', slotId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return null
      }

      // Transform database data to PayoutDetails interface
      return {
        id: data.id,
        slotId: data.slot_id,
        groupId: data.group_id,
        memberId: data.member_id,
        monthlyAmount: parseFloat(data.monthly_amount),
        duration: data.duration,
        lastSlot: data.last_slot,
        administrationFee: data.administration_fee,
        payout: data.payout,
        additionalCost: parseFloat(data.additional_cost || 0),
        payoutDate: data.payout_date || new Date().toISOString().split('T')[0],
        payoutMonth: data.payout_month || '2025-08',
        baseAmount: parseFloat(data.monthly_amount) * data.duration,
        settledDeduction: 0, // This will be calculated separately
        // Payment information
        paymentMethod: (data.payment_method as 'bank_transfer' | 'cash') || 'bank_transfer',
        senderBankId: data.sender_bank ?? null,
        receiverBankId: data.receiver_bank ?? null,
        notes: data.notes || undefined
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
            payout_month: payoutDetails.payoutMonth,
            payment_method: payoutDetails.paymentMethod,
            sender_bank: payoutDetails.paymentMethod === 'bank_transfer' ? payoutDetails.senderBankId : null,
            receiver_bank: payoutDetails.paymentMethod === 'bank_transfer' ? payoutDetails.receiverBankId : null,
            notes: payoutDetails.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', payoutDetails.id)
          .select()
          .single()

        if (error) throw error

        return {
          ...payoutDetails,
          id: data.id,
          slotId: data.slot_id
        }
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('payouts')
          .insert({
            slot_id: payoutDetails.slotId,
            group_id: payoutDetails.groupId,
            member_id: payoutDetails.memberId,
            monthly_amount: payoutDetails.monthlyAmount,
            duration: payoutDetails.duration,
            last_slot: payoutDetails.lastSlot,
            administration_fee: payoutDetails.administrationFee,
            payout: payoutDetails.payout,
            additional_cost: payoutDetails.additionalCost,
            payout_date: payoutDetails.payoutDate,
            payout_month: payoutDetails.payoutMonth,
            payment_method: payoutDetails.paymentMethod,
            sender_bank: payoutDetails.paymentMethod === 'bank_transfer' ? payoutDetails.senderBankId : null,
            receiver_bank: payoutDetails.paymentMethod === 'bank_transfer' ? payoutDetails.receiverBankId : null,
            notes: payoutDetails.notes || null
          })
          .select()
          .single()

        if (error) throw error

        return {
          ...payoutDetails,
          id: data.id,
          slotId: data.slot_id
        }
      }
    } catch (error) {
      console.error('Error saving payout details:', error)
      throw error
    }
  },

  // Check if payout details exist for a specific slot
  async payoutDetailsExist(slotId: number): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('payouts')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', slotId)

      if (error) throw error

      return (count || 0) > 0
    } catch (error) {
      console.error('Error checking if payout details exist:', error)
      return false
    }
  }
}
