import { supabase } from '../lib/supabase'

export interface UserDashboardData {
  stats: {
    totalSlots: number
    totalMonthlyAmount: number
    nextReceiveMonth: string | null
    totalReceived: number
    totalExpected: number
    activeGroups: number
  }
  userSlots: {
    id: number
    groupId: number
    groupName: string
    groupDescription: string | null
    monthlyAmount: number
    assignedMonthDate: string
    assignedMonthFormatted: string
    isFuture: boolean
    isCurrentMonth: boolean
    isPast: boolean
    paymentStatus: 'paid' | 'pending' | 'settled' | 'not_paid'
  }[]
  recentPayments: any[]
  groups: {
    id: number
    name: string
    description: string
    monthlyAmount: number
    startDate: string
    endDate: string
    slotsPaid: number
    slotsTotal: number
    created_at: string
  }[]
}

export const userDashboardService = {
  async getUserDashboardData(selectedMonth?: string): Promise<UserDashboardData> {
    try {
      // First, get the current user's email from auth
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        throw new Error('Could not get current user information')
      }

      // Find the member record that corresponds to this user by email
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .eq('email', currentUser.email)
        .single()

      if (memberError || !memberData) {
        // If no member found, return empty data
        return {
          stats: {
            totalSlots: 0,
            totalMonthlyAmount: 0,
            nextReceiveMonth: null,
            totalReceived: 0,
            totalExpected: 0,
            activeGroups: 0
          },
          userSlots: [],
          recentPayments: [],
          groups: []
        }
      }

      const memberId = memberData.id

      // Get user's slots across all groups (using group_members to get ALL slots)
      const { data: slotsData, error: slotsError } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          assigned_month_date,
          group:groups(
            id,
            name,
            description,
            monthly_amount
          )
        `)
        .eq('member_id', memberId)
        .order('assigned_month_date', { ascending: true })

      if (slotsError) throw slotsError

      const now = new Date()
      const currentMonth = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Use the exact same logic as PaymentsDue to check payment status
      // First, get all payment_slots that match the criteria
      const { data: paymentSlots, error: slotError } = await supabase
        .from('payment_slots')
        .select('id, group_id, member_id, month_date')
        .eq('member_id', memberId)

      if (slotError) throw slotError

      // Get the slot IDs that have payments
      const slotIds = paymentSlots?.map((slot: any) => slot.id) || []
      
      // Check which of these slots have payments
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('slot_id, status')
        .in('slot_id', slotIds)

      if (paymentError) throw paymentError

      // Create a set of slots that have payments (EXACT same logic as PaymentsDue)
      const slotsWithPayments = new Set<string>()
      const paidSlotIds = new Set(payments?.map((p: any) => p.slot_id) || [])
      
      paymentSlots?.forEach((slot: any) => {
        if (paidSlotIds.has(slot.id)) {
          const slotKey = `${slot.group_id}-${slot.member_id}-${slot.month_date}`
          slotsWithPayments.add(slotKey)
        }
      })

      // Transform slots data with payment status
      const userSlots = (slotsData || []).map((slot: any) => {
        const monthDate = slot.assigned_month_date
        const isFuture = monthDate >= currentMonth
        const isCurrentMonth = monthDate === currentMonth
        const isPast = monthDate < currentMonth

        // Format month for display
        const [year, month] = monthDate.split('-').map(Number)
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
        const assignedMonthFormatted = `${monthNames[month - 1]} ${year}`

        // Check payment status using the EXACT same logic as PaymentsDue
        const slotKey = `${slot.group_id}-${memberId}-${monthDate}`
        const hasPayment = slotsWithPayments.has(slotKey)
        
        // Determine detailed payment status based on actual payment status
        let paymentStatus: 'paid' | 'pending' | 'settled' | 'not_paid' = 'not_paid'
        
        if (hasPayment) {
          // Find the payment_slot that matches this group/member/month
          const matchingPaymentSlot = paymentSlots?.find((ps: any) => 
            ps.group_id === slot.group_id && 
            ps.member_id === memberId && 
            ps.month_date === monthDate
          )
          
          if (matchingPaymentSlot) {
            // Find the payment to get its status
            const payment = payments?.find((p: any) => p.slot_id === matchingPaymentSlot.id)
            
            if (payment) {
              switch (payment.status) {
                case 'received':
                  paymentStatus = 'paid'
                  break
                case 'pending':
                  paymentStatus = 'pending'
                  break
                case 'settled':
                  paymentStatus = 'settled'
                  break
                default:
                  paymentStatus = 'not_paid'
              }
            }
          }
        }

        return {
          id: slot.id,
          groupId: slot.group_id,
          groupName: slot.group.name,
          groupDescription: slot.group.description,
          monthlyAmount: slot.group.monthly_amount, // Use amount from groups table
          assignedMonthDate: monthDate,
          assignedMonthFormatted,
          isFuture,
          isCurrentMonth,
          isPast,
          paymentStatus
        }
      })

      // Sort slots: upcoming first, then current month, then past
      userSlots.sort((a: any, b: any) => {
        // First priority: upcoming slots (future months)
        if (a.isFuture && !b.isFuture) return -1
        if (!a.isFuture && b.isFuture) return 1
        
        // Second priority: current month
        if (a.isCurrentMonth && !b.isCurrentMonth) return -1
        if (!a.isCurrentMonth && b.isCurrentMonth) return 1
        
        // Third priority: past slots (completed months)
        if (a.isPast && !b.isPast) return -1
        if (!a.isPast && b.isPast) return 1
        
        // Within each category, sort by date (earliest first for future, latest first for past)
        if (a.isFuture) {
          return a.assignedMonthDate.localeCompare(b.assignedMonthDate)
        } else if (a.isPast) {
          return b.assignedMonthDate.localeCompare(a.assignedMonthDate) // Reverse for past
        }
        
        return 0
      })

      // Calculate stats
      const totalSlots = userSlots.length
      const totalMonthlyAmount = userSlots.reduce((sum: number, slot: any) => sum + slot.monthlyAmount, 0)
      const nextReceiveMonth = userSlots.find((slot: any) => slot.isFuture)?.assignedMonthFormatted || null
      const activeGroupsCount = new Set(userSlots.map((slot: any) => slot.groupId)).size

      // Get user's recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          payment_month,
          created_at,
          group:groups(name)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (paymentsError) throw paymentsError

      const recentPayments = paymentsData || []

      // Calculate total received and expected
      const totalReceived = recentPayments
        .filter((payment: any) => payment.status === 'completed')
        .reduce((sum: number, payment: any) => sum + payment.amount, 0)

      const totalExpected = totalSlots * totalMonthlyAmount

      // Get all groups with slots progress (same logic as main dashboard)
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          monthly_amount,
          start_date,
          end_date,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      // Filter out inactive groups (groups past their end date or before their start date)
      const activeGroups = (groupsData || []).filter((group: any) => {
        // Check if group has started (start date check)
        if (group.start_date) {
          const startMonth = group.start_date.substring(0, 7) // Extract YYYY-MM format
          if (currentMonth < startMonth) {
            return false // Group hasn't started yet
          }
        }
        
        // Check if group has ended (end date check)
        if (group.end_date) {
          const endMonth = group.end_date.substring(0, 7) // Extract YYYY-MM format
          
          // Group is active if selected month is before or equal to end month
          return currentMonth <= endMonth
        }
        
        // Groups without end date are considered active (if they've started)
        return true
      })

      // Get all group members to calculate slots progress
      const { data: allGroupMembers, error: membersError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          member_id
        `)

      if (membersError) throw membersError

      // Get all payments to calculate paid slots
      let { data: allPayments, error: allPaymentsError } = await supabase
        .from('payments')
        .select(`
          group_id,
          member_id,
          slot_id,
          status
        `)
        .in('status', ['received', 'settled'])

      if (allPaymentsError) {
        console.warn(`Warning: Could not fetch all payments with status 'received' or 'settled': ${allPaymentsError.message}`)
        // Return empty array instead of throwing error
        allPayments = []
      }

      // Calculate slots progress for each group (same logic as main dashboard)
      const groups = activeGroups.map((group: any) => {
        const groupMembers = allGroupMembers?.filter((member: any) => member.group_id === group.id) || []
        const slotsTotal = groupMembers.length
        
        // Count paid slots for this group
        let slotsPaid = 0
        if (allPayments && groupMembers.length > 0) {
          const groupPayments = allPayments.filter((payment: any) => payment.group_id === group.id)
          const paidSlots = new Set()
          
          groupPayments.forEach((payment: any) => {
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
          monthlyAmount: group.monthly_amount,
          startDate: group.start_date,
          endDate: group.end_date,
          slotsPaid,
          slotsTotal,
          created_at: group.created_at
        }
      })

      return {
        stats: {
          totalSlots,
          totalMonthlyAmount,
          nextReceiveMonth,
          totalReceived,
          totalExpected,
          activeGroups: activeGroupsCount
        },
        userSlots,
        recentPayments,
        groups
      }
    } catch (error) {
      console.error('Error fetching user dashboard data:', error)
      throw error
    }
  }
}
