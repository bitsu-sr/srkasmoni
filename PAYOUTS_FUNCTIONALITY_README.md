# Payouts Functionality

## Overview

The Payouts page is a comprehensive dashboard that displays and manages payout information for members in rotating savings groups. It shows when members are scheduled to receive their lump sum payments based on their assigned "slot" in each group.

## Features

### 1. Summary Statistics Dashboard
- **Total Payouts**: Count of all payouts in the system
- **Total Amount**: Sum of all payout amounts
- **Completed Payouts**: Number of successfully processed payouts
- **Pending Payouts**: Number of payouts awaiting processing

### 2. Advanced Filtering System
- **Text-based Filters**: Search by member name, group name, or bank name
- **Status Filters**: Filter by payout status (completed, pending, processing, failed)
- **Date Filters**: Filter by specific receive month (YYYY-MM format)
- **Combined Filtering**: Multiple filters can be applied simultaneously

### 3. Sortable Data Table
- **Sortable Columns**: Member name, group name, total amount, receive month, status
- **Bidirectional Sorting**: Ascending and descending order for each column
- **Visual Indicators**: Clear sort direction indicators

### 4. Comprehensive Payout Information
- **Member Details**: Name, ID, and contact information
- **Group Information**: Group name, monthly contribution, duration
- **Financial Details**: Monthly amount, total payout amount
- **Timing Information**: Receive month, payment date (if completed)
- **Bank Information**: Bank name and masked account number
- **Status Tracking**: Current payout status with color-coded badges

### 5. Interactive Actions
- **View Details**: Detailed modal view of payout information
- **Download**: PDF generation capability for payout details
- **Print Support**: Print-friendly layout for physical copies

### 6. Pagination & Performance
- **Configurable Page Sizes**: 10, 25, 50, or 100 items per page
- **Navigation Controls**: Previous/next buttons and page number selection
- **Performance Optimized**: Efficient data loading and rendering

## Payout Object Structure

```typescript
interface Payout {
  id: number                    // Unique payout identifier
  memberName: string            // Full name of the member
  memberId: number              // Member's unique ID
  groupName: string             // Name of the savings group
  groupId: number               // Group's unique ID
  monthlyAmount: number         // Monthly contribution amount
  totalAmount: number           // Total payout amount (monthlyAmount × duration)
  duration: number              // Group duration in months
  receiveMonth: string          // Month when member receives payout (YYYY-MM format)
  status: string                // Payout status: 'completed', 'pending', 'processing', 'failed'
  paymentDate?: string          // Actual payment date (if completed)
  bankName: string              // Member's bank name
  accountNumber: string         // Member's account number
}
```

## Business Logic

### 1. Rotating Savings Model
- Each group has a fixed duration (e.g., 12 months)
- Members contribute monthly amounts
- Each member gets assigned a specific month to receive the payout
- The payout amount = monthly contribution × number of members × duration

### 2. Payout Eligibility
A member is eligible for payout when:
- Their assigned receiveMonth has arrived
- All their monthly contributions are up to date
- The group is active and not terminated

### 3. Status Workflow
```
Pending → Processing → Completed
    ↓
Failed (if processing fails)
```

## Technical Implementation

### 1. Component Architecture
- **Payouts.tsx**: Main component with comprehensive payout management
- **Payouts.css**: Unique styling with responsive design
- **payoutService.ts**: Service layer for data operations
- **payout.ts**: TypeScript interfaces and types

### 2. State Management
- **Data State**: payouts, filteredPayouts, loading, error
- **Filter State**: filterType, filterValue, statusFilter, dateFilter
- **Sort State**: sortField, sortDirection
- **Pagination State**: currentPage, pageSize
- **Modal State**: selectedPayout, isDetailsModalOpen

### 3. Data Flow
1. Component mounts and calls `fetchPayouts()`
2. Service layer retrieves data (currently mock data, ready for API integration)
3. Data is stored in local state and filtered based on user selections
4. Filtered data is displayed in the table with pagination
5. User interactions trigger filter updates and re-renders

### 4. Performance Features
- **Debounced Filtering**: Efficient filter application with useCallback
- **Optimized Rendering**: Minimal re-renders through proper state management
- **Responsive Design**: Mobile-first approach with breakpoint-specific layouts

## Integration Points

### 1. Navigation
- Added to main navigation in `App.tsx`
- Accessible via `/payouts` route
- Included in hamburger menu with DollarSign icon

### 2. Service Layer
- Follows existing service pattern (`payoutService.ts`)
- Ready for API integration with Supabase or other backend
- Includes comprehensive CRUD operations

### 3. Type System
- Consistent with existing TypeScript interfaces
- Exported types for reuse across components
- Strict typing for payout status and filter options

## Usage Examples

### 1. Basic Payout Viewing
```typescript
// Navigate to payouts page
navigate('/payouts')

// View all payouts
const payouts = await payoutService.getAllPayouts()
```

### 2. Filtering Payouts
```typescript
// Filter by member name
const memberPayouts = await payoutService.searchPayouts('John', 'memberName')

// Filter by status
const pendingPayouts = await payoutService.getPayoutsByStatus('pending')
```

### 3. Updating Payout Status
```typescript
// Mark payout as completed
const updatedPayout = await payoutService.updatePayoutStatus(
  payoutId, 
  'completed', 
  new Date().toISOString()
)
```

## Future Enhancements

### 1. API Integration
- Replace mock data with Supabase queries
- Real-time updates using Supabase subscriptions
- Batch operations for multiple payouts

### 2. Advanced Features
- Bulk payout processing
- Automated status updates
- Integration with payment gateways
- Email notifications for payout status changes

### 3. Reporting & Analytics
- Payout trend analysis
- Performance metrics dashboard
- Export functionality for accounting systems
- Audit trail for payout changes

## File Structure

```
src/
├── pages/
│   ├── Payouts.tsx          # Main payouts component
│   └── Payouts.css          # Payouts-specific styles
├── services/
│   └── payoutService.ts     # Payout business logic
├── types/
│   └── payout.ts            # Payout interfaces and types
└── App.tsx                  # Updated with payouts route
```

## CSS Class Naming Convention

All CSS classes use the `payouts-` prefix to ensure uniqueness:
- `.payouts-page` - Main container
- `.payouts-header` - Page header section
- `.payouts-summary` - Statistics cards
- `.payouts-filters` - Filter controls
- `.payouts-table` - Data table
- `.payouts-modal` - Detail modal
- `.payouts-pagination` - Pagination controls

## Responsive Design

- **Desktop**: Full-featured layout with side-by-side filters
- **Tablet**: Stacked filters with optimized table view
- **Mobile**: Single-column layout with horizontal table scrolling
- **Print**: Clean, printer-friendly layout

## Error Handling

- **Loading States**: Spinner and loading messages
- **Error States**: User-friendly error messages with retry options
- **Empty States**: Helpful guidance when no data is available
- **Validation**: Input validation for filters and forms

This payout system provides a comprehensive solution for managing rotating savings group payouts, with robust filtering, detailed views, and a clear status tracking system that integrates seamlessly with the overall Kasmoni application architecture.

