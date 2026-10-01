import { supabase } from '../lib/supabase'

const SETTING_KEY = 'signup-show-slot-step'

const readBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  return null
}

export const signupSettingsService = {
  async getShowSlotStep(): Promise<boolean> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', SETTING_KEY)
      .maybeSingle()

    if (error) throw error
    return readBoolean(data?.setting_value) ?? true
  },

  async setShowSlotStep(show: boolean): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        setting_key: SETTING_KEY,
        setting_value: show,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' })

    if (error) throw error
  }
}
