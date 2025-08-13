export interface PaymentSlot {
  id: number
  groupId: number
  memberId: number
  monthDate: string // Format: "YYYY-MM"
  amount: number
  dueDate: string
  createdAt: string
}

export interface PaymentSlotFormData {
  groupId: number
  memberId: number
  monthDate: string
  amount: number
  dueDate: string
}

export interface MemberSlot {
  id: number
  groupId: number
  memberId: number
  monthDate: string
  amount: number
  dueDate: string
  createdAt: string
  // Joined data
  group?: Group
  member?: Member
}

export interface GroupMember {
  id: number
  groupId: number
  memberId: number
  assignedMonthDate: string
  member: Member
  createdAt: string
}

// Import types from existing files
import type { Member } from './member'
import type { Group } from './member'
