import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import './ProfileSection.css';

interface ProfileData {
  full_name: string;
  date_of_birth: string;
  area: string;
  city: string;
}

interface UserData {
  email: string;
  userType: string;
  createdAt: string;
}

const ProfileSection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    date_of_birth: '',
    area: '',
    city: ''
  });
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    const response = await authService.getProfile();
    
    if (response.success && response.data) {
      setUserData(response.data.user);
      setProfileData(response.data.profile);
    } else {
      setError(response.error || 'Failed to load profile');
    }
    
    setIsLoading(false);
  };

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSave = async (field: string) => {
    if (!editValue.trim()) {
      setError('Field cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const updatedProfile = {
      ...profileData,
      [field]: editValue
    };

    const response = await authService.updateProfile(updatedProfile);

    if (response.success) {
      setProfileData(updatedProfile);
      setEditingField(null);
      setEditValue('');
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response.error || 'Failed to update profile');
    }

    setIsSaving(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-section">
      <div className="section-header">
        <h1>Profile</h1>
        <p>Manage your personal information</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {successMessage}
        </div>
      )}

      <div className="content-card">
        {/* Account Information (Read-only) */}
        <div className="card-section">
          <h3>Account Information</h3>
          <div className="profile-fields">
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-envelope"></i>
                Email Address
              </div>
              <div className="field-value readonly">
                {userData?.email}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-calendar-alt"></i>
                Member Since
              </div>
              <div className="field-value readonly">
                {userData?.createdAt ? formatDate(userData.createdAt) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information (Editable) */}
        <div className="card-section">
          <h3>Personal Information</h3>
          <div className="profile-fields">
            {/* Full Name */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-user"></i>
                Full Name
              </div>
              {editingField === 'full_name' ? (
                <div className="field-edit">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('full_name')}
                      className="btn-save"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-display">
                  <div className="field-value">{profileData.full_name}</div>
                  <button 
                    onClick={() => handleEdit('full_name', profileData.full_name)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-birthday-cake"></i>
                Date of Birth
              </div>
              {editingField === 'date_of_birth' ? (
                <div className="field-edit">
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('date_of_birth')}
                      className="btn-save"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-display">
                  <div className="field-value">
                    {formatDate(profileData.date_of_birth)}
                  </div>
                  <button 
                    onClick={() => handleEdit('date_of_birth', profileData.date_of_birth)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Area */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-map-marker-alt"></i>
                Area
              </div>
              {editingField === 'area' ? (
                <div className="field-edit">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('area')}
                      className="btn-save"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-display">
                  <div className="field-value">{profileData.area}</div>
                  <button 
                    onClick={() => handleEdit('area', profileData.area)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>

            {/* City */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-city"></i>
                City
              </div>
              {editingField === 'city' ? (
                <div className="field-edit">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('city')}
                      className="btn-save"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-display">
                  <div className="field-value">{profileData.city}</div>
                  <button 
                    onClick={() => handleEdit('city', profileData.city)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;

