import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { AuthUser, CreateUserData, UserRole } from '../types/auth';
import { Plus, Search, Edit, Trash2, Key, Copy, Check } from 'lucide-react';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AuthUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      window.location.href = '/';
    }
  }, [isAdmin]);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { users: userList, error: userError } = await AuthService.getAllUsers();
      
      if (userError) {
        setError(userError);
        return;
      }

      if (userList) {
        setUsers(userList);
        setFilteredUsers(userList);
      }
    } catch (error) {
      setError('Failed to load users');
      console.error('Load users error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserData) => {
    try {
      const { success, error: createError } = await AuthService.createUser(userData);
      
      if (success) {
        setIsCreateModalOpen(false);
        await loadUsers();
        // Show generated password
        const password = userData.password || AuthService.generatePassword();
        setGeneratedPassword(password);
        setShowPassword(true);
        setTimeout(() => {
          setShowPassword(false);
          setGeneratedPassword(null);
        }, 10000);
      } else {
        setError(createError || 'Failed to create user');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Create user error:', error);
    }
  };

  const handleEditUser = async (userId: string, updates: Partial<CreateUserData>) => {
    try {
      const { success, error: updateError } = await AuthService.updateUser(userId, updates);
      
      if (success) {
        setIsEditModalOpen(false);
        setEditingUser(null);
        await loadUsers();
      } else {
        setError(updateError || 'Failed to update user');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Update user error:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { success, error: deleteError } = await AuthService.deleteUser(userId);
      
      if (success) {
        await loadUsers();
      } else {
        setError(deleteError || 'Failed to delete user');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Delete user error:', error);
    }
  };

  const handleBulkRoleUpdate = async (role: UserRole) => {
    if (selectedUsers.length === 0) {
      setError('Please select users to update');
      return;
    }

    if (!confirm(`Are you sure you want to update ${selectedUsers.length} users to ${role} role?`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedUsers) {
        const { success } = await AuthService.updateUser(userId, { role });
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        setError(`${successCount} users updated successfully, ${errorCount} failed`);
      } else {
        setError(null);
      }

      setSelectedUsers([]);
      await loadUsers();
    } catch (error) {
      setError('An unexpected error occurred during bulk update');
      console.error('Bulk update error:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show temporary success indicator
      const copyBtn = document.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.innerHTML = '<Check size={16} /> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = '<Copy size={16} /> Copy';
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <button 
          className="create-user-btn"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={20} />
          Create User
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showPassword && generatedPassword && (
        <div className="password-display">
          <div className="password-content">
            <h3>Generated Password</h3>
            <div className="password-field">
              <input 
                type="text" 
                value={generatedPassword} 
                readOnly 
                className="password-input"
              />
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(generatedPassword)}
              >
                <Copy size={16} /> Copy
              </button>
            </div>
            <p>This password will be hidden in 10 seconds</p>
          </div>
        </div>
      )}

      <div className="user-management-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="bulk-buttons">
              <button 
                className="bulk-btn member-btn"
                onClick={() => handleBulkRoleUpdate('member')}
              >
                Set as Member
              </button>
              <button 
                className="bulk-btn super-user-btn"
                onClick={() => handleBulkRoleUpdate('super_user')}
              >
                Set as Super User
              </button>
              <button 
                className="bulk-btn admin-btn"
                onClick={() => handleBulkRoleUpdate('admin')}
              >
                Set as Admin
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="users-table-container">
        {isLoading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="select-checkbox"
                  />
                </th>
                <th>Username</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="select-checkbox"
                    />
                  </td>
                  <td>{user.username}</td>
                  <td>{user.first_name}</td>
                  <td>{user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => {
                          setEditingUser(user);
                          setIsEditModalOpen(true);
                        }}
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn generate-btn"
                        onClick={() => {
                          const password = AuthService.generatePassword();
                          setGeneratedPassword(password);
                          setShowPassword(true);
                          setTimeout(() => {
                            setShowPassword(false);
                            setGeneratedPassword(null);
                          }, 10000);
                        }}
                        title="Generate New Password"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete User"
                        disabled={user.username === 'admin'} // Prevent deleting system admin
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={handleEditUser}
          user={editingUser}
        />
      )}
    </div>
  );
};

// Create User Modal Component
interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserData) => Promise<void>;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'member' as UserRole,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'member',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="firstname.lastname"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                placeholder="John"
              />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1234567890"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="member">Member</option>
                <option value="super_user">Super User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit User Modal Component
interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string, updates: Partial<CreateUserData>) => Promise<void>;
  user: AuthUser;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone || '',
    role: user.role,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(user.id, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="firstname.lastname"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                placeholder="John"
              />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1234567890"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                disabled={user.username === 'admin'} // Prevent changing system admin role
              >
                <option value="member">Member</option>
                <option value="super_user">Super User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
