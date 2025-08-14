import { supabase } from '../lib/supabase'
import type { Payment, PaymentFormData, PaymentFilters, PaymentStats } from '../types/payment'

export const paymentService = {
  // Get all payments with optional filters
  async getPayments(filters?: PaymentFilters): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select(`
        *,
        member:members(first_name, last_name),
        group:groups(name, monthly_amount),
        slot:payment_slots(month_date),
        senderBank:banks!payments_sender_bank_id_fkey(name),
        receiverBank:banks!payments_receiver_bank_id_fkey(name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.search) {
      query = query.or(`member.first_name.ilike.%${filters.search}%,member.last_name.ilike.%${filters.search}%`)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }
    if (filters?.groupId) {
      query = query.eq('group_id', filters.groupId)
    }
    if (filters?.memberId) {
      query = query.eq('member_id', filters.memberId)
    }
    if (filters?.startDate) {
      query = query.gte('payment_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('payment_date', filters.endDate)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    // Transform the data to match frontend interface (snake_case to camelCase)
    const transformedPayments: Payment[] = (data || []).map((payment: any) => ({
      id: payment.id,
      memberId: payment.member_id,
      groupId: payment.group_id,
      slotId: payment.slot_id,
      paymentDate: payment.payment_date,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      senderBankId: payment.sender_bank_id,
      receiverBankId: payment.receiver_bank_id,
      status: payment.status,
      notes: payment.notes,
      fineAmount: payment.fine_amount || 0,
      isLatePayment: payment.is_late_payment || false,
      paymentDeadline: payment.payment_deadline || '',
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      // Transform joined data
      member: payment.member ? {
        id: payment.member.id,
        firstName: payment.member.first_name, // Transform first_name to firstName
        lastName: payment.member.last_name,   // Transform last_name to lastName
        birthDate: '',
        birthplace: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        nationalId: '',
        nationality: '',
        occupation: '',
        bankName: '',
        accountNumber: '',
        dateOfRegistration: '',
        totalReceived: 0,
        lastPayment: '',
        nextPayment: '',
        notes: '',
        created_at: '',
        updated_at: ''
      } : undefined,
      group: payment.group ? {
        id: payment.group.id,
        name: payment.group.name,
        description: null,
        monthlyAmount: payment.group.monthly_amount,
        maxMembers: 0,
        duration: 0,
        startDate: '',
        endDate: '',
        paymentDeadlineDay: 25,
        lateFinePercentage: 5.00,
        lateFineFixedAmount: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      slot: payment.slot ? {
        id: payment.slot.id,
        groupId: payment.slot.group_id,
        memberId: payment.slot.member_id,
        monthDate: payment.slot.month_date,
        amount: payment.slot.amount,
        dueDate: payment.slot.due_date,
        createdAt: payment.slot.created_at
      } : undefined,
      senderBank: payment.senderBank ? {
        id: payment.senderBank.id,
        name: payment.senderBank.name,
        shortName: '',
        address: '',
        createdAt: '',
        updatedAt: ''
      } : undefined,
      receiverBank: payment.receiverBank ? {
        id: payment.receiverBank.id,
        name: payment.receiverBank.name,
        shortName: '',
        address: '',
        createdAt: '',
        updatedAt: ''
      } : undefined
    }))

    return transformedPayments
  },

  // Get single payment by ID
  async getPayment(id: number): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        member:members(first_name, last_name),
        group:groups(name, monthly_amount),
        slot:payment_slots(month_date),
        senderBank:banks!payments_sender_bank_id_fkey(name),
        receiverBank:banks!payments_receiver_bank_id_fkey(name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to fetch payment: ${error.message}`)
    }

    if (!data) return null

    // Transform the data to match frontend interface (snake_case to camelCase)
    const transformedPayment: Payment = {
      id: data.id,
      memberId: data.member_id,
      groupId: data.group_id,
      slotId: data.slot_id,
      paymentDate: data.payment_date,
      amount: data.amount,
      paymentMethod: data.payment_method,
      senderBankId: data.sender_bank_id,
      receiverBankId: data.receiver_bank_id,
      status: data.status,
      notes: data.notes,
      fineAmount: data.fine_amount || 0,
      isLatePayment: data.is_late_payment || false,
      paymentDeadline: data.payment_deadline || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Transform joined data
      member: data.member ? {
        id: data.member.id,
        firstName: data.member.first_name, // Transform first_name to firstName
        lastName: data.member.last_name,   // Transform last_name to lastName
        birthDate: '',
        birthplace: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        nationalId: '',
        nationality: '',
        occupation: '',
        bankName: '',
        accountNumber: '',
        dateOfRegistration: '',
        totalReceived: 0,
        lastPayment: '',
        nextPayment: '',
        notes: '',
        created_at: '',
        updated_at: ''
      } : undefined,
      group: data.group ? {
        id: data.group.id,
        name: data.group.name,
        description: null,
        monthlyAmount: data.group.monthly_amount,
        maxMembers: 0,
        duration: 0,
        startDate: '',
        endDate: '',
        paymentDeadlineDay: 25,
        lateFinePercentage: 5.00,
        lateFineFixedAmount: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      slot: data.slot ? {
        id: data.slot.id,
        groupId: data.slot.group_id,
        memberId: data.slot.member_id,
        monthDate: data.slot.month_date,
        amount: data.slot.amount,
        dueDate: data.slot.due_date,
        createdAt: data.slot.created_at
      } : undefined,
      senderBank: data.senderBank ? {
        id: data.senderBank.id,
        name: data.senderBank.name,
        shortName: '',
        address: '',
        createdAt: '',
        updatedAt: ''
      } : undefined,
      receiverBank: data.receiverBank ? {
        id: data.receiverBank.id,
        name: data.receiverBank.name,
        shortName: '',
        address: '',
        createdAt: '',
        updatedAt: ''
      } : undefined
    }

    return transformedPayment
  },

  // Create new payment
  async createPayment(paymentData: PaymentFormData): Promise<Payment> {
    // Transform camelCase to snake_case for database
    const dbPaymentData = {
      member_id: paymentData.memberId,
      group_id: paymentData.groupId,
      slot_id: paymentData.slotId,
      payment_date: paymentData.paymentDate,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      status: paymentData.status,
      sender_bank_id: paymentData.senderBankId,
      receiver_bank_id: paymentData.receiverBankId,
      notes: paymentData.notes,
      fine_amount: paymentData.fineAmount || 0,
      is_late_payment: paymentData.isLatePayment || false,
      payment_deadline: paymentData.paymentDeadline || null
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([dbPaymentData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    return data
  },

  // Update payment
  async updatePayment(id: number, paymentData: Partial<PaymentFormData>): Promise<Payment> {
    // Transform camelCase to snake_case for database
    const dbPaymentData: any = {}
    
    if (paymentData.memberId !== undefined) dbPaymentData.member_id = paymentData.memberId
    if (paymentData.groupId !== undefined) dbPaymentData.group_id = paymentData.groupId
    if (paymentData.slotId !== undefined) dbPaymentData.slot_id = paymentData.slotId
    if (paymentData.paymentDate !== undefined) dbPaymentData.payment_date = paymentData.paymentDate
    if (paymentData.amount !== undefined) dbPaymentData.amount = paymentData.amount
    if (paymentData.paymentMethod !== undefined) dbPaymentData.payment_method = paymentData.paymentMethod
    if (paymentData.status !== undefined) dbPaymentData.status = paymentData.status
    if (paymentData.senderBankId !== undefined) dbPaymentData.sender_bank_id = paymentData.senderBankId
    if (paymentData.receiverBankId !== undefined) dbPaymentData.receiver_bank_id = paymentData.receiverBankId
    if (paymentData.notes !== undefined) dbPaymentData.notes = paymentData.notes
    if (paymentData.fineAmount !== undefined) dbPaymentData.fine_amount = paymentData.fineAmount
    if (paymentData.isLatePayment !== undefined) dbPaymentData.is_late_payment = paymentData.isLatePayment
    if (paymentData.paymentDeadline !== undefined) dbPaymentData.payment_deadline = paymentData.paymentDeadline

    const { data, error } = await supabase
      .from('payments')
      .update(dbPaymentData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`)
    }

    return data
  },

  // Delete payment
  async deletePayment(id: number): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete payment: ${error.message}`)
    }
  },

  // Get payment statistics
  async getPaymentStats(): Promise<PaymentStats> {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, status, payment_method')

    if (error) {
      throw new Error(`Failed to fetch payment stats: ${error.message}`)
    }

    const stats: PaymentStats = {
      totalPayments: data?.length || 0,
      totalAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      notPaidAmount: 0,
      settledAmount: 0,
      cashPayments: 0,
      bankTransferPayments: 0
    }

    data?.forEach((payment: any) => {
      stats.totalAmount += payment.amount || 0
      
      switch (payment.status) {
        case 'received':
          stats.receivedAmount += payment.amount || 0
          break
        case 'pending':
          stats.pendingAmount += payment.amount || 0
          break
        case 'not_paid':
          stats.notPaidAmount += payment.amount || 0
          break
        case 'settled':
          stats.settledAmount += payment.amount || 0
          break
      }

      if (payment.payment_method === 'cash') {
        stats.cashPayments++
      } else if (payment.payment_method === 'bank_transfer') {
        stats.bankTransferPayments++
      }
    })

    return stats
  },

  // Get payment history for a specific member
  async getMemberPaymentHistory(memberId: number): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        group:groups(name, monthly_amount),
        slot:payment_slots(month_date),
        senderBank:banks!payments_sender_bank_id_fkey(name),
        receiverBank:banks!payments_receiver_bank_id_fkey(name)
      `)
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch member payment history: ${error.message}`)
    }

    // Transform the data to match frontend interface (snake_case to camelCase)
    const transformedPayments: Payment[] = (data || []).map((payment: any) => ({
      id: payment.id,
      memberId: payment.member_id,
      groupId: payment.group_id,
      slotId: payment.slot_id,
      paymentDate: payment.payment_date,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      senderBankId: payment.sender_bank_id,
      receiverBankId: payment.receiver_bank_id,
      status: payment.status,
      notes: payment.notes,
      fineAmount: payment.fine_amount || 0,
      isLatePayment: payment.is_late_payment || false,
      paymentDeadline: payment.payment_deadline || '',
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      // Transform joined data
      member: undefined, // Not needed for member payment history
      group: payment.group ? {
        id: payment.group.id,
        name: payment.group.name,
        description: null,
        monthlyAmount: payment.group.monthly_amount,
        maxMembers: 0,
        duration: 0,
        startDate: '',
        endDate: '',
        paymentDeadlineDay: 25,
        lateFinePercentage: 5.00,
        lateFineFixedAmount: 0,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      slot: payment.slot ? {
        id: payment.slot.id,
        groupId: payment.slot.group_id,
        memberId: payment.slot.member_id,
        monthDate: payment.slot.month_date,
        amount: payment.slot.amount,
        dueDate: payment.slot.due_date,
        createdAt: payment.slot.created_at
      } : undefined,
      senderBank: payment.senderBank ? {
        id: payment.senderBank.id,
        name: payment.senderBank.name
      } : undefined,
      receiverBank: payment.receiverBank ? {
        id: payment.receiverBank.id,
        name: payment.receiverBank.name
      } : undefined
    }))

    return transformedPayments
  },

  // Get count of paid slots for a member in a specific group
  async getMemberPaidSlotsCount(memberId: number, groupId: number): Promise<number> {
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('member_id', memberId)
      .eq('group_id', groupId)
      .eq('status', 'received')

    if (error) {
      throw new Error(`Failed to fetch paid slots count: ${error.message}`)
    }

    return data?.length || 0
  },

  // Get count of paid slots for a specific group
  async getGroupPaidSlotsCount(groupId: number): Promise<{ paid: number; total: number }> {
    try {
      // Get total slots for the group (from group_members table)
      const { data: totalSlots, error: totalError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)

      if (totalError) {
        throw new Error(`Failed to fetch total slots: ${totalError.message}`)
      }

      const total = totalSlots?.length || 0

      // Get paid slots count (from payments table with status 'received')
      const { data: paidSlots, error: paidError } = await supabase
        .from('payments')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'received')

      if (paidError) {
        throw new Error(`Failed to fetch paid slots: ${paidError.message}`)
      }

      const paid = paidSlots?.length || 0

      return { paid, total }
    } catch (error) {
      console.error('Error getting group paid slots count:', error)
      return { paid: 0, total: 0 }
    }
  },

  // Check if a specific slot is paid
  async isSlotPaid(groupId: number, memberId: number): Promise<boolean> {
    try {
      // For now, we'll check if there's any payment for this member in this group
      // In the future, this could be enhanced to check specific month dates
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('group_id', groupId)
        .eq('member_id', memberId)
        .eq('status', 'received')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to check slot payment status: ${error.message}`)
      }

      return !!data
    } catch (error) {
      console.error('Error checking slot payment status:', error)
      return false
    }
  }
}
