import React, { useState, useEffect } from 'react';
import { Building2, Cake, Calendar, Check, CircleAlert, CircleCheck, LoaderCircle, Mail, MapPin, Pen, Phone, User, X } from 'lucide-react'
import authService from '../services/authService';
import './ProfileSection.css';

interface ProfileData {
  full_name: string;
  phone: string;
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
    phone: '',
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

  const isValidLebanesePhone = (phone: string): boolean => {
    // Lebanese phone number patterns: +961XXXXXXXXX or 961XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+961|961|0)?[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSave = async (field: string) => {
    if (!editValue.trim()) {
      setError('Field cannot be empty');
      return;
    }

    // Validate phone number if it's the phone field
    if (field === 'phone' && !isValidLebanesePhone(editValue)) {
      setError('Please enter a valid Lebanese phone number (e.g., +961 XX XXX XXX)');
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
        <LoaderCircle size={16} className="spin" />
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
          <CircleAlert size={16} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <CircleCheck size={16} />
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
                <Mail size={16} />
                Email Address
              </div>
              <div className="field-value readonly">
                {userData?.email}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <Calendar size={16} />
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
                <User size={16} />
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
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <X size={16} />
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
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="profile-field">
              <div className="field-label">
                <Phone size={16} />
                Phone Number
              </div>
              {editingField === 'phone' ? (
                <div className="field-edit">
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="field-input"
                    placeholder="+961 XX XXX XXX"
                    autoFocus
                  />
                  <div className="field-actions">
                    <button 
                      onClick={() => handleSave('phone')}
                      className="btn-save"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="field-display">
                  <div className="field-value">{profileData.phone || 'Not provided'}</div>
                  <button 
                    onClick={() => handleEdit('phone', profileData.phone || '')}
                    className="btn-edit"
                    title="Edit"
                  >
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="profile-field">
              <div className="field-label">
                <Cake size={16} />
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
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <X size={16} />
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
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Area */}
            <div className="profile-field">
              <div className="field-label">
                <MapPin size={16} />
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
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <X size={16} />
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
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* City */}
            <div className="profile-field">
              <div className="field-label">
                <Building2 size={16} />
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
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="btn-cancel"
                      disabled={isSaving}
                    >
                      <X size={16} />
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
                    <Pen size={16} />
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

