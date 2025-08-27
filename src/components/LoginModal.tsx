import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(credentials);
      if (result.success) {
        onClose();
        setCredentials({ username: '', password: '', rememberMe: false });
        setShowPassword(false);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordMessage('Please enter your email address');
      return;
    }

    setIsSendingRequest(true);
    setForgotPasswordMessage(null);

    try {
      console.log('Creating password reset request via messaging system...');
      
      // Create the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          subject: 'Password Reset Request',
          content: `User ${forgotPasswordEmail} has requested a password reset for email: ${forgotPasswordEmail}`,
          message_type: 'password_reset_request',
          sender_id: '00000000-0000-0000-0000-000000000000',
          sender_type: 'system',
          sender_ip_address: null
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw new Error('Failed to create password reset request');
      }

      console.log('Password reset request created successfully');

      // Get all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('role', 'admin');

      if (adminError) {
        console.error('Could not fetch admin users from auth_users table:', adminError);
        throw new Error('Failed to fetch admin users');
      }

      if (!adminUsers || adminUsers.length === 0) {
        throw new Error('No admin users found');
      }

      // Create message recipients for all admin users
      const recipientData = adminUsers.map((admin: { id: string }) => ({
        message_id: message.id,
        recipient_id: admin.id,
        is_read: false
      }));

      const { error: recipientError } = await supabase
        .from('message_recipients')
        .insert(recipientData);

      if (recipientError) {
        console.error('Error creating message recipients:', recipientError);
        throw new Error('Failed to create message recipients');
      }

      setForgotPasswordMessage('Password reset request sent successfully. An admin will contact you soon.');
      setForgotPasswordEmail('');
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Error sending password reset request:', error);
      setForgotPasswordMessage(error instanceof Error ? error.message : 'Failed to send password reset request');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <h2>{showForgotPassword ? 'Forgot Password' : 'Login'}</h2>
          <button className="login-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {!showForgotPassword ? (
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={credentials.rememberMe}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <span className="checkmark"></span>
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="form-footer">
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => setShowForgotPassword(true)}
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="forgot-password-form">
            {forgotPasswordMessage && (
              <div className={`forgot-password-message ${forgotPasswordMessage.includes('successfully') ? 'success' : 'error'}`}>
                {forgotPasswordMessage}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="forgot-email">Email Address</label>
              <input
                type="email"
                id="forgot-email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                disabled={isSendingRequest}
                placeholder="Enter your email address"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="forgot-password-submit-btn"
                disabled={isSendingRequest}
              >
                {isSendingRequest ? 'Sending...' : 'Send Reset Request'}
              </button>
              <button
                type="button"
                className="back-to-login-btn"
                onClick={resetForgotPassword}
                disabled={isSendingRequest}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
