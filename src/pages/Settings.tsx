import { useState } from 'react'
import { User, Bell, Shield, Palette, Globe, Database, Download, Upload, Trash2, Save, X } from 'lucide-react'
import './Settings.css'

interface FormData {
  name: string
  email: string
  phone: string
  location: string
  language: string
  theme: string
  notifications: {
    payments: boolean
    reminders: boolean
    updates: boolean
    marketing: boolean
  }
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+597 123-4567',
    location: 'Paramaribo',
    language: 'en',
    theme: 'light',
    notifications: {
      payments: true,
      reminders: true,
      updates: true,
      marketing: false
    }
  })

  const handleInputChange = (field: keyof FormData | 'notifications.payments' | 'notifications.reminders' | 'notifications.updates' | 'notifications.marketing', value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.') as [keyof FormData, string]
      if (parent === 'notifications') {
        setFormData(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [child]: value
          }
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSave = () => {
    setIsEditing(false)
    // Here you would typically save to backend
    console.log('Saving settings:', formData)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form data to original values
    setFormData({
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+597 123-4567',
      location: 'Paramaribo',
      language: 'en',
      theme: 'light',
      notifications: {
        payments: true,
        reminders: true,
        updates: true,
        marketing: false
      }
    })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'data', label: 'Data & Export', icon: Database }
  ]

  return (
    <div className="settings">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences and app settings</p>
        </div>
      </div>

      <div className="container">
        <div className="settings-container">
          {/* Settings Sidebar */}
          <div className="settings-sidebar">
            <nav className="settings-nav">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="settings-content">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="settings-tab">
                <div className="tab-header">
                  <h2>Profile Settings</h2>
                  <div className="tab-actions">
                    {!isEditing ? (
                      <button className="btn" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </button>
                    ) : (
                      <div className="edit-actions">
                        <button className="btn btn-secondary" onClick={handleCancel}>
                          <X size={16} />
                          Cancel
                        </button>
                        <button className="btn" onClick={handleSave}>
                          <Save size={16} />
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="profile-section">
                  <div className="profile-avatar">
                    <User size={64} />
                  </div>
                  
                  <div className="profile-form">
                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="location">Location</label>
                      <input
                        type="text"
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="settings-tab">
                <div className="tab-header">
                  <h2>Notification Preferences</h2>
                  <button className="btn" onClick={handleSave}>
                    Save Preferences
                  </button>
                </div>

                <div className="notifications-section">
                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>Payment Notifications</h3>
                      <p>Get notified when payments are received or overdue</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.notifications.payments}
                        onChange={(e) => handleInputChange('notifications.payments', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>Payment Reminders</h3>
                      <p>Receive reminders for upcoming payments</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.notifications.reminders}
                        onChange={(e) => handleInputChange('notifications.reminders', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>App Updates</h3>
                      <p>Get notified about new features and updates</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.notifications.updates}
                        onChange={(e) => handleInputChange('notifications.updates', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>Marketing Communications</h3>
                      <p>Receive promotional offers and newsletters</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.notifications.marketing}
                        onChange={(e) => handleInputChange('notifications.marketing', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="settings-tab">
                <div className="tab-header">
                  <h2>Security Settings</h2>
                </div>

                <div className="security-section">
                  <div className="security-item">
                    <div className="security-info">
                      <h3>Change Password</h3>
                      <p>Update your account password for enhanced security</p>
                    </div>
                    <button className="btn btn-secondary">Change Password</button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <h3>Two-Factor Authentication</h3>
                      <p>Add an extra layer of security to your account</p>
                    </div>
                    <button className="btn btn-secondary">Enable 2FA</button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <h3>Login History</h3>
                      <p>View recent login attempts and locations</p>
                    </div>
                    <button className="btn btn-secondary">View History</button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <h3>Account Deletion</h3>
                      <p>Permanently delete your account and all data</p>
                    </div>
                    <button className="btn btn-danger">
                      <Trash2 size={16} />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="settings-tab">
                <div className="tab-header">
                  <h2>Appearance Settings</h2>
                  <button className="btn" onClick={handleSave}>
                    Save Preferences
                  </button>
                </div>

                <div className="appearance-section">
                  <div className="appearance-item">
                    <div className="appearance-info">
                      <h3>Theme</h3>
                      <p>Choose your preferred color scheme</p>
                    </div>
                    <div className="theme-options">
                      <label className="theme-option">
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={formData.theme === 'light'}
                          onChange={(e) => handleInputChange('theme', e.target.value)}
                        />
                        <span className="theme-preview light">Light</span>
                      </label>
                      <label className="theme-option">
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={formData.theme === 'dark'}
                          onChange={(e) => handleInputChange('theme', e.target.value)}
                        />
                        <span className="theme-preview dark">Dark</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="settings-tab">
                <div className="tab-header">
                  <h2>Language Settings</h2>
                  <button className="btn" onClick={handleSave}>
                    Save Preferences
                  </button>
                </div>

                <div className="language-section">
                  <div className="language-item">
                    <div className="language-info">
                      <h3>App Language</h3>
                      <p>Choose your preferred language for the application</p>
                    </div>
                    <select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="language-select"
                    >
                      <option value="en">English</option>
                      <option value="nl">Nederlands</option>
                      <option value="srn">Sranan Tongo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="settings-tab">
                <div className="tab-header">
                  <h2>Data & Export</h2>
                </div>

                <div className="data-section">
                  <div className="data-item">
                    <div className="data-info">
                      <h3>Export Data</h3>
                      <p>Download your data in various formats</p>
                    </div>
                    <div className="data-actions">
                      <button className="btn btn-secondary">
                        <Download size={16} />
                        Export CSV
                      </button>
                      <button className="btn btn-secondary">
                        <Download size={16} />
                        Export PDF
                      </button>
                    </div>
                  </div>

                  <div className="data-item">
                    <div className="data-info">
                      <h3>Import Data</h3>
                      <p>Import data from external sources</p>
                    </div>
                    <button className="btn btn-secondary">
                      <Upload size={16} />
                      Import Data
                    </button>
                  </div>

                  <div className="data-item">
                    <div className="data-info">
                      <h3>Data Backup</h3>
                      <p>Create a backup of your data</p>
                    </div>
                    <button className="btn btn-secondary">
                      <Database size={16} />
                      Create Backup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
