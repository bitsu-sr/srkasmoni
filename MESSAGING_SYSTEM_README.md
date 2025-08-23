# Messaging System Documentation

## Overview

The messaging system is a comprehensive email-like communication platform integrated into the SR Kasmoni application. It provides secure messaging between users, payment notifications, profile change request management, and administrative oversight capabilities.

## Features

### 🎯 Core Messaging Features
- **Inbox Management**: View, filter, and organize incoming messages
- **Read/Unread States**: Clear visual distinction between read and unread messages
- **Message Expansion**: Click to expand and view full message content
- **Automatic Read Marking**: Messages are marked as read when opened
- **Message Filtering**: Filter by type, status, date range, and sender type

### 💰 Payment Notifications
- **Automatic Notifications**: Sent when payments are made or status changes
- **Payment Status Updates**: Real-time notifications for payment status changes
- **Recipient Confirmation**: Payment recipients receive confirmation messages

### 👤 Profile Change Management
- **Change Requests**: Members can request profile information updates
- **Deletion Requests**: Members can request profile deletion
- **Admin Approval Workflow**: All changes require admin approval
- **Notification System**: Admins and members are notified of request outcomes

### 🔐 Security Features
- **IP Address Tracking**: Admin messages include sender IP addresses
- **Role-Based Access**: Different permissions for admins, members, and system users
- **Row Level Security**: Database-level security policies
- **Audit Trail**: Complete tracking of all messaging activities

### 📱 User Experience
- **Responsive Design**: Mobile-friendly interface
- **Excel Green Theme**: Consistent with application branding
- **Real-time Updates**: Live unread message counts
- **Intuitive Navigation**: Tabbed interface for different message types

## Database Schema

### Tables

#### `messages`
- Stores all message content and metadata
- Includes message type, sender information, and IP addresses
- Supports different message types (payment, profile, system)

#### `message_recipients`
- Many-to-many relationship between messages and recipients
- Tracks read status and timestamps
- Enables individual message tracking per user

#### `profile_change_requests`
- Stores profile change and deletion requests
- Tracks approval status and admin decisions
- Maintains audit trail of all changes

### Security Policies
- Users can only view messages they sent or received
- Admins have access to all messages and requests
- Profile change requests are restricted to appropriate users
- IP addresses are only visible to admins

## Components

### 1. Inbox Component (`Inbox.tsx`)
- **Purpose**: Displays list of incoming messages
- **Features**: 
  - Message filtering and sorting
  - Read/unread state management
  - Message preview with sender information
  - Responsive grid layout

### 2. MessageView Component (`MessageView.tsx`)
- **Purpose**: Displays individual message content
- **Features**:
  - Full message rendering with formatting support
  - Sender information and timestamps
  - Action buttons (reply, forward, delete)
  - IP address display for admin messages

### 3. ProfileChangeRequestModal (`ProfileChangeRequestModal.tsx`)
- **Purpose**: Handles profile change request creation and review
- **Features**:
  - Member request submission interface
  - Admin approval/rejection workflow
  - Current vs. requested data comparison
  - Reason tracking for rejections

### 4. Messaging Page (`Messaging.tsx`)
- **Purpose**: Main messaging interface with tabbed navigation
- **Features**:
  - Inbox, requests, and sent messages tabs
  - Sidebar with quick actions and statistics
  - Role-based access control
  - Integrated message viewing

## Message Types

### 1. Payment Notifications
- **Trigger**: Payment creation or status changes
- **Recipients**: Payment recipients
- **Content**: Payment details, amounts, and status information
- **IP Tracking**: Yes (for admin oversight)

### 2. Profile Change Requests
- **Trigger**: Member profile update requests
- **Recipients**: All admin users
- **Content**: Current data, requested changes, member information
- **IP Tracking**: Yes

### 3. Profile Deletion Requests
- **Trigger**: Member profile deletion requests
- **Recipients**: All admin users
- **Content**: Deletion reason and member information
- **IP Tracking**: Yes

### 4. Profile Update Notifications
- **Trigger**: Direct profile updates (password, picture)
- **Recipients**: All admin users
- **Content**: Change details and member information
- **IP Tracking**: Yes

### 5. System Notifications
- **Trigger**: System events and admin actions
- **Recipients**: Relevant users based on context
- **Content**: System information and status updates
- **IP Tracking**: No

## Usage Examples

### For Members

#### Requesting Profile Changes
```typescript
// Open profile change request modal
const handleProfileChange = () => {
  setIsProfileRequestModalOpen(true);
};

// Submit request through ProfileChangeRequestModal
// System automatically notifies all admins
```

#### Viewing Messages
```typescript
// Messages are automatically loaded in inbox
// Click any message to expand and mark as read
// Filter messages by type, status, or date
```

### For Admins

#### Reviewing Profile Requests
```typescript
// Navigate to Profile Requests tab
// Click on pending request to review
// Approve or reject with optional reason
// System notifies member and other admins
```

#### Monitoring System Activity
```typescript
// View all messages in inbox
// Track IP addresses for security
// Monitor profile change requests
// Review payment notifications
```

## Integration Points

### Payment System
- Automatically sends notifications when payments are processed
- Integrates with existing payment workflows
- Provides real-time status updates

### User Management
- Integrates with authentication system
- Respects user roles and permissions
- Maintains user privacy and security

### Database
- Uses existing Supabase infrastructure
- Implements proper RLS policies
- Maintains data consistency and integrity

## Security Considerations

### Data Privacy
- Users can only access their own messages
- Admin access is properly restricted
- IP addresses are only visible to admins

### Access Control
- Role-based permissions enforced at database level
- UI elements respect user roles
- Secure message creation and retrieval

### Audit Trail
- All message activities are logged
- Profile change requests are tracked
- Admin decisions are recorded with timestamps

## Performance Features

### Caching
- React Query for efficient data fetching
- Optimistic updates for better UX
- Stale time management for real-time data

### Optimization
- Lazy loading of message content
- Efficient database queries with proper indexing
- Minimal re-renders with proper state management

## Future Enhancements

### Planned Features
- **Message Templates**: Pre-defined message formats
- **Bulk Operations**: Mass message management
- **Advanced Filtering**: More sophisticated search capabilities
- **Message Threading**: Conversation organization
- **File Attachments**: Support for document sharing

### Technical Improvements
- **Real-time Updates**: WebSocket integration
- **Push Notifications**: Browser and mobile notifications
- **Message Encryption**: Enhanced security features
- **Performance Monitoring**: Usage analytics and metrics

## Installation and Setup

### 1. Database Migration
```sql
-- Run the messaging system migration
\i database-migration-messaging.sql
```

### 2. Component Integration
```typescript
// Add to your routing configuration
import Messaging from './pages/Messaging';

// Add route
<Route path="/messaging" element={<Messaging />} />
```

### 3. Navigation Integration
```typescript
// Add to your navigation menu
{
  name: 'Messaging',
  path: '/messaging',
  icon: '📬'
}
```

## Troubleshooting

### Common Issues

#### Messages Not Loading
- Check database connection
- Verify RLS policies are enabled
- Check user authentication status

#### Permission Errors
- Verify user role assignments
- Check database policy configurations
- Ensure proper user context

#### Performance Issues
- Review database indexes
- Check query optimization
- Monitor React Query cache settings

### Debug Mode
```typescript
// Enable debug logging
const DEBUG_MESSAGING = true;

if (DEBUG_MESSAGING) {
  console.log('Messaging Debug:', { data, error, user });
}
```

## Support and Maintenance

### Regular Tasks
- Monitor message volume and performance
- Review and update security policies
- Clean up old messages and requests
- Update message templates and formats

### Monitoring
- Track unread message counts
- Monitor profile request processing times
- Alert on system errors or failures
- Performance metrics and analytics

## Conclusion

The messaging system provides a robust, secure, and user-friendly communication platform that integrates seamlessly with the existing SR Kasmoni application. It supports all required functionality while maintaining high security standards and excellent user experience.

For additional support or feature requests, please refer to the development team or create an issue in the project repository.
