import { supabase } from '../lib/supabase'
import type { Bank, BankFormData } from '../types/bank'

// Transform database row to Bank interface
const transformBankRow = (row: any): Bank => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name,
  address: row.address,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

// Transform BankFormData to database insert format
const transformBankForInsert = (bank: BankFormData): any => ({
  name: bank.name,
  short_name: bank.shortName,
  address: bank.address
})

// Transform BankFormData to database update format
const transformBankForUpdate = (bank: BankFormData): any => ({
  name: bank.name,
  short_name: bank.shortName,
  address: bank.address
})

export const bankService = {
  // Get all banks
  async getAllBanks(): Promise<Bank[]> {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data ? data.map(transformBankRow) : []
    } catch (error) {
      console.error('Error fetching banks:', error)
      throw error
    }
  },

  // Get bank by ID
  async getBankById(id: number): Promise<Bank | null> {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data ? transformBankRow(data) : null
    } catch (error) {
      console.error('Error fetching bank:', error)
      throw error
    }
  },

  // Create new bank
  async createBank(bankData: BankFormData): Promise<Bank> {
    try {
      const bankDataForInsert = transformBankForInsert(bankData)
      const { data, error } = await supabase
        .from('banks')
        .insert(bankDataForInsert)
        .select()
        .single()

      if (error) throw error
      return transformBankRow(data)
    } catch (error) {
      console.error('Error creating bank:', error)
      throw error
    }
  },

  // Update bank
  async updateBank(id: number, updates: BankFormData): Promise<Bank> {
    try {
      const updateData = transformBankForUpdate(updates)
      updateData.updated_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('banks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return transformBankRow(data)
    } catch (error) {
      console.error('Error updating bank:', error)
      throw error
    }
  },

  // Delete bank
  async deleteBank(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting bank:', error)
      throw error
    }
  },

  // Search banks
  async searchBanks(query: string): Promise<Bank[]> {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .or(`name.ilike.%${query}%,short_name.ilike.%${query}%`)
        .order('name', { ascending: true })

      if (error) throw error
      return data ? data.map(transformBankRow) : []
    } catch (error) {
      console.error('Error searching banks:', error)
      throw error
    }
  }
}
