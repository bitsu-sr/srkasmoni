import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type GroupRow = Database['public']['Tables']['groups']['Row']

type GroupUpdate = Database['public']['Tables']['groups']['Update']

export interface Group {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// Transform database row to Group interface
const transformGroupRow = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at
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
  async createGroup(name: string, description?: string): Promise<Group> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          description,
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
  }
}
