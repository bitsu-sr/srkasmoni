import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService } from '../services/authService';
import { LoginCredentials, CreateUserData, UpdateUserData, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, updates: UpdateUserData) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperUser: () => boolean;
  canPerformAdminAction: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { user, error } = await AuthService.getCurrentUser();
      
      if (error) {
        console.warn('Auth check error:', error);
      }

      setState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
        error: null,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Authentication check failed',
      });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { user, error } = await AuthService.login(credentials);
      
      if (error || !user) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error || 'Login failed' 
        }));
        return { success: false, error: error || 'Login failed' };
      }

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await AuthService.logout();
      
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      
      // Note: Redirect will be handled by the component using this context
    } catch (error) {
      console.error('Logout error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Logout failed' 
      }));
    }
  };

  const createUser = async (userData: CreateUserData): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user, error } = await AuthService.createUser(userData);
      
      if (error || !user) {
        return { success: false, error: error || 'Failed to create user' };
      }

      return { success: true };
    } catch (error) {
      console.error('Create user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const updateUser = async (userId: string, updates: UpdateUserData): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user, error } = await AuthService.updateUser(userId, updates);
      
      if (error || !user) {
        return { success: false, error: error || 'Failed to update user' };
      }

      // If updating current user, update the state
      if (userId === state.user?.id) {
        setState(prev => ({ ...prev, user }));
      }

      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await AuthService.deleteUser(userId);
      
      if (error) {
        return { success: false, error };
      }

      // If deleting current user, log them out
      if (userId === state.user?.id) {
        await logout();
      }

      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const refreshUser = async (): Promise<void> => {
    await checkAuth();
  };

  const isAdmin = (): boolean => {
    return AuthService.isAdmin(state.user);
  };

  const isSuperUser = (): boolean => {
    return AuthService.isSuperUser(state.user);
  };

  const canPerformAdminAction = (): boolean => {
    return AuthService.canPerformAdminAction(state.user);
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    refreshUser,
    isAdmin,
    isSuperUser,
    canPerformAdminAction,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
