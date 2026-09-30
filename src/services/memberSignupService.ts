import { supabase } from '../lib/supabase'
import { MemberSignup, MemberSignupFormData } from '../types/member'

const transformSignupRow = (row: any): MemberSignup => ({
  id: row.id,
  firstName: row.first_name,
  middleName: row.middle_name || '',
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
  groupId: row.group_id,
  groupName: row.group?.name || '',
  slotAmount: Number(row.slot_amount || 0),
  slotDuration: Number(row.slot_duration || 0),
  desiredMonth: row.desired_month || '',
  created_at: row.created_at,
  updated_at: row.updated_at
})

const transformSignupForInsert = (signup: MemberSignupFormData): any => ({
  first_name: signup.firstName.trim(),
  middle_name: signup.middleName?.trim() || '',
  last_name: signup.lastName.trim(),
  birth_date: signup.birthDate,
  birthplace: signup.birthplace.trim(),
  address: signup.address.trim(),
  city: signup.city,
  phone: signup.phone.trim(),
  email: signup.email.trim(),
  national_id: signup.nationalId.trim(),
  nationality: signup.nationality,
  occupation: signup.occupation.trim(),
  bank_name: signup.bankName,
  account_number: signup.accountNumber.trim(),
  group_id: Number(signup.groupId),
  slot_amount: Number(signup.slotAmount),
  slot_duration: Number(signup.slotDuration),
  desired_month: signup.desiredMonth
})

export const memberSignupService = {
  async getAllSignups(): Promise<MemberSignup[]> {
    const { data, error } = await supabase
      .from('member_signups')
      .select('*, group:groups(name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ? data.map(transformSignupRow) : []
  },

  async createSignup(signup: MemberSignupFormData): Promise<void> {
    // Do not chain .select() — anon users can INSERT but cannot SELECT these rows.
    const { error } = await supabase
      .from('member_signups')
      .insert(transformSignupForInsert(signup))

    if (error) throw error
  },

  async deleteSignup(id: number): Promise<void> {
    const { error } = await supabase
      .from('member_signups')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
