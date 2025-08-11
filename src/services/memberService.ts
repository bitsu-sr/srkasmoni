import { supabase } from '../lib/supabase'
import { Member, MemberFormData } from '../types/member'

// Transform database row to Member interface
const transformMemberRow = (row: any): Member => ({
  id: row.id,
  firstName: row.first_name,
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
  dateOfRegistration: row.date_of_registration,
  totalReceived: row.total_received || 0,
  lastPayment: row.last_payment || '',
  nextPayment: row.next_payment || '',
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at
})

// Transform MemberFormData to database insert format
const transformMemberForInsert = (member: MemberFormData): any => ({
  first_name: member.firstName,
  last_name: member.lastName,
  birth_date: member.birthDate,
  birthplace: member.birthplace,
  address: member.address,
  city: member.city,
  phone: member.phone,
  email: member.email,
  national_id: member.nationalId,
  nationality: member.nationality,
  occupation: member.occupation,
  bank_name: member.bankName,
  account_number: member.accountNumber,
  date_of_registration: member.dateOfRegistration,
  total_received: member.totalReceived || 0,
  last_payment: member.lastPayment || null,
  next_payment: member.nextPayment || null,
  notes: member.notes || null
})

// Transform MemberFormData to database update format
const transformMemberForUpdate = (member: MemberFormData): any => ({
  first_name: member.firstName,
  last_name: member.lastName,
  birth_date: member.birthDate,
  birthplace: member.birthplace,
  address: member.address,
  city: member.city,
  phone: member.phone,
  email: member.email,
  national_id: member.nationalId,
  nationality: member.nationality,
  occupation: member.occupation,
  bank_name: member.bankName,
  account_number: member.accountNumber,
  date_of_registration: member.dateOfRegistration,
  total_received: member.totalReceived || 0,
  last_payment: member.lastPayment || null,
  next_payment: member.nextPayment || null,
  notes: member.notes || null
})

export const memberService = {
  async getAllMembers(): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ? data.map(transformMemberRow) : []
    } catch (error) {
      console.error('Error fetching members:', error)
      throw error
    }
  },

  async getMemberById(id: number): Promise<Member | null> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data ? transformMemberRow(data) : null
    } catch (error) {
      console.error('Error fetching member:', error)
      throw error
    }
  },

  async createMember(member: MemberFormData): Promise<Member> {
    try {
      const memberData = transformMemberForInsert(member)
      const { data, error } = await supabase
        .from('members')
        .insert(memberData)
        .select()
        .single()

      if (error) throw error
      return transformMemberRow(data)
    } catch (error) {
      console.error('Error creating member:', error)
      throw error
    }
  },

  async updateMember(id: number, member: MemberFormData): Promise<Member> {
    try {
      const memberData = transformMemberForUpdate(member)
      const { data, error } = await supabase
        .from('members')
        .update(memberData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return transformMemberRow(data)
    } catch (error) {
      console.error('Error updating member:', error)
      throw error
    }
  },

  async deleteMember(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting member:', error)
      throw error
    }
  },

  async searchMembers(query: string): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ? data.map(transformMemberRow) : []
    } catch (error) {
      console.error('Error searching members:', error)
      throw error
    }
  }
}
