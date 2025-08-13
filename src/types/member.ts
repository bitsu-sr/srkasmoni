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

export interface Group {
  id: number
  name: string
  description: string | null
  monthlyAmount: number
  maxMembers: number
  duration: number
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface GroupFormData {
  name: string
  description: string
  monthlyAmount: number
  maxMembers: number
  duration: number
  startDate: string
  endDate: string
}

export interface GroupMember {
  id: number
  groupId: number
  memberId: number
  assignedMonthDate: string | number // Support both old (number) and new (string) formats during transition
  member: Member
  createdAt: string
}

export interface GroupMemberFormData {
  memberId: number
  assignedMonthDate: string | number // Support both formats during transition
}
