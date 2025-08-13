# Group Management Functionality

This document describes the new group management features implemented in the SR Kasmoni application.

## Features Implemented

### 1. Groups Page with Tiles
- **Group Tiles**: Each group is displayed as a card showing:
  - Group name and description
  - Monthly amount (SRD)
  - Number of members (current/maximum)
  - Duration in months
  - Time period (start month - end month)
- **Action Buttons**: Each tile has view, edit, and delete actions
- **Create New Group**: Button to add new groups

### 2. Group Creation/Editing
- **Required Fields**:
  - Group Name
  - Monthly Amount (SRD)
  - Maximum Members
  - Duration (months)
  - Start Month
- **Auto-calculated**: End month is automatically calculated as (start month + duration - 1)
- **Validation**: Form validation ensures all required fields are filled

### 3. Group Details Page
- **Complete Group Information**: Shows all group details in an overview
- **Member Management**: 
  - Lists all current group members
  - Shows assigned month for each member
  - Add new members button (when group isn't full)
  - Remove members from group
- **Group Actions**: Edit and delete group options

### 4. Member Assignment System
- **Month Selection**: Members are assigned to specific months
- **Unique Assignment**: Two members cannot be assigned to the same month
- **Available Months**: System shows only available months for selection
- **Member Search**: Search through existing members to add to groups

## Database Schema Changes

### New Tables
```sql
-- Updated groups table with new fields
CREATE TABLE groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  monthly_amount DECIMAL(12,2) NOT NULL,
  max_members INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  end_month INTEGER NOT NULL CHECK (end_month >= 1 AND end_month <= 12),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New group_members table for member assignments
CREATE TABLE group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  assigned_month INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, member_id),
  UNIQUE(group_id, assigned_month)
);
```

## Usage Instructions

### Creating a New Group
1. Navigate to the Groups page
2. Click "Create New Group" button
3. Fill in the required information:
   - Group name
   - Description (optional)
   - Monthly amount in SRD
   - Maximum number of members
   - Duration in months
   - Start month
4. Click "Create Group"

### Adding Members to a Group
1. Navigate to the Group Details page
2. Click "Add Member" button
3. Search and select a member from the list
4. Choose an available month for the member
5. Click "Add Member"

### Managing Group Members
- **View Members**: See all members and their assigned months
- **Remove Members**: Click the remove button to remove a member
- **Month Assignment**: Each member is assigned to a unique month

### Editing Groups
1. From the Groups page, click the edit button on a group tile
2. Or from Group Details, click "Edit Group"
3. Modify the group information
4. Click "Save Changes"

### Deleting Groups
1. From the Groups page, click the delete button on a group tile
2. Or from Group Details, click "Delete Group"
3. Confirm the deletion

## Technical Implementation

### Components Created
- `GroupModal`: For creating and editing groups
- `MemberSelectionModal`: For adding members to groups
- `GroupDetails`: Page showing complete group information
- Updated `Groups`: Page with group tiles and management

### Services Updated
- `groupService`: Extended with new group management functions
- Member management within groups
- Month availability checking

### Types Added
- `Group`: Interface for group data
- `GroupMember`: Interface for group member assignments
- `GroupFormData`: Interface for group creation/editing

## Sample Data

The database schema includes sample groups and member assignments to demonstrate the functionality:

- Group A: 8 members, 8 months, SRD 2000/month
- Group B: 6 members, 6 months, SRD 1500/month
- Group C: 12 members, 12 months, SRD 3000/month
- Group D: 10 members, 10 months, SRD 2500/month

## Future Enhancements

Potential improvements for future versions:
- Payment tracking within groups
- Group progress visualization
- Member payment history
- Group statistics and analytics
- Automated month progression
- Payment reminders and notifications

