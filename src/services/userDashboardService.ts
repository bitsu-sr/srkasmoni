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
  }[]
  recentPayments: any[]
}

export const userDashboardService = {
  async getUserDashboardData(): Promise<UserDashboardData> {
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
        console.log('No member record found for user email:', currentUser.email)
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
          recentPayments: []
        }
      }

      const memberId = memberData.id

      // Get user's slots across all groups
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
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Transform slots data
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

        return {
          id: slot.id,
          groupId: slot.group_id,
          groupName: slot.group.name,
          groupDescription: slot.group.description,
          monthlyAmount: slot.group.monthly_amount,
          assignedMonthDate: monthDate,
          assignedMonthFormatted,
          isFuture,
          isCurrentMonth,
          isPast
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
      const activeGroups = new Set(userSlots.map((slot: any) => slot.groupId)).size

      // Get user's recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
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

      return {
        stats: {
          totalSlots,
          totalMonthlyAmount,
          nextReceiveMonth,
          totalReceived,
          totalExpected,
          activeGroups
        },
        userSlots,
        recentPayments
      }
    } catch (error) {
      console.error('Error fetching user dashboard data:', error)
      throw error
    }
  }
}
