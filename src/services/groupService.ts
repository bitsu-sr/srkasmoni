import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import type { Group, GroupFormData, GroupMember, GroupMemberFormData, GroupStatus, SignupGroupOption } from '../types/member'
import { paymentService } from './paymentService'

// Custom interfaces for database rows with new fields
interface GroupRow {
  id: number
  name: string
  description: string | null
  monthly_amount: number
  max_members: number
  max_members_per_slot?: number
  status: GroupStatus
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
  max_members_per_slot?: number
  status?: GroupStatus
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
  maxMembersPerSlot: row.max_members_per_slot ?? 2,
  status: row.status || 'closed',
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

  // Get the active, available groups and their non-full current/future months
  // for the public sign-up wizard.
  async getAvailableSignupGroups(): Promise<SignupGroupOption[]> {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        monthly_amount,
        duration,
        start_date,
        end_date,
        max_members_per_slot,
        group_members(assigned_month_date)
      `)
      .eq('status', 'available')
      .lte('start_date', currentMonth)
      .gte('end_date', currentMonth)
      .order('monthly_amount', { ascending: true })

    if (error) throw error

    return (data || []).flatMap((group: any) => {
      const monthCounts = new Map<string, number>()
      ;(group.group_members || []).forEach((slot: any) => {
        const month = String(slot.assigned_month_date)
        monthCounts.set(month, (monthCounts.get(month) || 0) + 1)
      })

      const availableMonths: string[] = []
      const [startYear, startMonth] = String(group.start_date).split('-').map(Number)
      const [endYear, endMonth] = String(group.end_date).split('-').map(Number)
      const maxPerSlot = group.max_members_per_slot ?? 2
      let year = startYear
      let month = startMonth

      while (year < endYear || (year === endYear && month <= endMonth)) {
        const value = `${year}-${String(month).padStart(2, '0')}`
        if (value >= currentMonth && (monthCounts.get(value) || 0) < maxPerSlot) {
          availableMonths.push(value)
        }
        month += 1
        if (month > 12) {
          month = 1
          year += 1
        }
      }

      if (availableMonths.length === 0) return []
      return [{
        id: group.id,
        name: group.name,
        monthlyAmount: Number(group.monthly_amount),
        duration: Number(group.duration),
        availableMonths
      }]
    })
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
      const insertPayload: Record<string, unknown> = {
        name: groupData.name,
        description: groupData.description,
        monthly_amount: groupData.monthlyAmount,
        max_members: groupData.maxMembers,
        status: groupData.status ?? 'available',
        duration: groupData.duration,
        start_date: groupData.startDate,
        end_date: groupData.endDate,
        payment_deadline_day: groupData.paymentDeadlineDay,
        late_fine_percentage: groupData.lateFinePercentage,
        late_fine_fixed_amount: groupData.lateFineFixedAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id
      }
      if (groupData.maxMembersPerSlot != null) {
        insertPayload.max_members_per_slot = groupData.maxMembersPerSlot
      }
      const { data, error } = await supabase
        .from('groups')
        .insert(insertPayload)
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
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.duration !== undefined) updateData.duration = updates.duration
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate
      if (updates.paymentDeadlineDay !== undefined) updateData.payment_deadline_day = updates.paymentDeadlineDay
      if (updates.lateFinePercentage !== undefined) updateData.late_fine_percentage = updates.lateFinePercentage
      if (updates.lateFineFixedAmount !== undefined) updateData.late_fine_fixed_amount = updates.lateFineFixedAmount
      if (updates.maxMembersPerSlot !== undefined) updateData.max_members_per_slot = updates.maxMembersPerSlot

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

  // Swap two members' assigned months. Member A takes member B's month and member B takes member A's month.
  async swapMemberPositions(slotIdA: number, slotIdB: number): Promise<void> {
    if (slotIdA === slotIdB) {
      throw new Error('Choose two different members to switch.')
    }

    const { data: rows, error: fetchError } = await supabase
      .from('group_members')
      .select('id, group_id, member_id, assigned_month_date')
      .in('id', [slotIdA, slotIdB])

    if (fetchError) throw new Error(fetchError.message || 'Could not load the selected slots.')
    if (!rows || rows.length !== 2) {
      throw new Error('Could not find both slots.')
    }

    const slotA = rows.find((row: { id: number }) => row.id === slotIdA)
    const slotB = rows.find((row: { id: number }) => row.id === slotIdB)
    if (!slotA || !slotB) {
      throw new Error('Could not find both slots.')
    }
    if (slotA.group_id !== slotB.group_id) {
      throw new Error('Both slots must belong to the same group.')
    }

    const monthA = String(slotA.assigned_month_date)
    const monthB = String(slotB.assigned_month_date)
    if (monthA === monthB) {
      throw new Error('These members are already assigned to the same month.')
    }
    if (slotA.member_id === slotB.member_id) {
      throw new Error('Choose slots that belong to two different members.')
    }

    const { data: existing, error: existingError } = await supabase
      .from('group_members')
      .select('id, member_id, assigned_month_date')
      .eq('group_id', slotA.group_id)
      .in('member_id', [slotA.member_id, slotB.member_id])
      .in('assigned_month_date', [monthA, monthB])

    if (existingError) throw new Error(existingError.message || 'Could not check existing slots.')

    const occupies = (memberId: number, month: string, ignoreId: number) =>
      (existing || []).some(
        (row: { id: number; member_id: number; assigned_month_date: string }) =>
          row.member_id === memberId && row.assigned_month_date === month && row.id !== ignoreId
      )

    if (occupies(slotA.member_id, monthB, slotA.id)) {
      throw new Error('The first member already has a slot in the other month.')
    }
    if (occupies(slotB.member_id, monthA, slotB.id)) {
      throw new Error('The second member already has a slot in the other month.')
    }

    const setMonth = async (id: number, month: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({ assigned_month_date: month })
        .eq('id', id)
      if (error) throw new Error(error.message || 'Failed to update the assigned month.')
    }

    // Park the first slot on a temporary month so a unique (group, month) constraint cannot block the swap.
    const tempMonth = '1900-01'
    try {
      await setMonth(slotA.id, tempMonth)
      try {
        await setMonth(slotB.id, monthA)
      } catch (error) {
        await setMonth(slotA.id, monthA)
        throw error
      }
      try {
        await setMonth(slotA.id, monthB)
      } catch (error) {
        await setMonth(slotB.id, monthB)
        await setMonth(slotA.id, monthA)
        throw error
      }
    } catch (error) {
      console.error('Error swapping member positions:', error)
      if (error instanceof Error) throw error
      throw new Error('Failed to switch positions.')
    }

    const movePayout = async (slotId: number, month: string) => {
      const { error } = await supabase
        .from('payouts')
        .update({ payout_month: month })
        .eq('slot_id', slotId)
      if (error) throw new Error(error.message || 'Failed to update payout month.')
    }

    try {
      await movePayout(slotA.id, monthB)
      await movePayout(slotB.id, monthA)
    } catch (error) {
      console.error('Positions swapped, but payout months could not be updated:', error)
      throw new Error('Members were switched, but their payout months could not be updated. Refresh and check the payout page.')
    }
  },

  // Get all months for a group with slot-sharing info (member count and names per month)
  async getAllGroupMonths(groupId: number): Promise<{
    month: string
    memberCount: number
    memberNames: string[]
    maxPerSlot: number
    isFull: boolean
    /** @deprecated Use memberCount > 0 or isFull */
    isReserved: boolean
    /** @deprecated Use memberNames.join(', ') */
    reservedBy?: string
  }[]> {
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

      const monthToMembers = new Map<string, string[]>()
      ;(assignedMonths || []).forEach((row: any) => {
        const month = row.assigned_month_date
        const memberName = row.member
          ? `${row.member.first_name || ''} ${row.member.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown'
        const list = monthToMembers.get(month) || []
        list.push(memberName)
        monthToMembers.set(month, list)
      })

      const maxPerSlot = group.maxMembersPerSlot ?? 2
      const allMonths: {
        month: string
        memberCount: number
        memberNames: string[]
        maxPerSlot: number
        isFull: boolean
        isReserved: boolean
        reservedBy?: string
      }[] = []

      if (group.startDate && group.endDate) {
        const [startYear, startMonth] = group.startDate.split('-').map(Number)
        const [endYear, endMonth] = group.endDate.split('-').map(Number)
        let currentYear = startYear
        let currentMonth = startMonth

        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
          const monthDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
          const memberNames = monthToMembers.get(monthDate) || []
          const memberCount = memberNames.length
          const isFull = memberCount >= maxPerSlot
          allMonths.push({
            month: monthDate,
            memberCount,
            memberNames,
            maxPerSlot,
            isFull,
            isReserved: memberCount > 0,
            reservedBy: memberNames.length > 0 ? memberNames.join(', ') : undefined
          })
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

  // Get months where another member can be added (slot not full)
  async getAvailableMonths(groupId: number): Promise<string[]> {
    try {
      const allMonths = await this.getAllGroupMonths(groupId)
      return allMonths.filter(m => !m.isFull).map(m => m.month)
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
          
          // Next recipient(s): all members with slot in current month (slot sharing)
          const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) // YYYY-MM format
          
          let nextRecipient = 'No recipient this month'
          
          try {
            const { data: slotMembers, error: memberError } = await supabase
              .from('group_members')
              .select('members(first_name, last_name)')
              .eq('group_id', group.id)
              .eq('assigned_month_date', currentMonth)

            if (!memberError && slotMembers && slotMembers.length > 0) {
              const names = slotMembers
                .map((row: any) => row.members ? `${row.members.first_name} ${row.members.last_name}` : '')
                .filter(Boolean)
              nextRecipient = names.join(', ')
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
