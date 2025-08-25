import { supabase } from '../lib/supabase'
import type { PaymentLog, PaymentLogFilters } from '../types/paymentLog'

export const paymentLogService = {
  // Get all payment logs with optional filters
  async getPaymentLogs(filters?: PaymentLogFilters): Promise<PaymentLog[]> {
    let query = supabase
      .from('payment_logs')
      .select(`
        *,
        member:members(first_name, last_name),
        group:groups(name),
        slot:payment_slots(month_date)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.search) {
      query = query.or(`member.first_name.ilike.%${filters.search}%,member.last_name.ilike.%${filters.search}%,group.name.ilike.%${filters.search}%`)
    }
    if (filters?.action) {
      query = query.eq('action', filters.action)
    }
    if (filters?.memberId) {
      query = query.eq('member_id', filters.memberId)
    }
    if (filters?.groupId) {
      query = query.eq('group_id', filters.groupId)
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }
    if (filters?.status) {
      query = query.or(`old_status.eq.${filters.status},new_status.eq.${filters.status}`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch payment logs: ${error.message}`)
    }

    // Transform the data to match frontend interface (snake_case to camelCase)
    const transformedLogs: PaymentLog[] = (data || []).map((log: any) => ({
      id: log.id,
      paymentId: log.payment_id,
      memberId: log.member_id,
      groupId: log.group_id,
      slotId: log.slot_id,
      action: log.action,
      oldStatus: log.old_status,
      newStatus: log.new_status,
      oldAmount: log.old_amount,
      newAmount: log.new_amount,
      oldPaymentMethod: log.old_payment_method,
      newPaymentMethod: log.new_payment_method,
      oldNotes: log.old_notes,
      newNotes: log.new_notes,
      oldPaymentDate: log.old_payment_date,
      newPaymentDate: log.new_payment_date,
      oldSenderBankId: log.old_sender_bank_id,
      newSenderBankId: log.new_sender_bank_id,
      oldReceiverBankId: log.old_receiver_bank_id,
      newReceiverBankId: log.new_receiver_bank_id,
      changesSummary: log.changes_summary,
      createdAt: log.created_at,
      // Transform joined data
      member: log.member ? {
        id: log.member.id,
        firstName: log.member.first_name,
        lastName: log.member.last_name
      } : undefined,
      group: log.group ? {
        id: log.group.id,
        name: log.group.name
      } : undefined,
      slot: log.slot ? {
        id: log.slot.id,
        monthDate: log.slot.month_date
      } : undefined,
      senderBank: undefined,
      receiverBank: undefined
    }))

    return transformedLogs
  },

  // Get payment logs for a specific member
  async getMemberPaymentLogs(memberId: number): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payment_logs')
      .select(`
        *,
        group:groups(name),
        slot:payment_slots(month_date)
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch member payment logs: ${error.message}`)
    }

    // Transform the data to match frontend interface
    const transformedLogs: PaymentLog[] = (data || []).map((log: any) => ({
      id: log.id,
      paymentId: log.payment_id,
      memberId: log.member_id,
      groupId: log.group_id,
      slotId: log.slot_id,
      action: log.action,
      oldStatus: log.old_status,
      newStatus: log.new_status,
      oldAmount: log.old_amount,
      newAmount: log.new_amount,
      oldPaymentMethod: log.old_payment_method,
      newPaymentMethod: log.new_payment_method,
      oldNotes: log.old_notes,
      newNotes: log.new_notes,
      oldPaymentDate: log.old_payment_date,
      newPaymentDate: log.new_payment_date,
      oldSenderBankId: log.old_sender_bank_id,
      newSenderBankId: log.new_sender_bank_id,
      oldReceiverBankId: log.old_receiver_bank_id,
      newReceiverBankId: log.new_receiver_bank_id,
      changesSummary: log.changes_summary,
      createdAt: log.created_at,
      member: undefined, // Not needed for member-specific logs
      group: log.group ? {
        id: log.group.id,
        name: log.group.name
      } : undefined,
      slot: log.slot ? {
        id: log.slot.id,
        monthDate: log.slot.month_date
      } : undefined,
      senderBank: undefined,
      receiverBank: undefined
    }))

    return transformedLogs
  },

  // Get payment logs for a specific user by email (for normal users)
  async getPaymentLogsByUserEmail(userEmail: string, filters?: PaymentLogFilters): Promise<PaymentLog[]> {
    try {
      // First, find the member record that corresponds to this user by email
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .eq('email', userEmail)
        .single()

      if (memberError || !memberData) {
        console.log('No member record found for user email:', userEmail)
        return []
      }

      const memberId = memberData.id

      // Now get payment logs for this member
      let query = supabase
        .from('payment_logs')
        .select(`
          *,
          member:members(first_name, last_name),
          group:groups(name),
          slot:payment_slots(month_date)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.search) {
        query = query.or(`member.first_name.ilike.%${filters.search}%,member.last_name.ilike.%${filters.search}%,group.name.ilike.%${filters.search}%`)
      }
      if (filters?.action) {
        query = query.eq('action', filters.action)
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }
      if (filters?.status) {
        query = query.or(`old_status.eq.${filters.status},new_status.eq.${filters.status}`)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch user payment logs: ${error.message}`)
      }

      // Transform the data to match frontend interface
      const transformedLogs: PaymentLog[] = (data || []).map((log: any) => ({
        id: log.id,
        paymentId: log.payment_id,
        memberId: log.member_id,
        groupId: log.group_id,
        slotId: log.slot_id,
        action: log.action,
        oldStatus: log.old_status,
        newStatus: log.new_status,
        oldAmount: log.old_amount,
        newAmount: log.new_amount,
        oldPaymentMethod: log.old_payment_method,
        newPaymentMethod: log.new_payment_method,
        oldNotes: log.old_notes,
        newNotes: log.new_notes,
        oldPaymentDate: log.old_payment_date,
        newPaymentDate: log.new_payment_date,
        oldSenderBankId: log.old_sender_bank_id,
        newSenderBankId: log.new_sender_bank_id,
        oldReceiverBankId: log.old_receiver_bank_id,
        newReceiverBankId: log.new_receiver_bank_id,
        changesSummary: log.changes_summary,
        createdAt: log.created_at,
        member: log.member ? {
          id: log.member.id,
          firstName: log.member.first_name,
          lastName: log.member.last_name
        } : undefined,
        group: log.group ? {
          id: log.group.id,
          name: log.group.name
        } : undefined,
        slot: log.slot ? {
          id: log.slot.id,
          monthDate: log.slot.month_date
        } : undefined,
        senderBank: undefined,
        receiverBank: undefined
      }))

      return transformedLogs
    } catch (error) {
      console.error('Error fetching user payment logs:', error)
      throw error
    }
  },

  // Get payment logs for a specific group
  async getGroupPaymentLogs(groupId: number): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payment_logs')
      .select(`
        *,
        member:members(first_name, last_name),
        slot:payment_slots(month_date)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch group payment logs: ${error.message}`)
    }

    // Transform the data to match frontend interface
    const transformedLogs: PaymentLog[] = (data || []).map((log: any) => ({
      id: log.id,
      paymentId: log.payment_id,
      memberId: log.member_id,
      groupId: log.group_id,
      slotId: log.slot_id,
      action: log.action,
      oldStatus: log.old_status,
      newStatus: log.new_status,
      oldAmount: log.old_amount,
      newAmount: log.new_amount,
      oldPaymentMethod: log.old_payment_method,
      newPaymentMethod: log.new_payment_method,
      oldNotes: log.old_notes,
      newNotes: log.new_notes,
      oldPaymentDate: log.old_payment_date,
      newPaymentDate: log.new_payment_date,
      oldSenderBankId: log.old_sender_bank_id,
      newSenderBankId: log.new_sender_bank_id,
      oldReceiverBankId: log.old_receiver_bank_id,
      newReceiverBankId: log.new_receiver_bank_id,
      changesSummary: log.changes_summary,
      createdAt: log.created_at,
      member: log.member ? {
        id: log.member.id,
        firstName: log.member.first_name,
        lastName: log.member.last_name
      } : undefined,
      group: undefined, // Not needed for group-specific logs
      slot: log.slot ? {
        id: log.slot.id,
        monthDate: log.slot.month_date
      } : undefined,
      senderBank: undefined,
      receiverBank: undefined
    }))

    return transformedLogs
  },

  // Get recent payment logs for dashboard
  async getRecentPaymentLogs(limit: number = 10): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payment_logs')
      .select(`
        *,
        member:members(first_name, last_name),
        group:groups(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch recent payment logs: ${error.message}`)
    }

    // Transform the data to match frontend interface
    const transformedLogs: PaymentLog[] = (data || []).map((log: any) => ({
      id: log.id,
      paymentId: log.payment_id,
      memberId: log.member_id,
      groupId: log.group_id,
      slotId: log.slot_id,
      action: log.action,
      oldStatus: log.old_status,
      newStatus: log.new_status,
      oldAmount: log.old_amount,
      newAmount: log.new_amount,
      oldPaymentMethod: log.old_payment_method,
      newPaymentMethod: log.new_payment_method,
      oldNotes: log.old_notes,
      newNotes: log.new_notes,
      oldPaymentDate: log.old_payment_date,
      newPaymentDate: log.new_payment_date,
      oldSenderBankId: log.old_sender_bank_id,
      newSenderBankId: log.new_sender_bank_id,
      oldReceiverBankId: log.old_receiver_bank_id,
      newReceiverBankId: log.new_receiver_bank_id,
      changesSummary: log.changes_summary,
      createdAt: log.created_at,
      member: log.member ? {
        id: log.member.id,
        firstName: log.member.first_name,
        lastName: log.member.last_name
      } : undefined,
      group: log.group ? {
        id: log.group.id,
        name: log.group.name
      } : undefined,
      slot: undefined,
      senderBank: undefined,
      receiverBank: undefined
    }))

    return transformedLogs
  },

  // Get payment log statistics
  async getPaymentLogStats(): Promise<{
    totalLogs: number
    updates: number
    deletions: number
    todayLogs: number
  }> {
    // Get payment log counts
    const { data: logsData, error: logsError } = await supabase
      .from('payment_logs')
      .select('action, created_at')

    if (logsError) {
      throw new Error(`Failed to fetch payment log stats: ${logsError.message}`)
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Count logs by action type
    let updates = 0
    let deletions = 0
    let todayLogs = 0

    logsData?.forEach((log: any) => {
      const logDate = new Date(log.created_at)
      
      // Count by action
      if (log.action === 'updated') {
        updates++
      } else if (log.action === 'deleted') {
        deletions++
      }
      
      // Count today's logs
      if (logDate >= today) {
        todayLogs++
      }
    })

    return {
      totalLogs: logsData?.length || 0,
      updates,
      deletions,
      todayLogs
    }
  }
}
