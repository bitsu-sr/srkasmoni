import { supabase } from '../lib/supabase'
import type { CashInventory, CashInventoryFormData, CashInventoryStats } from '../types/cashInventory'

export const cashInventoryService = {
  // Get all cash inventory records
  async getCashInventory(): Promise<CashInventory[]> {
    const { data, error } = await supabase
      .from('cash_inventory')
      .select('*')
      .order('denomination', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch cash inventory: ${error.message}`)
    }

    // Transform snake_case to camelCase
    const transformedData: CashInventory[] = (data || []).map((item: any) => ({
      id: item.id,
      denomination: item.denomination,
      quantity: item.quantity,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))

    return transformedData
  },

  // Update cash inventory quantity for a specific denomination
  async updateCashInventory(denomination: number, quantity: number): Promise<CashInventory> {
    const { data, error } = await supabase
      .from('cash_inventory')
      .update({ quantity })
      .eq('denomination', denomination)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update cash inventory: ${error.message}`)
    }

    // Transform snake_case to camelCase
    const transformedData: CashInventory = {
      id: data.id,
      denomination: data.denomination,
      quantity: data.quantity,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return transformedData
  },

  // Batch update multiple denominations
  async batchUpdateCashInventory(updates: CashInventoryFormData[]): Promise<void> {
    // Execute all updates in parallel
    const updatePromises = updates.map(({ denomination, quantity }) =>
      supabase
        .from('cash_inventory')
        .update({ quantity })
        .eq('denomination', denomination)
    )

    const results = await Promise.all(updatePromises)

    // Check for any errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      throw new Error(`Failed to batch update cash inventory: ${errors[0].error?.message}`)
    }
  },

  // Calculate cash inventory statistics
  async getCashInventoryStats(): Promise<CashInventoryStats> {
    const inventory = await this.getCashInventory()

    const denominations = inventory.map(item => ({
      denomination: item.denomination,
      quantity: item.quantity,
      subtotal: item.denomination * item.quantity
    }))

    const totalCash = denominations.reduce((sum, item) => sum + item.subtotal, 0)

    return {
      totalCash,
      denominations
    }
  },

  // Initialize cash inventory (create default records if they don't exist)
  async initializeCashInventory(): Promise<void> {
    const defaultDenominations = [5, 10, 20, 50, 100, 200, 500]

    const insertPromises = defaultDenominations.map(denomination =>
      supabase
        .from('cash_inventory')
        .upsert(
          { denomination, quantity: 0 },
          { onConflict: 'denomination', ignoreDuplicates: true }
        )
    )

    const results = await Promise.all(insertPromises)

    // Check for any errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Failed to initialize some cash inventory records:', errors)
    }
  }
}

