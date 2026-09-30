import { supabase } from '../lib/supabase'

const settingKey = (pageKey: string) => `${pageKey}-column-visibility`

const isVisibilityMap = (value: unknown): value is Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every(item => typeof item === 'boolean')
}

export const columnVisibilityService = {
  async get(pageKey: string): Promise<Record<string, boolean> | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', settingKey(pageKey))
      .maybeSingle()

    if (error) throw error
    return isVisibilityMap(data?.setting_value) ? data.setting_value : null
  },

  async save(pageKey: string, visibility: Record<string, boolean>): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        setting_key: settingKey(pageKey),
        setting_value: visibility,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' })

    if (error) throw error
  }
}
