export interface Member {
  id: number
  firstName: string
  lastName: string
  birthDate: string
  birthplace: string
  address: string
  city: string
  phone: string
  email: string
  nationalId: string
  nationality: string
  occupation: string
  bankName: string
  accountNumber: string
  dateOfRegistration: string
  totalReceived: number
  lastPayment: string
  nextPayment: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MemberFormData {
  firstName: string
  lastName: string
  birthDate: string
  birthplace: string
  address: string
  city: string
  phone: string
  email: string
  nationalId: string
  nationality: string
  occupation: string
  bankName: string
  accountNumber: string
  dateOfRegistration: string
  totalReceived: number
  lastPayment: string
  nextPayment: string
  notes: string
}

export interface MemberFilters {
  search: string
  location: string
}
