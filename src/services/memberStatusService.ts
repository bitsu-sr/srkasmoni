import { memberService } from './memberService'

export interface MemberStatusInfo {
  totalSlots: number
  totalMonthlyAmount: number
  nextReceiveMonth: string | null
  isActive: boolean
  activeSlots: number
  inactiveSlots: number
}

export interface MemberWithStatus {
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
  statusInfo: MemberStatusInfo
}

/**
 * Get comprehensive status information for a member
 */
export const getMemberStatusInfo = async (memberId: number): Promise<MemberStatusInfo> => {
  try {
    const slotsInfo = await memberService.getMemberSlotsInfo(memberId)
    
    // Calculate additional status metrics
    const slotsDetails = await memberService.getMemberSlotsDetails(memberId)
    const activeSlots = slotsDetails.filter(slot => slot.isFuture).length
    const inactiveSlots = slotsDetails.filter(slot => !slot.isFuture).length
    
    return {
      totalSlots: slotsInfo.totalSlots,
      totalMonthlyAmount: slotsInfo.totalMonthlyAmount,
      nextReceiveMonth: slotsInfo.nextReceiveMonth,
      isActive: slotsInfo.isActive,
      activeSlots,
      inactiveSlots
    }
  } catch (error) {
    console.error(`Failed to get status info for member ${memberId}:`, error)
    // Return default inactive status if there's an error
    return {
      totalSlots: 0,
      totalMonthlyAmount: 0,
      nextReceiveMonth: null,
      isActive: false,
      activeSlots: 0,
      inactiveSlots: 0
    }
  }
}

/**
 * Get a member with their status information
 */
export const getMemberWithStatus = async (memberId: number): Promise<MemberWithStatus | null> => {
  try {
    const member = await memberService.getMemberById(memberId)
    if (!member) {
      return null
    }
    
    const statusInfo = await getMemberStatusInfo(memberId)
    
    // Ensure all required properties are present
    const memberWithStatus: MemberWithStatus = {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      birthDate: member.birthDate,
      birthplace: member.birthplace,
      address: member.address,
      city: member.city,
      phone: member.phone,
      email: member.email,
      nationalId: member.nationalId,
      nationality: member.nationality,
      occupation: member.occupation,
      bankName: member.bankName,
      accountNumber: member.accountNumber,
      dateOfRegistration: member.dateOfRegistration,
      totalReceived: member.totalReceived,
      lastPayment: member.lastPayment,
      nextPayment: member.nextPayment,
      notes: member.notes,
      created_at: member.created_at,
      updated_at: member.updated_at,
      statusInfo
    }
    
    return memberWithStatus
  } catch (error) {
    console.error(`Failed to get member with status for ${memberId}:`, error)
    return null
  }
}

/**
 * Get all members with their status information
 */
export const getAllMembersWithStatus = async (): Promise<MemberWithStatus[]> => {
  try {
    const members = await memberService.getAllMembers()
    
    const membersWithStatus = await Promise.all(
      members.map(async (member) => {
        try {
          const statusInfo = await getMemberStatusInfo(member.id)
          return { ...member, statusInfo }
        } catch (error) {
          console.error(`Failed to load status info for member ${member.id}:`, error)
          // Return member with default inactive status
          return {
            ...member,
            statusInfo: {
              totalSlots: 0,
              totalMonthlyAmount: 0,
              nextReceiveMonth: null,
              isActive: false,
              activeSlots: 0,
              inactiveSlots: 0
            }
          }
        }
      })
    )
    
    return membersWithStatus
  } catch (error) {
    console.error('Failed to load members with status:', error)
    return []
  }
}

/**
 * Check if a member is active based on their slots
 */
export const isMemberActive = (statusInfo: MemberStatusInfo): boolean => {
  return statusInfo.isActive
}

/**
 * Get member status display text
 */
export const getMemberStatusText = (statusInfo: MemberStatusInfo): string => {
  return statusInfo.isActive ? 'ACTIVE MEMBER' : 'INACTIVE MEMBER'
}

/**
 * Get member status badge class
 */
export const getMemberStatusBadgeClass = (statusInfo: MemberStatusInfo): string => {
  return statusInfo.isActive ? 'active' : 'inactive'
}

/**
 * Get member status summary for display
 */
export const getMemberStatusSummary = (statusInfo: MemberStatusInfo): {
  text: string
  class: string
  description: string
} => {
  if (statusInfo.isActive) {
    return {
      text: 'ACTIVE MEMBER',
      class: 'active',
      description: `Active with ${statusInfo.activeSlots} upcoming slots`
    }
  } else {
    return {
      text: 'INACTIVE MEMBER',
      class: 'inactive',
      description: `Inactive with ${statusInfo.totalSlots} total slots`
    }
  }
}

/**
 * Check if member has upcoming payments
 */
export const hasUpcomingPayments = (statusInfo: MemberStatusInfo): boolean => {
  return statusInfo.activeSlots > 0
}

/**
 * Get next payment month display text
 */
export const getNextPaymentDisplay = (statusInfo: MemberStatusInfo): string => {
  if (!statusInfo.nextReceiveMonth) {
    return 'No upcoming payments'
  }
  
  try {
    const [year, month] = statusInfo.nextReceiveMonth.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch (error) {
    return statusInfo.nextReceiveMonth
  }
}
