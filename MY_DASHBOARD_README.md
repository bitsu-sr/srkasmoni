# My Dashboard - Regular User Dashboard

## Overview

The "My Dashboard" is a special dashboard designed specifically for regular users (members) in the Sranan Kasmoni application. Unlike the main dashboard which shows system-wide statistics and is only accessible to admins and super users, the My Dashboard provides a personalized view of the user's own slots, payments, and financial information.

## Features

### 1. Role-Based Access Control
- **Admins & Super Users**: See the main dashboard (`/dashboard`) with system-wide statistics
- **Regular Users**: Automatically redirected to My Dashboard (`/my-dashboard`) when they try to access `/dashboard`

### 2. Personal Statistics
The dashboard displays 6 key stat cards:
- **Total Slots**: Number of assigned slots across all groups
- **Monthly Amount**: Total monthly contribution amount
- **Total Expected**: Overall expected amount from all slots
- **Active Groups**: Number of groups the user is participating in
- **Total Received**: Amount already received from completed payments
- **Next Receive**: Next month when the user will receive a payout

### 3. User Slots Overview
- Displays all user slots as individual tiles
- Each tile shows:
  - Group name and description
  - Monthly contribution amount
  - Assigned month
  - Status (Current Month, Upcoming, or Completed)
- Color-coded status indicators for easy identification

### 4. Recent Activity
- Shows the user's recent payment history
- Displays payment status, amount, and group information
- Timestamps with relative time formatting

## Technical Implementation

### Components
- **MyDashboard.tsx**: Main dashboard component
- **MyDashboard.css**: Styling with Excel green theme
- **userDashboardService.ts**: Service for fetching user-specific data

### Data Flow
1. User authenticates and accesses dashboard
2. System checks user role:
   - If admin/super user → Main Dashboard
   - If regular user → My Dashboard
3. My Dashboard fetches user data:
   - Finds member record by matching user email
   - Retrieves user's slots from `group_members` table
   - Fetches recent payments from `payments` table
   - Calculates personal statistics

### Database Queries
- Links auth users to members via email matching
- Queries `group_members` table for user slots
- Queries `payments` table for payment history
- Joins with `groups` table for group information

## User Experience

### For Regular Users
- Personalized view of their financial participation
- Clear overview of all their slots and upcoming payouts
- Easy tracking of payment history
- Mobile-responsive design

### For Admins/Super Users
- Unchanged access to main dashboard
- Full system overview and management capabilities
- Access to all administrative functions

## Navigation

### Automatic Routing
- `/dashboard` → Redirects regular users to `/my-dashboard`
- `/my-dashboard` → Regular user dashboard
- Navbar automatically shows correct dashboard link based on user role

### Manual Navigation
- Regular users can manually navigate to `/my-dashboard`
- Admins can access both dashboards if needed

## Styling

### Theme
- Uses Excel green color scheme (`#217346`) as requested
- Modern card-based layout
- Hover effects and smooth transitions
- Responsive grid system

### Color Coding
- **Info**: Excel green for general information
- **Success**: Green for completed/positive items
- **Primary**: Blue for important data
- **Warning**: Orange for current month/attention items

## Error Handling

### Graceful Degradation
- If no member record found, shows empty state
- Handles database connection issues gracefully
- Provides fallback data on errors

### User Feedback
- Loading states for all data fetching
- Clear error messages when appropriate
- Empty state messages for new users

## Future Enhancements

### Potential Improvements
- Add slot filtering and sorting options
- Include payment due reminders
- Add group-specific slot views
- Include financial goal tracking
- Add export functionality for personal data

### Integration Opportunities
- Connect with notification system for payment reminders
- Integrate with messaging system for group communications
- Add calendar view for slot scheduling

## Security Considerations

### Data Isolation
- Users can only see their own data
- No access to other users' information
- Proper RLS policies enforced

### Authentication
- Requires valid user session
- Role-based access control
- Secure data fetching through Supabase

## Testing

### Test Scenarios
1. Regular user login → Should see My Dashboard
2. Admin user login → Should see Main Dashboard
3. No member record → Should show empty state
4. With slots data → Should display all user slots
5. Mobile responsiveness → Should work on all devices

### Edge Cases
- User with no assigned slots
- User with multiple group memberships
- Database connection issues
- Invalid user data

## Deployment

### Requirements
- Supabase database with proper schema
- User authentication system
- Member records linked to auth users
- Proper RLS policies

### Configuration
- No additional environment variables needed
- Uses existing Supabase configuration
- Integrates with current auth system
