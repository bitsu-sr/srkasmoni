import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, LogOut, User as UserIcon } from 'lucide-react';
import './UserProfileDropdown.css';

const UserProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    // Redirect to landing page after logout
    navigate('/');
  };

  const handleProfileClick = () => {
    // Navigate to profile page
    navigate('/profile');
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="user-profile-dropdown" ref={dropdownRef}>
      <button
        className="user-profile-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="user-avatar">
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.first_name} />
          ) : (
            <User size={20} />
          )}
        </div>
        <span className="user-name">{user.first_name}'s profile</span>
        <svg
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-user-info">
              <div className="dropdown-avatar">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt={user.first_name} />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="dropdown-user-details">
                <div className="dropdown-user-name">{user.first_name} {user.last_name}</div>
                <div className="dropdown-user-role">{user.role}</div>
                <div className="dropdown-user-email">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-actions">
            <button className="dropdown-action" onClick={handleProfileClick}>
              <UserIcon size={16} />
              <span>View Profile</span>
            </button>
            
            <button className="dropdown-action" onClick={handleProfileClick}>
              <Settings size={16} />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="dropdown-divider"></div>

          <button className="dropdown-action logout-action" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
