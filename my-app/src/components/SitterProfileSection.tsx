import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import './ProfileSection.css';

interface SitterProfileData {
  full_name: string;
  date_of_birth: string;
  area: string;
  city: string;
  phone: string;
  hours_per_week: string;
  sitter_type: string;
  experience: string;
  description: string;
}

interface UserData {
  email: string;
  userType: string;
  createdAt: string;
}

const SitterProfileSection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<SitterProfileData>({
    full_name: '',
    date_of_birth: '',
    area: '',
    city: '',
    phone: '',
    hours_per_week: '',
    sitter_type: '',
    experience: '',
    description: ''
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

  const getSitterTypeLabel = (type: string) => {
    switch(type) {
      case 'B': return 'Baby Sitter';
      case 'P': return 'Pet Sitter';
      case 'T': return 'Both (Baby & Pet)';
      default: return type;
    }
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
        <p>Manage your sitter profile and information</p>
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

            {/* Phone */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-phone"></i>
                Phone Number
              </div>
              {editingField === 'phone' ? (
                <div className="field-edit">
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('phone')}
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
                  <div className="field-value">{profileData.phone}</div>
                  <button 
                    onClick={() => handleEdit('phone', profileData.phone)}
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

        {/* Professional Information (Editable) */}
        <div className="card-section">
          <h3>Professional Information</h3>
          <div className="profile-fields">
            {/* Sitter Type */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-briefcase"></i>
                Sitter Type
              </div>
              {editingField === 'sitter_type' ? (
                <div className="field-edit">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    autoFocus
                  >
                    <option value="B">Baby Sitter</option>
                    <option value="P">Pet Sitter</option>
                    <option value="T">Both (Baby & Pet)</option>
                  </select>
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('sitter_type')}
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
                  <div className="field-value">{getSitterTypeLabel(profileData.sitter_type)}</div>
                  <button 
                    onClick={() => handleEdit('sitter_type', profileData.sitter_type)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Hours Per Week */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-clock"></i>
                Hours Per Week
              </div>
              {editingField === 'hours_per_week' ? (
                <div className="field-edit">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    min="1"
                    max="168"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('hours_per_week')}
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
                  <div className="field-value">{profileData.hours_per_week} hours/week</div>
                  <button 
                    onClick={() => handleEdit('hours_per_week', profileData.hours_per_week)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="profile-field">
              <div className="field-label">
                <i className="fas fa-star"></i>
                Years of Experience
              </div>
              {editingField === 'experience' ? (
                <div className="field-edit">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    placeholder="e.g., 3 years, 5+ years"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('experience')}
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
                  <div className="field-value">{profileData.experience}</div>
                  <button 
                    onClick={() => handleEdit('experience', profileData.experience)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="profile-field full-width">
              <div className="field-label">
                <i className="fas fa-align-left"></i>
                About Me / Description
              </div>
              {editingField === 'description' ? (
                <div className="field-edit">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    rows={4}
                    placeholder="Tell customers about yourself, your experience, and why you'd be a great sitter..."
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('description')}
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
                  <div className="field-value">{profileData.description || 'No description provided'}</div>
                  <button 
                    onClick={() => handleEdit('description', profileData.description || '')}
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

export default SitterProfileSection;

