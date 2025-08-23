import { supabase } from '../lib/supabase';
import { AuthUser, LoginCredentials, CreateUserData, UpdateUserData } from '../types/auth';

export class AuthService {
  // Login with username (case-insensitive) and password
  static async login(credentials: LoginCredentials): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('Login attempt with username:', credentials.username);
      
      // For now, let's use a simple approach - try to login with the username as email
      // This assumes the username is also the email (like admin@system.local)
      let email = credentials.username;
      
      // If username doesn't contain @, assume it's admin and use the system email
      if (!email.includes('@')) {
        if (email.toLowerCase() === 'admin') {
          email = 'admin@system.local';
          console.log('Username is admin, using email:', email);
        } else {
          // For other usernames, try to find them in auth_users table if it exists
          try {
            console.log('Looking up user in auth_users table...');
            const { data: users, error: searchError } = await supabase
              .from('auth_users')
              .select('*')
              .ilike('username', credentials.username)
              .single();

            if (!searchError && users) {
              email = users.email;
              console.log('Found user in auth_users table, using email:', email);
            } else {
              console.log('User not found in auth_users table, search error:', searchError);
            }
          } catch (tableError) {
            // Table doesn't exist yet, continue with username as email
            console.log('auth_users table not found, using username as email');
          }
        }
      }

      console.log('Attempting Supabase Auth login with email:', email);
      
      // Now authenticate with Supabase using the email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        });
        return { user: null, error: 'Invalid username or password' };
      }

      if (authData.user) {
        console.log('Supabase Auth successful, user ID:', authData.user.id);
        
        // Try to get user data from auth_users table if it exists
        try {
          console.log('Looking up user data in auth_users table...');
          const { data: userData, error: userError } = await supabase
            .from('auth_users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (!userError && userData) {
            console.log('Found user data in auth_users table:', userData);
            return { user: userData, error: null };
          } else {
            console.log('User data not found in auth_users table, error:', userError);
          }
        } catch (tableError) {
          // Table doesn't exist yet, create a basic user object from auth data
          console.log('auth_users table not found, creating basic user object');
        }

        // If we can't get from auth_users table, create a basic user object
        const basicUser: AuthUser = {
          id: authData.user.id,
          username: credentials.username,
          email: authData.user.email || email,
          first_name: 'User',
          last_name: '',
          phone: '',
          role: 'admin', // Assume admin for now if table doesn't exist
          profile_picture: undefined,
          created_at: authData.user.created_at,
          updated_at: authData.user.updated_at,
        };

        console.log('Created basic user object:', basicUser);
        return { user: basicUser, error: null };
      }

      console.log('No auth data returned from Supabase');
      return { user: null, error: 'Authentication failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  // Logout
  static async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Logout error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { user: null, error: null };
      }

      // Try to get user data from auth_users table if it exists
      try {
        const { data: userData, error: userError } = await supabase
          .from('auth_users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          return { user: userData, error: null };
        }
      } catch (tableError) {
        // Table doesn't exist yet, create a basic user object
        console.log('auth_users table not found, creating basic user object');
      }

      // If we can't get from auth_users table, create a basic user object
      const basicUser: AuthUser = {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        email: user.email || '',
        first_name: 'User',
        last_name: '',
        phone: '',
        role: 'admin', // Assume admin for now if table doesn't exist
        profile_picture: undefined,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      return { user: basicUser, error: null };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  // Create new user (admin only)
  static async createUser(userData: CreateUserData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Generate a random password if none provided
      const password = userData.password || this.generatePassword();

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: password,
        email_confirm: true,
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (authData.user) {
        // Try to create user record in our custom table if it exists
        try {
          const { data: userRecord, error: userError } = await supabase
            .from('auth_users')
            .insert({
              id: authData.user.id,
              username: userData.username.toLowerCase(),
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              phone: userData.phone,
              role: userData.role,
            })
            .select()
            .single();

          if (!userError) {
            return { user: userRecord, error: null };
          }
        } catch (tableError) {
          // Table doesn't exist yet, create a basic user object
          console.log('auth_users table not found, creating basic user object');
        }

        // If we can't create in auth_users table, create a basic user object
        const basicUser: AuthUser = {
          id: authData.user.id,
          username: userData.username,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone || '',
          role: userData.role,
          profile_picture: undefined,
          created_at: authData.user.created_at,
          updated_at: authData.user.updated_at,
        };

        return { user: basicUser, error: null };
      }

      return { user: null, error: 'Failed to create user' };
    } catch (error) {
      console.error('Create user error:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  // Update user (admin only, or user updating their own profile)
  static async updateUser(userId: string, updates: UpdateUserData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Try to update in auth_users table if it exists
      try {
        const { data: user, error } = await supabase
          .from('auth_users')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();

        if (!error) {
          return { user, error: null };
        }
      } catch (tableError) {
        // Table doesn't exist yet
        console.log('auth_users table not found, cannot update user');
      }

      return { user: null, error: 'User table not found' };
    } catch (error) {
      console.error('Update user error:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  // Delete user (admin only)
  static async deleteUser(userId: string): Promise<{ error: string | null }> {
    try {
      // Try to delete from auth_users table if it exists
      try {
        const { error: userError } = await supabase
          .from('auth_users')
          .delete()
          .eq('id', userId);

        if (userError) {
          console.log('Error deleting from auth_users:', userError);
        }
      } catch (tableError) {
        // Table doesn't exist yet
        console.log('auth_users table not found, skipping table deletion');
      }

      // Delete from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        return { error: authError.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Delete user error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<{ users: AuthUser[] | null; error: string | null }> {
    try {
      // Try to get users from auth_users table if it exists
      try {
        const { data: users, error } = await supabase
          .from('auth_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error) {
          return { users, error: null };
        }
      } catch (tableError) {
        // Table doesn't exist yet
        console.log('auth_users table not found, cannot get users');
      }

      return { users: null, error: 'User table not found' };
    } catch (error) {
      console.error('Get all users error:', error);
      return { users: null, error: 'An unexpected error occurred' };
    }
  }

  // Generate random password
  static generatePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'A'; // Capital letter
    password += '1'; // Number
    password += '!'; // Special character
    
    // Fill the rest randomly
    for (let i = 3; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Check if user has admin privileges
  static isAdmin(user: AuthUser | null): boolean {
    return user?.role === 'admin';
  }

  // Check if user has super user privileges
  static isSuperUser(user: AuthUser | null): boolean {
    return user?.role === 'super_user' || user?.role === 'admin';
  }

  // Check if user can perform admin actions
  static canPerformAdminAction(user: AuthUser | null): boolean {
    return this.isAdmin(user);
  }
}
