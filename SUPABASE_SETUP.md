# Supabase Setup Guide for SR Kasmoni

This guide will walk you through setting up Supabase as your database for the SR Kasmoni application.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign in with GitHub
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `srkasmoni` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait for the project to be ready (usually 2-3 minutes)

### 2. Get Your Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 3. Configure Your Application

#### Option A: Environment Variables (Recommended)

1. Create a `.env.local` file in your project root:
```bash
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Replace the placeholder values with your actual credentials

#### Option B: Update Config File

1. Open `src/config/supabase-config.ts`
2. Replace the placeholder values:
```typescript
export const SUPABASE_CONFIG = {
  URL: 'https://your-project.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### 4. Set Up Your Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `database-schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the schema

This will create:
- `members` table with all necessary fields
- `groups` table for organizing members
- Sample data to get you started
- Proper indexes for performance
- Row Level Security policies

### 5. Test Your Setup

1. Start your development server: `npm run dev`
2. Go to the Members page
3. You should see the sample members loaded from Supabase
4. Try adding, editing, or deleting a member

## 🔧 Configuration Details

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your public anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Database Schema

The application uses two main tables:

#### Members Table
- **id**: Unique identifier
- **name**: Member's full name
- **phone**: Contact phone number
- **email**: Contact email address
- **location**: Member's location/city
- **groups**: Array of group names
- **total_paid**: Total amount paid by member
- **total_received**: Total amount received by member
- **status**: Member status (active/pending/overdue/inactive)
- **last_payment**: Date of last payment
- **next_payment**: Date of next expected payment
- **join_date**: When member joined
- **notes**: Additional notes about member

#### Groups Table
- **id**: Unique identifier
- **name**: Group name
- **description**: Group description
- **created_at**: When group was created
- **updated_at**: When group was last updated

## 🛡️ Security Features

### Row Level Security (RLS)
- Enabled on all tables
- Public read/write access (configurable)
- Can be restricted to authenticated users only

### Data Validation
- Email format validation
- Phone number validation
- Status enum validation
- Required field constraints

## 📱 Features

### Member Management
- ✅ Create new members
- ✅ Edit existing members
- ✅ Delete members
- ✅ Search and filter members
- ✅ Status tracking
- ✅ Payment tracking
- ✅ Group assignments

### Real-time Updates
- Automatic data synchronization
- Live updates across all connected clients
- Optimistic UI updates

## 🚨 Troubleshooting

### Common Issues

#### "Missing Supabase environment variables"
- Check that your `.env.local` file exists
- Verify the variable names are correct
- Restart your development server

#### "Failed to load members"
- Check your Supabase project is running
- Verify your API credentials
- Check the browser console for detailed errors
- Ensure the database schema has been created

#### "Permission denied"
- Check Row Level Security policies
- Verify your anon key is correct
- Check table permissions in Supabase

### Debug Mode

Enable debug logging by adding this to your browser console:
```javascript
localStorage.setItem('supabase.debug', 'true')
```

## 🔄 Database Migrations

When you need to update your database schema:

1. Make changes in Supabase SQL Editor
2. Test thoroughly
3. Document changes in `database-schema.sql`
4. Consider using Supabase migrations for production

## 📊 Monitoring

### Supabase Dashboard
- Monitor database performance
- View query logs
- Check storage usage
- Monitor API usage

### Application Logs
- Check browser console for errors
- Monitor network requests
- Use React DevTools for state debugging

## 🚀 Production Deployment

### Vercel Deployment
1. Add environment variables in Vercel dashboard
2. Deploy your application
3. Verify Supabase connection works

### Environment Variables in Production
- Never commit `.env.local` to version control
- Use Vercel's environment variable system
- Keep your anon key public (it's designed to be public)

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Design Best Practices](https://supabase.com/docs/guides/database/best-practices)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check the browser console for error messages
4. Verify your database schema matches the provided SQL

---

**Note**: This setup provides a fully functional member management system with real-time database integration. The application will fall back to mock data if Supabase is not configured, ensuring it always works for development and testing.
