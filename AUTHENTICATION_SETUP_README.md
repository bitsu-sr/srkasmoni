# Authentication System Setup Guide

This guide explains how to set up and use the authentication system for the SR Kasmoni application.

## Features

- **User Roles**: `admin`, `super_user`, `member`
- **Login System**: Username/password authentication with Supabase Auth
- **User Management**: Admin-only page for managing users
- **User Profile**: Users can view/edit their profile and change passwords
- **Role-Based Access Control**: Different permissions based on user roles
- **Session Persistence**: Unlimited sessions with "Remember me" functionality

## Immediate Setup Steps (Required to get login working)

### Step 1: Run Database Migration
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `database-migration-auth.sql`
4. Click "Run" to execute the migration
5. This will create the `auth_users` table and set up RLS policies

### Step 2: Create Admin User in Supabase Auth
1. In your Supabase dashboard, go to "Authentication" → "Users"
2. Click "Add User"
3. Fill in the following details:
   - **Email**: `admin@system.local`
   - **Password**: `Admin#123`
   - **Email Confirm**: Check this box
4. Click "Create User"
5. The user will be created in Supabase Auth

### Step 3: Insert Admin User into auth_users Table
1. Go back to the SQL Editor
2. Run this SQL command:
```sql
INSERT INTO auth_users (id, username, email, first_name, last_name, role) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@system.local'),
  'admin',
  'admin@system.local',
  'System',
  'Administrator',
  'admin'
) ON CONFLICT (username) DO NOTHING;
```

### Step 4: Test Login
1. Start your application
2. Click the "Login" button in the navbar
3. Use these credentials:
   - **Username**: `admin`
   - **Password**: `Admin#123`
4. You should now be able to log in successfully

## User Roles and Permissions

### Admin
- Full access to all features
- Can create, edit, and delete users
- Can manage groups, members, and payments
- Can access User Management page

### Super User
- View-only access to most features
- Cannot perform admin actions
- Same privileges as regular members (for now)

### Member
- View-only access to most features
- Cannot perform admin actions
- Can view their own profile and change password

## Usage

### Login
1. Click "Login" button in navbar
2. Enter username and password
3. Check "Remember me" if desired
4. Click "Login"

### User Management (Admin Only)
1. Navigate to User Management page
2. View all users in a table
3. Search/filter users
4. Perform bulk role updates
5. Create new users
6. Edit existing users
7. Generate passwords for users
8. Delete users

### User Profile
1. Click on your name in navbar dropdown
2. Select "View Profile" or "Edit Profile"
3. Update personal information
4. Change password
5. Delete account (if needed)

## Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access Control**: Functionality restricted by user role
- **Password Requirements**: Minimum 8 characters, 1 capital, 1 number, 1 special character
- **Session Management**: Secure session handling with Supabase Auth

## API Endpoints

The system uses Supabase Auth for authentication and custom `auth_users` table for user metadata.

## Database Schema

### auth_users Table
- `id`: UUID (references Supabase Auth user)
- `username`: VARCHAR(50) UNIQUE
- `email`: VARCHAR(255) UNIQUE
- `first_name`: VARCHAR(100)
- `last_name`: VARCHAR(100)
- `phone`: VARCHAR(20)
- `role`: VARCHAR(20) - 'admin', 'super_user', 'member'
- `profile_picture`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Troubleshooting

### "Invalid username or password" Error
1. Ensure you've run the database migration
2. Check that the admin user exists in Supabase Auth
3. Verify the admin user exists in the `auth_users` table
4. Check browser console for detailed error messages

### "auth_users table not found" Error
1. Run the database migration script
2. Check that the migration completed successfully
3. Verify the table exists in your Supabase database

### Login Not Working
1. Check Supabase project URL and ANON_KEY in `supabase-config.ts`
2. Ensure Supabase Auth is enabled in your project
3. Check that the admin user was created correctly
4. Verify RLS policies are set up correctly

## Future Enhancements

- Email verification for new users
- Password reset functionality
- Two-factor authentication
- User activity logging
- Advanced role permissions

## Security Notes

- Never commit API keys or sensitive credentials to version control
- Use environment variables for configuration
- Regularly review and update user permissions
- Monitor authentication logs for suspicious activity
- Implement proper password policies in production
