import { supabase } from '../lib/supabase'

export interface MemberInactivityResult {
  inactiveMembers: number
  processedGroups: number
  errors: string[]
}

export const memberInactivityService = {
  /**
   * Mark members as inactive if they are not part of any active groups
   * This should be called when groups become inactive
   */
  async markInactiveMembers(): Promise<MemberInactivityResult> {
    try {
      const result: MemberInactivityResult = {
        inactiveMembers: 0,
        processedGroups: 0,
        errors: []
      }

      // Get current month for filtering
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7)

      // Get all groups and their end dates
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, end_date, name')

      if (groupsError) {
        result.errors.push(`Error fetching groups: ${groupsError.message}`)
        return result
      }

      if (!groups || groups.length === 0) {
        return result
      }

      // Find inactive groups (groups past their end date)
      const inactiveGroups = groups.filter((group: any) => {
        if (!group.end_date) {
          return false // Groups without end date are considered active
        }
        
        const endMonth = group.end_date.substring(0, 7) // Extract YYYY-MM format
        return currentMonth > endMonth
      })

      result.processedGroups = inactiveGroups.length

      if (inactiveGroups.length === 0) {
        return result
      }

      // Get all members from inactive groups
      const inactiveGroupIds = inactiveGroups.map((group: any) => group.id)
      
      const { data: inactiveGroupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('member_id')
        .in('group_id', inactiveGroupIds)

      if (membersError) {
        result.errors.push(`Error fetching group members: ${membersError.message}`)
        return result
      }

      if (!inactiveGroupMembers || inactiveGroupMembers.length === 0) {
        return result
      }

      // Get unique member IDs from inactive groups
      const inactiveMemberIds = [...new Set(inactiveGroupMembers.map((gm: any) => gm.member_id))]

      // For each member from inactive groups, check if they're in any active groups
      for (const memberId of inactiveMemberIds) {
        try {
          // Check if member is in any active groups
          const { data: activeGroupMemberships, error: activeMembershipError } = await supabase
            .from('group_members')
            .select(`
              group_id,
              groups!inner(id, end_date)
            `)
            .eq('member_id', memberId)

          if (activeMembershipError) {
            result.errors.push(`Error checking active memberships for member ${memberId}: ${activeMembershipError.message}`)
            continue
          }

          // Filter to only active groups (groups not past their end date)
          const activeMemberships = activeGroupMemberships?.filter((membership: any) => {
            const group = membership.groups
            if (!group || !group.end_date) {
              return true // Groups without end date are considered active
            }
            
            const endMonth = group.end_date.substring(0, 7)
            return currentMonth <= endMonth
          }) || []

          // If member has no active group memberships, mark as inactive
          if (activeMemberships.length === 0) {
            const { error: updateError } = await supabase
              .from('members')
              .update({ 
                status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('id', memberId)

            if (updateError) {
              result.errors.push(`Error marking member ${memberId} as inactive: ${updateError.message}`)
            } else {
              result.inactiveMembers++
            }
          }
        } catch (error) {
          result.errors.push(`Error processing member ${memberId}: ${error}`)
        }
      }

      return result
    } catch (error) {
      return {
        inactiveMembers: 0,
        processedGroups: 0,
        errors: [`General error: ${error}`]
      }
    }
  },

  /**
   * Get inactive members count for dashboard stats
   */
  async getInactiveMembersCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive')

      if (error) {
        console.error('Error getting inactive members count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting inactive members count:', error)
      return 0
    }
  },

  /**
   * Get active members count for dashboard stats
   */
  async getActiveMembersCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (error) {
        console.error('Error getting active members count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting active members count:', error)
      return 0
    }
  },

  /**
   * Get total members count (active + inactive)
   */
  async getTotalMembersCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Error getting total members count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting total members count:', error)
      return 0
    }
  },

  /**
   * Get active group IDs for a given month
   * A group is considered active if it has started and hasn't ended for the selected month
   */
  async getActiveGroupIdsForMonth(selectedMonth: string): Promise<number[]> {
    try {
      // Get all groups to determine which ones are active for the selected month
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, start_date, end_date')
      
      if (groupsError) {
        console.error('Error fetching groups:', groupsError)
        return []
      }
      
      // Determine which groups are active for the selected month
      const activeGroupIds: number[] = []
      groupsData?.forEach((group: any) => {
        let isActive = true
        
        // Check if group has started
        if (group.start_date) {
          const startMonth = group.start_date.substring(0, 7)
          if (selectedMonth < startMonth) {
            isActive = false
          }
        }
        
        // Check if group has ended
        if (isActive && group.end_date) {
          const endMonth = group.end_date.substring(0, 7)
          if (selectedMonth > endMonth) {
            isActive = false
          }
        }
        
        if (isActive) {
          activeGroupIds.push(group.id)
        }
      })
      
      return activeGroupIds
    } catch (error) {
      console.error('Error getting active group IDs for month:', error)
      return []
    }
  },

  /**
   * Get active member IDs for a given month
   * A member is considered active if they are in groups that are active for the selected month
   */
  async getActiveMemberIdsForMonth(selectedMonth: string): Promise<number[]> {
    try {
      // First, get all groups to determine which ones are active for the selected month
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, start_date, end_date')
      
      if (groupsError) {
        console.error('Error fetching groups:', groupsError)
        return []
      }
      
      // Determine which groups are active for the selected month
      const activeGroupIds = new Set<number>()
      groupsData?.forEach((group: any) => {
        let isActive = true
        
        // Check if group has started
        if (group.start_date) {
          const startMonth = group.start_date.substring(0, 7)
          if (selectedMonth < startMonth) {
            isActive = false
          }
        }
        
        // Check if group has ended
        if (isActive && group.end_date) {
          const endMonth = group.end_date.substring(0, 7)
          if (selectedMonth > endMonth) {
            isActive = false
          }
        }
        
        if (isActive) {
          activeGroupIds.add(group.id)
        }
      })
      
      // Get all member-group relationships for active groups
      const { data: activeMemberGroups, error: memberGroupsError } = await supabase
        .from('group_members')
        .select('member_id')
        .in('group_id', Array.from(activeGroupIds))
      
      if (memberGroupsError) {
        console.error('Error fetching active member groups:', memberGroupsError)
        return []
      }
      
      // Return unique member IDs
      return [...new Set(activeMemberGroups?.map((item: any) => item.member_id) || [])] as number[]
    } catch (error) {
      console.error('Error getting active member IDs for month:', error)
      return []
    }
  }
}
