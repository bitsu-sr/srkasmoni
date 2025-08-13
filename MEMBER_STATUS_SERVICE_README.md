# Member Status Service

## Overview

The `memberStatusService` is a central module that provides consistent member status information across all pages in the application. It ensures that the active/inactive status of members is calculated and displayed consistently throughout the system.

## Key Features

- **Centralized Status Logic**: All member status calculations happen in one place
- **Consistent Display**: Same status information across Members page, MemberDetail page, and any future pages
- **Performance Optimized**: Efficient loading of member data with status information
- **Error Handling**: Graceful fallback to inactive status if there are any issues

## Core Functions

### `getMemberStatusInfo(memberId: number)`
Returns comprehensive status information for a specific member:
- Total slots count
- Total monthly amount
- Next receive month
- Active/inactive status
- Active vs inactive slots count

### `getMemberWithStatus(memberId: number)`
Returns a complete member object with embedded status information.

### `getAllMembersWithStatus()`
Returns all members with their status information, useful for the Members listing page.

### `getMemberStatusText(statusInfo: MemberStatusInfo)`
Returns display text: "ACTIVE MEMBER" or "INACTIVE MEMBER"

### `getMemberStatusBadgeClass(statusInfo: MemberStatusInfo)`
Returns CSS class: "active" or "inactive"

### `getMemberStatusSummary(statusInfo: MemberStatusInfo)`
Returns comprehensive status summary with text, class, and description.

## Usage Examples

### In Members Page
```typescript
import { getAllMembersWithStatus, MemberWithStatus } from '../services/memberStatusService'

const [members, setMembers] = useState<MemberWithStatus[]>([])

useEffect(() => {
  const loadMembers = async () => {
    const data = await getAllMembersWithStatus()
    setMembers(data)
  }
  loadMembers()
}, [])

// Display status
<span className={`status-tag ${member.statusInfo.isActive ? 'active' : 'inactive'}`}>
  {member.statusInfo.isActive ? 'ACTIVE' : 'INACTIVE'}
</span>
```

### In MemberDetail Page
```typescript
import { getMemberWithStatus, getMemberStatusText, getMemberStatusBadgeClass } from '../services/memberStatusService'

const [member, setMember] = useState<MemberWithStatus | null>(null)

const loadMember = async (memberId: number) => {
  const memberWithStatus = await getMemberWithStatus(memberId)
  if (memberWithStatus) {
    setMember(memberWithStatus)
  }
}

// Display status badge
<span className={`status-badge ${getMemberStatusBadgeClass(member.statusInfo)}`}>
  {getMemberStatusText(member.statusInfo)}
</span>
```

## Status Calculation Logic

A member is considered **ACTIVE** if they have:
- At least one future slot assigned
- The slot is in a current or future month

A member is considered **INACTIVE** if they have:
- No future slots
- Only past slots
- No slots at all

## Data Structure

```typescript
interface MemberStatusInfo {
  totalSlots: number
  totalMonthlyAmount: number
  nextReceiveMonth: string | null
  isActive: boolean
  activeSlots: number
  inactiveSlots: number
}

interface MemberWithStatus extends Member {
  statusInfo: MemberStatusInfo
}
```

## Benefits

1. **Consistency**: All pages show the same status information
2. **Maintainability**: Status logic is centralized and easy to update
3. **Performance**: Efficient data loading with proper error handling
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Reusability**: Easy to add status information to new pages

## Migration Notes

When migrating existing pages to use this service:

1. Replace `member.slotsInfo` with `member.statusInfo`
2. Update imports to include the new service
3. Use the utility functions for consistent display
4. Update TypeScript interfaces from `MemberWithSlots` to `MemberWithStatus`

## Future Enhancements

- Add caching for better performance
- Add real-time status updates
- Add status change notifications
- Add status history tracking
