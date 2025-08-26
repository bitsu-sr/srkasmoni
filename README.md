# Password Reset System

## Overview
The password reset system uses the existing messaging infrastructure to notify administrators when users request password resets.

## How It Works
1. **User requests password reset** from the login modal
2. **System user creates message** in the messaging system
3. **All admins are notified** via message recipients
4. **Admins see requests** in their existing message inbox
5. **Admins can respond** using the existing messaging system

## System Approach
- **Special Sender ID**: `00000000-0000-0000-0000-000000000000`
- **Message Type**: `password_reset_request`
- **Purpose**: Allows unauthenticated users to send password reset messages
- **Security**: RLS policies ensure only password reset messages can use this sender ID

## Benefits
- ✅ **Uses existing infrastructure** - No new tables or complex storage
- ✅ **Consistent user experience** - Admins see requests in familiar interface
- ✅ **No context issues** - Messaging system already works across components
- ✅ **Simple implementation** - Just one system user and existing messaging
- ✅ **Better organization** - Password requests are categorized messages

## Setup
1. Run the SQL migration to set up RLS policies for password reset messages
2. Ensure `password_reset_request` is a valid message type (already included)
3. The system is ready to use

## Usage
1. Users click "Forgot your password?" in login modal
2. They enter their email and submit
3. System creates a message and notifies all admins
4. Admins see the request in their message inbox
5. Admins can respond directly to the user via messaging

## Message Details
- **Subject**: "Password Reset Request"
- **Content**: Includes username and email of requester
- **Type**: `password_reset_request`
- **Priority**: `high`
- **Recipients**: All admin users
