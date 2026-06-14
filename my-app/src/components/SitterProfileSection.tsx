import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, Cake, Calendar, Check, CircleAlert, CircleCheck, Clock, LoaderCircle, Mail, MapPin, Pen, Phone, Plus, Star, TextAlignStart, Trash2, User, X } from 'lucide-react'
import authService from '../services/authService';
import sitterProfileService, { type AvailabilitySlot } from '../services/sitterProfileService';
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
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    const [response, availabilityResponse] = await Promise.all([
      authService.getProfile(),
      sitterProfileService.getAvailability(),
    ]);
    
    if (response.success && response.data) {
      setUserData(response.data.user);
      setProfileData(response.data.profile);
    } else {
      setError(response.error || 'Failed to load profile');
    }

    if (availabilityResponse.success && availabilityResponse.data) {
      setAvailability(availabilityResponse.data);
    }
    
    setIsLoading(false);
  };

  const addAvailabilitySlot = () => {
    setAvailability(prev => [...prev, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  };

  const updateAvailabilitySlot = (index: number, patch: Partial<AvailabilitySlot>) => {
    setAvailability(prev => prev.map((slot, i) => i === index ? { ...slot, ...patch } : slot));
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailability(prev => prev.filter((_, i) => i !== index));
  };

  const saveAvailability = async () => {
    setIsSavingAvailability(true);
    setError(null);
    setSuccessMessage(null);
    const response = await sitterProfileService.updateAvailability(availability);
    if (response.success) {
      setAvailability(response.data || availability);
      setSuccessMessage('Availability updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response.error || 'Failed to update availability');
    }
    setIsSavingAvailability(false);
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

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
        <p>Manage your sitter profile and information</p>
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

            {/* Phone */}
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
                  <div className="field-value">{profileData.phone}</div>
                  <button 
                    onClick={() => handleEdit('phone', profileData.phone)}
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

        {/* Professional Information (Editable) */}
        <div className="card-section">
          <h3>Professional Information</h3>
          <div className="profile-fields">
            {/* Sitter Type */}
            <div className="profile-field">
              <div className="field-label">
                <Briefcase size={16} />
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
                  <div className="field-value">{getSitterTypeLabel(profileData.sitter_type)}</div>
                  <button 
                    onClick={() => handleEdit('sitter_type', profileData.sitter_type)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Hours Per Week */}
            <div className="profile-field">
              <div className="field-label">
                <Clock size={16} />
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
                  <div className="field-value">{profileData.hours_per_week} hours/week</div>
                  <button 
                    onClick={() => handleEdit('hours_per_week', profileData.hours_per_week)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="profile-field">
              <div className="field-label">
                <Star size={16} />
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
                  <div className="field-value">{profileData.experience}</div>
                  <button 
                    onClick={() => handleEdit('experience', profileData.experience)}
                    className="btn-edit"
                    title="Edit"
                  >
                    <Pen size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="profile-field full-width">
              <div className="field-label">
                <TextAlignStart size={16} />
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
                  <div className="field-value">{profileData.description || 'No description provided'}</div>
                  <button 
                    onClick={() => handleEdit('description', profileData.description || '')}
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

        <div className="card-section">
          <div className="availability-header">
            <h3>Weekly Availability</h3>
            <button type="button" className="btn-edit" onClick={addAvailabilitySlot} title="Add slot">
              <Plus size={16} />
            </button>
          </div>
          <div className="availability-slots">
            {availability.length === 0 ? (
              <p className="availability-empty">No availability set yet.</p>
            ) : (
              availability.map((slot, index) => (
                <div className="availability-slot" key={`${slot.dayOfWeek}-${slot.startTime}-${index}`}>
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateAvailabilitySlot(index, { dayOfWeek: Number(e.target.value) })}
                  >
                    {dayNames.map((day, dayIndex) => (
                      <option key={day} value={dayIndex}>{day}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateAvailabilitySlot(index, { startTime: e.target.value })}
                  />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateAvailabilitySlot(index, { endTime: e.target.value })}
                  />
                  <button type="button" className="btn-cancel" onClick={() => removeAvailabilitySlot(index)} title="Remove slot">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
          <button type="button" className="btn-save-availability" onClick={saveAvailability} disabled={isSavingAvailability}>
            {isSavingAvailability ? (
              <><LoaderCircle size={16} className="spin" /> Saving...</>
            ) : (
              <><Check size={16} /> Save Availability</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SitterProfileSection;

