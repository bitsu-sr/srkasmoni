import { supabase } from '../lib/supabase'
import { Member, MemberFormData } from '../types/member'

// Transform database row to Member interface
const transformMemberRow = (row: any): Member => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  birthDate: row.birth_date,
  birthplace: row.birthplace,
  address: row.address,
  city: row.city,
  phone: row.phone,
  email: row.email,
  nationalId: row.national_id,
  nationality: row.nationality,
  occupation: row.occupation,
  bankName: row.bank_name,
  accountNumber: row.account_number,
  dateOfRegistration: row.date_of_registration,
  totalReceived: row.total_received || 0,
  lastPayment: row.last_payment || '',
  nextPayment: row.next_payment || '',
  status: row.status || 'pending',
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at
})

// Transform MemberFormData to database insert format
const transformMemberForInsert = (member: MemberFormData): any => ({
  first_name: member.firstName,
  last_name: member.lastName,
  birth_date: member.birthDate,
  birthplace: member.birthplace,
  address: member.address,
  city: member.city,
  phone: member.phone,
  email: member.email,
  national_id: member.nationalId,
  nationality: member.nationality,
  occupation: member.occupation,
  bank_name: member.bankName,
  account_number: member.accountNumber,
  date_of_registration: member.dateOfRegistration,
  total_received: member.totalReceived || 0,
  last_payment: member.lastPayment || null,
  next_payment: member.nextPayment || null,
  notes: member.notes || null
})

// Transform MemberFormData to database update format
const transformMemberForUpdate = (member: MemberFormData): any => ({
  first_name: member.firstName,
  last_name: member.lastName,
  birth_date: member.birthDate,
  birthplace: member.birthplace,
  address: member.address,
  city: member.city,
  phone: member.phone,
  email: member.email,
  national_id: member.nationalId,
  nationality: member.nationality,
  occupation: member.occupation,
  bank_name: member.bankName,
  account_number: member.accountNumber,
  date_of_registration: member.dateOfRegistration,
  total_received: member.totalReceived || 0,
  last_payment: member.lastPayment || null,
  next_payment: member.nextPayment || null,
  notes: member.notes || null
})

export const memberService = {
  async getAllMembers(): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ? data.map(transformMemberRow) : []
    } catch (error) {
      console.error('Error fetching members:', error)
      throw error
    }
  },

  async getMemberById(id: number): Promise<Member | null> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data ? transformMemberRow(data) : null
    } catch (error) {
      console.error('Error fetching member:', error)
      throw error
    }
  },

  async createMember(member: MemberFormData): Promise<Member> {
    try {
      const memberData = transformMemberForInsert(member)
      const { data, error } = await supabase
        .from('members')
        .insert(memberData)
        .select()
        .single()

      if (error) throw error
      return transformMemberRow(data)
    } catch (error) {
      console.error('Error creating member:', error)
      throw error
    }
  },

  async updateMember(id: number, member: MemberFormData): Promise<Member> {
    try {
      const memberData = transformMemberForUpdate(member)
      const { data, error } = await supabase
        .from('members')
        .update(memberData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return transformMemberRow(data)
    } catch (error) {
      console.error('Error updating member:', error)
      throw error
    }
  },

  async deleteMember(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting member:', error)
      throw error
    }
  },

  async searchMembers(query: string): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ? data.map(transformMemberRow) : []
    } catch (error) {
      console.error('Error searching members:', error)
      throw error
    }
  },

  async getMemberSlotsInfo(memberId: number): Promise<{
    totalSlots: number
    totalMonthlyAmount: number
    nextReceiveMonth: string | null
    isActive: boolean
  }> {
    try {
      // Get all slots for the member across all groups
      const { data: slotsData, error: slotsError } = await supabase
        .from('group_members')
        .select(`
          assigned_month_date,
          group:groups(monthly_amount)
        `)
        .eq('member_id', memberId)

      if (slotsError) throw slotsError

      if (!slotsData || slotsData.length === 0) {
        return {
          totalSlots: 0,
          totalMonthlyAmount: 0,
          nextReceiveMonth: null,
          isActive: false
        }
      }

      const totalSlots = slotsData.length
      const totalMonthlyAmount = slotsData.reduce((sum: number, slot: any) => {
        return sum + (slot.group?.monthly_amount || 0)
      }, 0)

      // Find the next receive month (closest future month)
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      
      const futureMonths = slotsData
        .map((slot: any) => slot.assigned_month_date)
        .filter((month: string) => month >= currentMonth)
        .sort()

      const nextReceiveMonth = futureMonths.length > 0 ? futureMonths[0] : null

      return {
        totalSlots,
        totalMonthlyAmount,
        nextReceiveMonth,
        isActive: totalSlots > 0
      }
    } catch (error) {
      console.error('Error fetching member slots info:', error)
      return {
        totalSlots: 0,
        totalMonthlyAmount: 0,
        nextReceiveMonth: null,
        isActive: false
      }
    }
  },

  async getMemberSlotsDetails(memberId: number): Promise<{
    id: number
    groupId: number
    groupName: string
    groupDescription: string | null
    monthlyAmount: number
    assignedMonthDate: string
    assignedMonthFormatted: string
    isFuture: boolean
  }[]> {
    try {
      // Get all slots for the member with detailed group information
      const { data: slotsData, error: slotsError } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          assigned_month_date,
          group:groups(
            name,
            description,
            monthly_amount
          )
        `)
        .eq('member_id', memberId)
        .order('assigned_month_date', { ascending: true })

      if (slotsError) throw slotsError

      if (!slotsData || slotsData.length === 0) {
        return []
      }

      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      return slotsData.map((slot: any) => {
        const monthDate = slot.assigned_month_date
        const isFuture = monthDate >= currentMonth
        
        // Format the month for display
        let assignedMonthFormatted = monthDate
        try {
          const [year, month] = monthDate.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1)
          assignedMonthFormatted = date.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })
        } catch (error) {
          // Keep original format if parsing fails
        }

        return {
          id: slot.id,
          groupId: slot.group_id,
          groupName: slot.group?.name || 'Unknown Group',
          groupDescription: slot.group?.description,
          monthlyAmount: slot.group?.monthly_amount || 0,
          assignedMonthDate: monthDate,
          assignedMonthFormatted,
          isFuture
        }
      })
    } catch (error) {
      console.error('Error fetching member slots details:', error)
      return []
    }
  },

  // Get total member count for dashboard
  async getTotalMemberCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error fetching member count:', error)
      return 0
    }
  },

  // Get recent member registrations for dashboard
  async getRecentMembers(limit: number = 3): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ? data.map(transformMemberRow) : []
    } catch (error) {
      console.error('Error fetching recent members:', error)
      return []
    }
  },

  // Get active member count for dashboard (members who have slots in groups)
  async getActiveMemberCount(): Promise<number> {
    try {
      console.log('🔍 Fetching active member count...')
      
      // Use the same logic as getMemberSlotsInfo - count distinct members who have slots
      // First get all member_ids from group_members
      const { data, error } = await supabase
        .from('group_members')
        .select('member_id')

      if (error) {
        console.error('❌ Error fetching active member count:', error)
        throw error
      }
      
      // Use Set to get unique member IDs
      const uniqueMemberIds = new Set(data?.map((row: { member_id: number }) => row.member_id) || [])
      const activeCount = uniqueMemberIds.size
      
      console.log('📊 Active member count data:', data)
      console.log('🔢 Unique member IDs:', Array.from(uniqueMemberIds))
      console.log('🔢 Active member count result:', activeCount)
      
      return activeCount
    } catch (error) {
      console.error('❌ Error in getActiveMemberCount:', error)
      return 0
    }
  }
}
