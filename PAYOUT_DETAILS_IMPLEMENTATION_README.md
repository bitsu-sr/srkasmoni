# Payout Details Implementation

## Overview
This implementation adds a new "payouts" database table and modifies the Payout Details modal to include Save/Update functionality for Last Slot and Administration Fee toggle states.

## Database Changes

### New Table: `payouts`
- **group_id**: References groups table
- **member_id**: References members table  
- **monthly_amount**: Monthly contribution amount
- **duration**: Number of months
- **last_slot**: Boolean for Last Slot toggle state
- **administration_fee**: Boolean for Administration Fee toggle state
- **payout**: Boolean for payout status (defaults to false)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

### Database Migration
Run `database-migration-payouts-table.sql` to create the new table with proper indexes and RLS policies.

## Code Changes

### 1. Types (`src/types/payout.ts`)
- Added new fields to `Payout` interface: `lastSlot`, `administrationFee`, `payout`
- Added new `PayoutDetails` interface for modal data management

### 2. New Service (`src/services/payoutDetailsService.ts`)
- `getPayoutDetails()`: Retrieves existing payout details
- `savePayoutDetails()`: Saves or updates payout details
- `payoutDetailsExist()`: Checks if payout details exist

### 3. Updated Payouts Component (`src/pages/Payouts.tsx`)
- Added state for payout details management
- Modified `handleViewDetails()` to load existing data when modal opens
- Added `handleSavePayoutDetails()` function
- Added Save/Update button to modal footer

### 4. Updated Payout Service (`src/services/payoutService.ts`)
- Added default values for new fields when creating payout objects

### 5. CSS Updates (`src/pages/Payouts.css`)
- Added styles for the new Save/Update button

## Modal Behavior

### Save/Update Button
- **Text**: Shows "Save" for new records, "Update" for existing records
- **Functionality**: Saves Last Slot and Administration Fee toggle states to database
- **State**: Button shows loading state while saving

### Data Persistence
- **Saved Data**: Last Slot and Administration Fee toggle states
- **Not Saved**: Base Amount and Settled Deduction (calculated dynamically)
- **Retrieval**: Saved data is loaded when modal reopens

## Usage

### 1. Open Payout Details Modal
- Click "View Details" on any payout record
- Modal loads with existing data if available, or default values

### 2. Modify Toggle States
- Toggle "Last Slot" switch
- Toggle "Administration Fee" switch

### 3. Save Changes
- Click "Save" or "Update" button
- Data is persisted to database
- Button text updates to reflect current state

### 4. Close and Reopen
- Modal remembers saved toggle states
- Base Amount and Settled Deduction recalculate as before

## Mock Data Implementation
The implementation currently uses mock data and database calls. The database table structure is ready for production use.

## Future Enhancements
- Add toast notifications for save success/error
- Implement real-time updates
- Add audit logging for changes
- Implement bulk operations for multiple payouts

## Testing
1. Run the database migration
2. Open the Payouts page
3. Click "View Details" on any payout
4. Toggle the switches and click Save/Update
5. Close and reopen the modal to verify persistence
