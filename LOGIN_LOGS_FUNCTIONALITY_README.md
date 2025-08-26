# Login Logs Functionality

## Overview
The Login Logs page provides comprehensive tracking and monitoring of all authentication activities across the Sranan Kasmoni system. This includes successful logins, logouts, and failed login attempts with detailed information about each event.

## Features

### 📊 Statistics Dashboard
The page displays 6 key metric cards at the top:

1. **Total Activities** - Count of all authentication events
2. **Successful Logins** - Number of successful user authentications
3. **Logouts** - Count of user sign-out events
4. **Failed Attempts** - Number of unsuccessful login attempts
5. **Unique Users** - Count of distinct user accounts
6. **Today's Logins** - Successful logins for the current day

### 📋 Data Table
The main table displays detailed information for each authentication event:

- **Action** - Visual badge showing the type of activity (Login, Logout, Failed Login)
- **Username** - Email/username used in the authentication attempt
- **First Name** - User's first name (if available)
- **Last Name** - User's last name (if available)
- **IP Address** - Client's IP address (formatted for readability)
- **Timestamp** - When the activity occurred (localized format)

### 🔄 Pagination
- **Page Size Options**: 25, 50, 100, 200 rows per page
- **Navigation**: First, Previous, Page Numbers, Next, Last buttons
- **Responsive Design**: Optimized for mobile and desktop viewing

### 🎨 Visual Design
- **Unique CSS Classes**: All styles use `login-logs-*` prefix to avoid conflicts
- **Color-Coded Actions**: 
  - 🟢 Green for successful logins
  - 🟠 Orange for logouts
  - 🔴 Red for failed attempts
- **Responsive Layout**: Adapts to different screen sizes

## Database Schema

### Table: `auth_logs`
```sql
CREATE TABLE auth_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    username VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    ip_address INET NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('login', 'logout', 'failed_login')),
    success BOOLEAN NOT NULL DEFAULT false,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance
- `idx_auth_logs_timestamp` - For chronological sorting
- `idx_auth_logs_username` - For user-specific queries
- `idx_auth_logs_action` - For filtering by activity type
- `idx_auth_logs_success` - For success/failure filtering
- `idx_auth_logs_ip_address` - For IP-based analysis

### Row Level Security (RLS)
- **Admins/Super Users**: Can view all authentication logs
- **Regular Users**: Can only view their own authentication activities

## Technical Implementation

### Components
- **LoginLogs.tsx** - Main page component with pagination and stats
- **LoginLogs.css** - Unique styling with responsive design

### Data Flow
1. **Data Fetching**: Retrieves logs from `auth_logs` table via Supabase
2. **Statistics Calculation**: Computes metrics in real-time from fetched data
3. **Pagination**: Client-side pagination with configurable page sizes
4. **State Management**: React hooks for data, loading states, and pagination

### Security Features
- **Protected Route**: Requires authentication to access
- **Data Filtering**: Users only see their own logs (unless admin)
- **Input Validation**: Database constraints ensure data integrity

## Navigation

### Access
- **URL**: `/login-logs`
- **Menu Location**: Hamburger menu (bottom section)
- **Icon**: Shield icon for security context

### User Permissions
- **All Authenticated Users**: Can access the page
- **Data Visibility**: Restricted based on user role and ownership

## Usage Examples

### For Administrators
- Monitor system-wide authentication patterns
- Identify potential security issues
- Track user activity across the platform
- Analyze login success rates

### For Regular Users
- Review personal login history
- Monitor account security
- Track session activity
- Identify unauthorized access attempts

## Future Enhancements

### Potential Features
- **Export Functionality**: Download logs as CSV/PDF
- **Advanced Filtering**: Date ranges, IP ranges, action types
- **Real-time Updates**: WebSocket integration for live monitoring
- **Alert System**: Notifications for suspicious activities
- **Geolocation**: IP address to location mapping
- **Analytics Charts**: Visual representation of login patterns

### Performance Optimizations
- **Server-side Pagination**: For large datasets
- **Caching**: Redis integration for frequently accessed data
- **Compression**: Archive old logs for storage efficiency
- **Partitioning**: Time-based table partitioning for large datasets

## Database Migration

### Running the Migration
1. Execute `database-migration-auth-logs.sql` in your Supabase SQL editor
2. Verify table creation and RLS policies
3. Test with sample data if needed

### Sample Data (Optional)
```sql
INSERT INTO auth_logs (username, first_name, last_name, ip_address, action, success) VALUES
('admin@example.com', 'Admin', 'User', '127.0.0.1', 'login', true),
('user@example.com', 'Regular', 'User', '192.168.1.100', 'login', true),
('user@example.com', 'Regular', 'User', '192.168.1.100', 'logout', true),
('unknown@example.com', NULL, NULL, '203.0.113.0', 'failed_login', false);
```

## Troubleshooting

### Common Issues
- **Empty Table**: Ensure the `auth_logs` table exists and has data
- **Permission Errors**: Check RLS policies and user roles
- **Performance Issues**: Verify indexes are properly created
- **Styling Conflicts**: All CSS classes use unique `login-logs-*` prefix

### Debug Information
- Check browser console for JavaScript errors
- Verify Supabase connection and permissions
- Confirm database table structure matches schema
- Test with different user roles and permissions

## Security Considerations

### Data Privacy
- **IP Addresses**: Stored for security analysis
- **User Information**: Limited to essential authentication data
- **Retention Policy**: Consider implementing log rotation/archiving
- **Access Control**: Strict RLS policies prevent unauthorized access

### Compliance
- **GDPR**: Consider data retention and user consent
- **Audit Trail**: Maintains comprehensive authentication history
- **Data Minimization**: Only stores necessary authentication information
- **User Rights**: Users can view their own authentication data

---

*This functionality provides essential security monitoring and user activity tracking for the Sranan Kasmoni platform.*
