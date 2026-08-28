import { Member } from '../types/member'
import { memberService } from './memberService'

export interface MemberStatusInfo {
  totalSlots: number
  totalMonthlyAmount: number
  /** Sum of slotAmount for active (upcoming) slots only */
  activeSlotsMonthlyAmount: number
  nextReceiveMonth: string | null
  isActive: boolean
  activeSlots: number
  inactiveSlots: number
}

export interface MemberWithStatus extends Member {
  statusInfo: MemberStatusInfo
}

/**
 * Get comprehensive status information for a member
 * Uses getMemberSlotsDetails once and derives all metrics (avoids duplicate fetches)
 */
export const getMemberStatusInfo = async (memberId: number): Promise<MemberStatusInfo> => {
  try {
    const slotsDetails = await memberService.getMemberSlotsDetails(memberId)
    const totalSlots = slotsDetails.length
    const totalMonthlyAmount = slotsDetails.reduce((sum, s) => sum + s.slotAmount, 0)
    const activeSlotDetails = slotsDetails.filter(slot => slot.isActive)
    const activeSlots = activeSlotDetails.length
    const activeSlotsMonthlyAmount = activeSlotDetails.reduce((sum, s) => sum + s.slotAmount, 0)
    const inactiveSlots = totalSlots - activeSlots
    const currentMonth = new Date().toISOString().slice(0, 7)
    const upcomingReceiveMonths = activeSlotDetails
      .filter(s => s.assignedMonthDate >= currentMonth)
      .map(s => s.assignedMonthDate)
      .sort()
    const nextReceiveMonth = upcomingReceiveMonths[0] || null

    return {
      totalSlots,
      totalMonthlyAmount,
      activeSlotsMonthlyAmount,
      nextReceiveMonth,
      isActive: totalSlots > 0,
      activeSlots,
      inactiveSlots
    }
  } catch (error) {
    console.error(`Failed to get status info for member ${memberId}:`, error)
    // Return default inactive status if there's an error
    return {
      totalSlots: 0,
      totalMonthlyAmount: 0,
      activeSlotsMonthlyAmount: 0,
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
    return { ...member, statusInfo }
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
              activeSlotsMonthlyAmount: 0,
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
