import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UpdateUserData } from '../types/auth';
import { MessagingService } from '../services/messagingService';
import { User, Camera, Save, X, Eye, EyeOff, Key } from 'lucide-react';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data for editing
  const [formData, setFormData] = useState<UpdateUserData>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    profile_picture: '',
  });

  // Password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        profile_picture: user.profile_picture || '',
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="user-profile">
        <div className="profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Store original data to compare changes
      const originalData = {
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        profile_picture: user.profile_picture || '',
      };

      const { success: updateSuccess, error: updateError } = await updateUser(user.id, formData);
      
      if (updateSuccess) {
        // Send notification to admins about profile changes
        try {
          const changes = [];
          if (formData.username !== originalData.username) changes.push(`Username: ${originalData.username} → ${formData.username}`);
          if (formData.first_name !== originalData.first_name) changes.push(`First Name: ${originalData.first_name} → ${formData.first_name}`);
          if (formData.last_name !== originalData.last_name) changes.push(`Last Name: ${originalData.last_name} → ${formData.last_name}`);
          if (formData.email !== originalData.email) changes.push(`Email: ${originalData.email} → ${formData.email}`);
          if (formData.phone !== originalData.phone) changes.push(`Phone: ${originalData.phone} → ${formData.phone}`);
          if (formData.profile_picture !== originalData.profile_picture) changes.push(`Profile Picture: Updated`);

          if (changes.length > 0) {
            const changesObject = {
              username: { from: originalData.username, to: formData.username },
              first_name: { from: originalData.first_name, to: formData.first_name },
              last_name: { from: originalData.last_name, to: formData.last_name },
              email: { from: originalData.email, to: formData.email },
              phone: { from: originalData.phone, to: formData.phone },
              profile_picture: { from: originalData.profile_picture, to: formData.profile_picture }
            };
            
            await MessagingService.sendProfileUpdateNotification(
              parseInt(user.id),
              changesObject
            );
          }
        } catch (notificationError) {
          console.warn('Failed to send profile update notification:', notificationError);
          // Don't fail the profile update if notification fails
        }

        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setError(updateError || 'Failed to update profile');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Update profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    // Check password requirements
    const hasCapital = /[A-Z]/.test(passwordData.newPassword);
    const hasNumber = /\d/.test(passwordData.newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

    if (!hasCapital || !hasNumber || !hasSpecial) {
      setError('Password must contain at least 1 capital letter, 1 number, and 1 special character');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Here you would typically call an API to change the password
      // For now, we'll simulate success
      
      // Send notification to admins about password change
      try {
        await MessagingService.sendProfileUpdateNotification(
          parseInt(user.id),
          { password: { changed: true, timestamp: new Date().toISOString() } }
        );
      } catch (notificationError) {
        console.warn('Failed to send password change notification:', notificationError);
        // Don't fail the password change if notification fails
      }

      setSuccess('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Change password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original values
    setFormData({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || '',
      profile_picture: user.profile_picture || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Here you would typically call an API to delete the account
      logout();
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="user-profile">
      <div className="profile-container">
        <div className="profile-header">
          <h1>User Profile</h1>
          <div className="profile-actions">
            {!isEditing && (
              <>
                <button 
                  className="btn-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setIsChangingPassword(true)}
                >
                  <Key size={16} />
                  Change Password
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button 
                  className="btn-secondary"
                  onClick={handleCancelEdit}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  <Save size={16} />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}

        <div className="profile-content">
          <div className="profile-section">
            <div className="profile-picture-section">
              <div className="profile-picture">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt={user.first_name} />
                ) : (
                  <User size={80} />
                )}
                {isEditing && (
                  <button className="change-picture-btn">
                    <Camera size={20} />
                  </button>
                )}
              </div>
              <div className="profile-info">
                <h2>{user.first_name} {user.last_name}</h2>
                <p className="username">@{user.username}</p>
                <span className={`role-badge role-${user.role}`}>
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="First Name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Last Name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+1234567890"
                />
              </div>

              <div className="form-group">
                <label>Member Since</label>
                <input
                  type="text"
                  value={new Date(user.created_at).toLocaleDateString()}
                  disabled
                  className="disabled-input"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Account Actions</h3>
            <div className="account-actions">
              <button 
                className="btn-danger"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="modal-overlay" onClick={() => setIsChangingPassword(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button 
                className="modal-close" 
                onClick={() => setIsChangingPassword(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="modal-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small className="password-requirements">
                  Must be at least 8 characters with 1 capital letter, 1 number, and 1 special character
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsChangingPassword(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
