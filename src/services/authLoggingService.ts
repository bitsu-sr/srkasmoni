import { supabase } from '../lib/supabase';
import { getClientIP } from '../utils/ipDetection';

export interface AuthLogData {
  username: string;
  firstName?: string;
  lastName?: string;
  ipAddress: string;
  action: 'login' | 'logout' | 'failed_login';
  success: boolean;
  userAgent?: string;
  sessionId?: string;
  errorDetails?: string;
}

export class AuthLoggingService {
  // Get client IP address using improved detection
  private static async getClientIP(): Promise<string> {
    try {
      return await getClientIP();
    } catch (error) {
      console.warn('Error getting client IP:', error);
      return '127.0.0.1';
    }
  }

  // Get user agent string
  private static getUserAgent(): string {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.userAgent;
    }
    return 'Unknown';
  }

  // Get session ID if available
  private static getSessionId(): string | undefined {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem('supabase.auth.token') || undefined;
      }
    } catch (error) {
      console.warn('Could not get session ID:', error);
    }
    return undefined;
  }

  // Log authentication event
  static async logAuthEvent(logData: Omit<AuthLogData, 'ipAddress' | 'userAgent' | 'sessionId'>): Promise<void> {
    try {
      // Get additional context data
      const [ipAddress, userAgent, sessionId] = await Promise.all([
        this.getClientIP(),
        Promise.resolve(this.getUserAgent()),
        Promise.resolve(this.getSessionId())
      ]);

      // Prepare the complete log entry
      const completeLogData = {
        ...logData,
        ipAddress,
        userAgent,
        sessionId
      };

      // Insert into auth_logs table
      const { error } = await supabase
        .from('auth_logs')
        .insert({
          username: completeLogData.username,
          first_name: completeLogData.firstName || null,
          last_name: completeLogData.lastName || null,
          ip_address: completeLogData.ipAddress,
          action: completeLogData.action,
          success: completeLogData.success,
          user_agent: completeLogData.userAgent,
          session_id: completeLogData.sessionId,
          error_details: completeLogData.errorDetails || null,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log auth event:', error);
        // Don't throw error - logging failure shouldn't break authentication
      }
    } catch (error) {
      console.error('Error in auth logging:', error);
      // Don't throw error - logging failure shouldn't break authentication
    }
  }

  // Log successful login
  static async logSuccessfulLogin(username: string, firstName?: string, lastName?: string): Promise<void> {
    await this.logAuthEvent({
      username,
      firstName,
      lastName,
      action: 'login',
      success: true
    });
  }

  // Log failed login attempt
  static async logFailedLogin(username: string, errorDetails?: string): Promise<void> {
    try {
      await this.logAuthEvent({
        username,
        action: 'failed_login',
        success: false,
        errorDetails
      });
    } catch (error) {
      console.error('Error in logFailedLogin:', error);
      throw error; // Re-throw to see the error in the calling code
    }
  }

  // Log logout
  static async logLogout(username: string, firstName?: string, lastName?: string): Promise<void> {
    await this.logAuthEvent({
      username,
      firstName,
      lastName,
      action: 'logout',
      success: true
    });
  }

  // Log session timeout or other auth-related events
  static async logAuthEventCustom(data: AuthLogData): Promise<void> {
    await this.logAuthEvent(data);
  }
}
