import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import type { Group, GroupFormData, GroupMember, GroupMemberFormData } from '../types/member'
import { paymentService } from './paymentService'

// Custom interfaces for database rows with new fields
interface GroupRow {
  id: number
  name: string
  description: string | null
  monthly_amount: number
  max_members: number
  duration: number
  start_date: string
  end_date: string
  payment_deadline_day: number
  late_fine_percentage: number
  late_fine_fixed_amount: number
  created_at: string
  updated_at: string
}

interface GroupUpdate {
  id?: number
  name?: string
  description?: string | null
  monthly_amount?: number
  max_members?: number
  duration?: number
  start_date?: string
  end_date?: string
  payment_deadline_day?: number
  late_fine_percentage?: number
  late_fine_fixed_amount?: number
  created_at?: string
  updated_at?: string
}

type GroupMemberRow = Database['public']['Tables']['group_members']['Row']

// Transform database row to Group interface
const transformGroupRow = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  description: row.description,
  monthlyAmount: row.monthly_amount,
  maxMembers: row.max_members,
  duration: row.duration,
  startDate: row.start_date,
  endDate: row.end_date,
  paymentDeadlineDay: row.payment_deadline_day || 25,
  lateFinePercentage: row.late_fine_percentage || 5.00,
  lateFineFixedAmount: row.late_fine_fixed_amount || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

// Transform database row to GroupMember interface
const transformGroupMemberRow = (row: GroupMemberRow): GroupMember => ({
  id: row.id,
  groupId: row.group_id,
  memberId: row.member_id,
  assignedMonthDate: row.assigned_month_date, // Use new field name
  member: {} as any, // Will be populated when joining with members table
  createdAt: row.created_at
})

// Transform member data from snake_case to camelCase
const transformMemberData = (memberRow: any): any => {
  if (!memberRow) return {}
  
  return {
    id: memberRow.id,
    firstName: memberRow.first_name,
    lastName: memberRow.last_name,
    birthDate: memberRow.birth_date,
    birthplace: memberRow.birthplace,
    address: memberRow.address,
    city: memberRow.city,
    phone: memberRow.phone,
    email: memberRow.email,
    nationalId: memberRow.national_id,
    nationality: memberRow.nationality,
    occupation: memberRow.occupation,
    bankName: memberRow.bank_name,
    accountNumber: memberRow.account_number,
    dateOfRegistration: memberRow.date_of_registration,
    totalReceived: memberRow.total_received,
    lastPayment: memberRow.last_payment,
    nextPayment: memberRow.next_payment,
    notes: memberRow.notes,
    createdAt: memberRow.created_at,
    updatedAt: memberRow.updated_at
  }
}

export const groupService = {
  // Get all groups with their members in parallel
  async getAllGroupsWithMembers(): Promise<{ group: Group; members: any[] }[]> {
    try {
      // Get all groups first
      const groups = await this.getAllGroups()
      
      // Get all group members in parallel
      const memberPromises = groups.map(async (group) => {
        const members = await this.getGroupMembers(group.id)
        return { group, members }
      })
      
      const groupsWithMembers = await Promise.all(memberPromises)

      return groupsWithMembers
    } catch (error) {
      console.error('Error in getAllGroupsWithMembers:', error)
      throw error
    }
  },

  // Get all groups
  async getAllGroups(): Promise<Group[]> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data.map(transformGroupRow)
    } catch (error) {
      console.error('Error fetching groups:', error)
      throw error
    }
  },

  // Get group by ID
  async getGroupById(id: number): Promise<Group | null> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data ? transformGroupRow(data) : null
    } catch (error) {
      console.error('Error fetching group:', error)
      throw error
    }
  },

  // Create new group
  async createGroup(groupData: GroupFormData): Promise<Group> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          monthly_amount: groupData.monthlyAmount,
          max_members: groupData.maxMembers,
          duration: groupData.duration,
          start_date: groupData.startDate,
          end_date: groupData.endDate,
          payment_deadline_day: groupData.paymentDeadlineDay,
          late_fine_percentage: groupData.lateFinePercentage,
          late_fine_fixed_amount: groupData.lateFineFixedAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return transformGroupRow(data)
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  },

  // Update group
  async updateGroup(id: number, updates: Partial<Group>): Promise<Group> {
    try {
      const updateData: Partial<GroupUpdate> = {}
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.monthlyAmount !== undefined) updateData.monthly_amount = updates.monthlyAmount
      if (updates.maxMembers !== undefined) updateData.max_members = updates.maxMembers
      if (updates.duration !== undefined) updateData.duration = updates.duration
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate
      if (updates.paymentDeadlineDay !== undefined) updateData.payment_deadline_day = updates.paymentDeadlineDay
      if (updates.lateFinePercentage !== undefined) updateData.late_fine_percentage = updates.lateFinePercentage
      if (updates.lateFineFixedAmount !== undefined) updateData.late_fine_fixed_amount = updates.lateFineFixedAmount
      
      updateData.updated_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return transformGroupRow(data)
    } catch (error) {
      console.error('Error updating group:', error)
      throw error
    }
  },

  // Delete group
  async deleteGroup(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  },

  // Get group members
  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          member:members(*)
        `)
        .eq('group_id', groupId)
        .order('assigned_month_date', { ascending: true }) // Use new field name

      if (error) throw error
      
      return data.map((row: any) => {
        // Transform the group member row
        const transformedRow = transformGroupMemberRow(row)
        
        // Ensure member data is properly structured and transformed
        if (row.member && Array.isArray(row.member) && row.member.length > 0) {
          transformedRow.member = transformMemberData(row.member[0]) // Transform the member data
        } else if (row.member) {
          transformedRow.member = transformMemberData(row.member) // Transform the member data
        } else {
          console.warn(`No member data found for group member ${row.id}`)
          transformedRow.member = {} as any
        }
        
        return transformedRow
      })
    } catch (error) {
      console.error('Error fetching group members:', error)
      throw error
    }
  },

  // Add member to group
  async addMemberToGroup(groupId: number, memberData: GroupMemberFormData): Promise<GroupMember> {
    try {
      // Use the assignedMonthDate directly as it's already in YYYY-MM format
      const assignedMonthDate = memberData.assignedMonthDate



      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          member_id: memberData.memberId,
          assigned_month_date: assignedMonthDate
        })
        .select()
        .single()

      if (error) throw error
      return transformGroupMemberRow(data)
    } catch (error) {
      console.error('Error adding member to group:', error)
      throw error
    }
  },

  // Remove member from group (removes all slots for the member in this group)
  async removeMemberFromGroup(groupId: number, memberId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('member_id', memberId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing member from group:', error)
      throw error
    }
  },

  // Remove a specific slot (month) for a member in a group
  async removeMemberSlot(groupId: number, memberId: number, monthDate: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('member_id', memberId)
        .eq('assigned_month_date', monthDate)

      if (error) throw error
    } catch (error) {
      console.error('Error removing member slot:', error)
      throw error
    }
  },

  // Get all months for a group (both available and reserved)
  async getAllGroupMonths(groupId: number): Promise<{ month: string; isReserved: boolean; reservedBy?: string }[]> {
    try {
      const group = await this.getGroupById(groupId)
      if (!group) throw new Error('Group not found')

      const { data: assignedMonths, error } = await supabase
        .from('group_members')
        .select(`
          assigned_month_date,
          member:members(first_name, last_name)
        `)
        .eq('group_id', groupId)

      if (error) throw error

      const reservedMonths = new Map<string, string>()
      assignedMonths.forEach((row: any) => {
        const month = row.assigned_month_date
        const memberName = row.member ? `${row.member.first_name} ${row.member.last_name}` : 'Unknown'
        reservedMonths.set(month, memberName)
      })

      const allMonths: { month: string; isReserved: boolean; reservedBy?: string }[] = []

      if (group.startDate && group.endDate) {
        // Parse start and end dates
        const [startYear, startMonth] = group.startDate.split('-').map(Number)
        const [endYear, endMonth] = group.endDate.split('-').map(Number)
        
        let currentYear = startYear
        let currentMonth = startMonth
        
        // Generate all months from start to end
        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
          const monthDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
          const isReserved = reservedMonths.has(monthDate)
          const reservedBy = reservedMonths.get(monthDate)
          
          allMonths.push({
            month: monthDate,
            isReserved,
            reservedBy
          })
          
          // Move to next month
          currentMonth++
          if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
          }
        }
      }

      return allMonths
    } catch (error) {
      console.error('Error getting all group months:', error)
      throw error
    }
  },

  // Get available months for a group (only unreserved months)
  async getAvailableMonths(groupId: number): Promise<string[]> {
    try {
      const allMonths = await this.getAllGroupMonths(groupId)
      return allMonths.filter(m => !m.isReserved).map(m => m.month)
    } catch (error) {
      console.error('Error getting available months:', error)
      throw error
    }
  },

  // Get active groups count for dashboard
  async getActiveGroupsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error fetching active groups count:', error)
      return 0
    }
  },

  // Get recent groups for dashboard
  async getRecentGroups(limit: number = 3): Promise<Group[]> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ? data.map(transformGroupRow) : []
    } catch (error) {
      console.error('Error fetching recent groups:', error)
      return []
    }
  },

  // Get dashboard groups with next recipient info
  async getDashboardGroups(): Promise<Array<Group & { nextRecipient?: string; slotsPaid: number; slotsTotal: number }>> {
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      if (!groups || groups.length === 0) return []

      const dashboardGroups = []

      for (const group of groups) {
        try {
          // Get slots info
          const slotsInfo = await paymentService.getGroupPaidSlotsCount(group.id)
          
          // Get next recipient (member with slot in current month)
          const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) // YYYY-MM format
          
          let nextRecipient = 'No recipient this month'
          
          try {
            // First get the group member record
            const { data: groupMemberData, error: memberError } = await supabase
              .from('group_members')
              .select('member_id')
              .eq('group_id', group.id)
              .eq('assigned_month_date', currentMonth)
              .limit(1)
              .single()

            if (!memberError && groupMemberData?.member_id) {
              // Then get the member details
              const { data: memberData, error: memberDetailsError } = await supabase
                .from('members')
                .select('first_name, last_name')
                .eq('id', groupMemberData.member_id)
                .single()
              
              if (!memberDetailsError && memberData) {
                nextRecipient = `${memberData.first_name} ${memberData.last_name}`
              }
            }
          } catch (error) {
            console.warn(`Error getting next recipient for group ${group.id}:`, error)
            nextRecipient = 'Error loading data'
          }

          dashboardGroups.push({
            ...transformGroupRow(group),
            nextRecipient,
            slotsPaid: slotsInfo.paid,
            slotsTotal: slotsInfo.total
          })
        } catch (error) {
          console.error(`Error getting dashboard info for group ${group.id}:`, error)
          dashboardGroups.push({
            ...transformGroupRow(group),
            nextRecipient: 'Error loading data',
            slotsPaid: 0,
            slotsTotal: 0
          })
        }
      }

      return dashboardGroups
    } catch (error) {
      console.error('Error fetching dashboard groups:', error)
      return []
    }
  }
}
