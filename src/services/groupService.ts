import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import type { Group, GroupFormData, GroupMember, GroupMemberFormData } from '../types/member'

type GroupRow = Database['public']['Tables']['groups']['Row']
type GroupUpdate = Database['public']['Tables']['groups']['Update']
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
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

// Transform database row to GroupMember interface
const transformGroupMemberRow = (row: GroupMemberRow): GroupMember => ({
  id: row.id,
  groupId: row.group_id,
  memberId: row.member_id,
  assignedMonthDate: row.assigned_month, // Use old field name until database migration is complete
  member: {} as any, // Will be populated when joining with members table
  createdAt: row.created_at
})

export const groupService = {
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
        .order('assigned_month', { ascending: true }) // Use old field name for now

      if (error) throw error
      return data.map((row: any) => ({
        ...transformGroupMemberRow(row),
        member: row.member as any
      }))
    } catch (error) {
      console.error('Error fetching group members:', error)
      throw error
    }
  },

  // Add member to group
  async addMemberToGroup(groupId: number, memberData: GroupMemberFormData): Promise<GroupMember> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          member_id: memberData.memberId,
          assigned_month: memberData.assignedMonthDate // Use old field name for now
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

  // Remove member from group
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

  // Get available months for a group
  async getAvailableMonths(groupId: number): Promise<string[]> {
    try {
      const group = await this.getGroupById(groupId)
      if (!group) throw new Error('Group not found')

      const { data: assignedMonths, error } = await supabase
        .from('group_members')
        .select('assigned_month') // Use old field name for now
        .eq('group_id', groupId)

      if (error) throw error

      const usedMonths = new Set(assignedMonths.map((row: any) => row.assigned_month))
      const availableMonths: string[] = []

      if (group.startDate && group.endDate) {
        const startDate = new Date(group.startDate + '-01')
        const endDate = new Date(group.endDate + '-01')
        let currentDate = new Date(startDate)
        
        while (currentDate <= endDate) {
          const year = currentDate.getFullYear()
          const month = String(currentDate.getMonth() + 1).padStart(2, '0')
          const monthDate = `${year}-${month}`
          
          // Convert month number to month date string for comparison
          const monthNumber = currentDate.getMonth() + 1
          if (!usedMonths.has(monthNumber)) {
            availableMonths.push(monthDate)
          }
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      }

      return availableMonths
    } catch (error) {
      console.error('Error getting available months:', error)
      throw error
    }
  }
}
