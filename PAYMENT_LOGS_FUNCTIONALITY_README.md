# Payment Logs Functionality

## Overview

The Payment Logs system provides comprehensive tracking of all payment-related activities in the SR Kasmoni application. It automatically logs every payment creation, update, deletion, and status change with detailed timestamps and change tracking.

## Features

### 🔍 **Automatic Logging**
- **Payment Creation**: Logs when new payments are created
- **Payment Updates**: Tracks all field changes with before/after values
- **Payment Deletion**: Records when payments are deleted
- **Status Changes**: Monitors payment status transitions

### 📊 **Comprehensive Tracking**
- **Member Information**: Links logs to specific members
- **Group Information**: Associates logs with payment groups
- **Payment Details**: Tracks amounts, methods, dates, and notes
- **Bank Information**: Monitors sender and receiver bank changes
- **Fine Details**: Tracks late payment fines and penalties

### 🕒 **Timestamp Management**
- **Automatic Timestamps**: Each log entry includes creation timestamp
- **Local Timezone**: Displays timestamps in user's current timezone
- **Chronological Order**: Logs are sorted by creation time (newest first)

### 🚫 **Immutable Logs**
- **No Deletion**: Log entries cannot be deleted
- **No Updates**: Log entries cannot be modified
- **Audit Trail**: Maintains complete historical record

## Database Structure

### Payment Logs Table

```sql
CREATE TABLE payment_logs (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  member_id BIGINT REFERENCES members(id) ON DELETE SET NULL,
  group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
  slot_id BIGINT REFERENCES payment_slots(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_amount DECIMAL(12,2),
  new_amount DECIMAL(12,2),
  old_payment_method VARCHAR(20),
  new_payment_method VARCHAR(20),
  old_notes TEXT,
  new_notes TEXT,
  old_payment_date DATE,
  new_payment_date DATE,
  old_fine_amount DECIMAL(12,2),
  new_fine_amount DECIMAL(12,2),
  old_is_late_payment BOOLEAN,
  new_is_late_payment BOOLEAN,
  old_sender_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  new_sender_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  old_receiver_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  new_receiver_bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
  changes_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Automatic Triggers

The system uses PostgreSQL triggers to automatically log all payment changes:

```sql
CREATE TRIGGER log_payment_changes
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_payment_change();
```

## Frontend Components

### PaymentLogs Page (`/payment-logs`)

**Location**: `src/pages/PaymentLogs.tsx`

**Features**:
- **Statistics Dashboard**: Shows total logs, updates, deletions, and today's activity
- **Advanced Filtering**: Filter by action type, date range, member, or group
- **Search Functionality**: Search across member names, group names, and change descriptions
- **Responsive Table**: Displays logs with action badges, member info, changes, and timestamps
- **Real-time Updates**: Uses React Query for efficient data fetching and caching

### Key Components

1. **Statistics Cards**
   - Total Logs Count
   - Updates Count
   - Deletions Count
   - Today's Activity Count

2. **Search & Filters**
   - Text search across member/group names
   - Action type filter (created, updated, deleted, status_changed)
   - Date range filters
   - Member and group specific filters

3. **Logs Table**
   - Action badges with color coding
   - Member and group information
   - Change summaries
   - Amount tracking (old vs new)
   - Status badges
   - Localized timestamps

## API Services

### PaymentLogService

**Location**: `src/services/paymentLogService.ts`

**Methods**:
- `getPaymentLogs(filters?)`: Fetch all logs with optional filtering
- `getMemberPaymentLogs(memberId)`: Get logs for specific member
- `getGroupPaymentLogs(groupId)`: Get logs for specific group
- `getRecentPaymentLogs(limit)`: Get recent logs for dashboard
- `getPaymentLogStats()`: Get comprehensive statistics

## Data Types

### PaymentLog Interface

```typescript
export interface PaymentLog {
  id: number
  paymentId?: number
  memberId?: number
  groupId?: number
  slotId?: number
  action: 'created' | 'updated' | 'deleted' | 'status_changed'
  oldStatus?: string
  newStatus?: string
  oldAmount?: number
  newAmount?: number
  oldPaymentMethod?: string
  newPaymentMethod?: string
  oldNotes?: string
  newNotes?: string
  oldPaymentDate?: string
  newPaymentDate?: string
  oldFineAmount?: number
  newFineAmount?: number
  oldIsLatePayment?: boolean
  newIsLatePayment?: boolean
  oldSenderBankId?: number
  newSenderBankId?: number
  oldReceiverBankId?: number
  newReceiverBankId?: number
  changesSummary?: string
  createdAt: string
  member?: { id: number; firstName: string; lastName: string }
  group?: { id: number; name: string }
  slot?: { id: number; monthDate: string }
  senderBank?: { id: number; name: string }
  receiverBank?: { id: number; name: string }
}
```

## Usage Examples

### Viewing All Payment Logs

Navigate to `/payment-logs` to see all payment activity:

1. **Dashboard Overview**: View statistics at the top
2. **Search**: Use the search bar to find specific members or groups
3. **Filter**: Click "Filters" to apply date ranges or action types
4. **Browse**: Scroll through the chronological log table

### Filtering Logs

```typescript
// Filter by action type
const filters = { action: 'updated' }

// Filter by date range
const filters = { 
  startDate: '2024-01-01', 
  endDate: '2024-01-31' 
}

// Filter by member
const filters = { memberId: 123 }

// Combine multiple filters
const filters = {
  action: 'status_changed',
  startDate: '2024-01-01',
  groupId: 456
}
```

### Accessing Logs Programmatically

```typescript
import { paymentLogService } from '../services/paymentLogService'

// Get all logs
const allLogs = await paymentLogService.getPaymentLogs()

// Get member-specific logs
const memberLogs = await paymentLogService.getMemberPaymentLogs(123)

// Get recent activity
const recentLogs = await paymentLogService.getRecentPaymentLogs(10)

// Get statistics
const stats = await paymentLogService.getPaymentLogStats()
```

## Security & Permissions

### Row Level Security (RLS)

The `payment_logs` table has RLS enabled with the following policies:

- **Read Access**: Public read access for all authenticated users
- **Insert Access**: Public insert access (for triggers)
- **No Update/Delete**: Logs cannot be modified or deleted

### Data Integrity

- **Foreign Key Constraints**: All references maintain referential integrity
- **Cascade Handling**: Deleted payments set log references to NULL
- **Immutable Records**: Once created, log entries are permanent

## Performance Considerations

### Indexing

The system includes optimized indexes for common query patterns:

```sql
CREATE INDEX idx_payment_logs_payment_id ON payment_logs(payment_id);
CREATE INDEX idx_payment_logs_member_id ON payment_logs(member_id);
CREATE INDEX idx_payment_logs_group_id ON payment_logs(group_id);
CREATE INDEX idx_payment_logs_action ON payment_logs(action);
CREATE INDEX idx_payment_logs_created_at ON payment_logs(created_at);
```

### Caching

- **React Query**: Frontend caching with 5-minute stale time
- **Efficient Queries**: Optimized database queries with proper joins
- **Pagination Ready**: Table structure supports future pagination implementation

## Migration & Setup

### Database Migration

Run the migration script in your Supabase SQL Editor:

```sql
-- Run the contents of database-migration-payment-logs.sql
```

### Verification

After migration, verify the setup:

1. **Table Creation**: Check that `payment_logs` table exists
2. **Trigger Creation**: Verify `log_payment_changes` trigger is active
3. **Function Creation**: Confirm `log_payment_change()` function exists
4. **Permissions**: Ensure RLS policies are properly configured

## Troubleshooting

### Common Issues

1. **Logs Not Appearing**
   - Check if triggers are active
   - Verify RLS policies allow insert operations
   - Confirm function permissions

2. **Performance Issues**
   - Ensure indexes are created
   - Check query execution plans
   - Monitor table size and growth

3. **Missing Data**
   - Verify foreign key relationships
   - Check cascade delete settings
   - Review trigger function logic

### Debug Queries

```sql
-- Check if triggers are active
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'log_payment_changes';

-- Verify log entries
SELECT COUNT(*) FROM payment_logs;

-- Check recent activity
SELECT * FROM payment_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

## Future Enhancements

### Planned Features

1. **Export Functionality**: CSV/PDF export of log data
2. **Advanced Analytics**: Trend analysis and reporting
3. **Notification System**: Alerts for specific log events
4. **Bulk Operations**: Batch processing for large datasets
5. **API Endpoints**: RESTful API for external integrations

### Scalability Considerations

- **Partitioning**: Table partitioning for large datasets
- **Archiving**: Automated archiving of old logs
- **Compression**: Data compression for storage optimization
- **Monitoring**: Performance monitoring and alerting

## Support & Maintenance

### Regular Maintenance

- **Index Maintenance**: Regular index rebuilds for performance
- **Data Cleanup**: Archive old logs based on retention policies
- **Performance Monitoring**: Track query performance and optimize
- **Backup Verification**: Ensure log data is included in backups

### Monitoring Queries

```sql
-- Monitor log growth
SELECT 
  DATE(created_at) as log_date,
  COUNT(*) as log_count
FROM payment_logs 
GROUP BY DATE(created_at)
ORDER BY log_date DESC
LIMIT 30;

-- Check action distribution
SELECT 
  action,
  COUNT(*) as count
FROM payment_logs 
GROUP BY action
ORDER BY count DESC;
```

---

This Payment Logs system provides comprehensive audit trails for all payment activities, ensuring transparency, accountability, and historical record-keeping in the SR Kasmoni application.
