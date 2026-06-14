import React, { useState, useEffect } from 'react';
import { Baby, Calendar, CalendarPlus, Check, CircleCheck, Heart, Home, Info, LoaderCircle, Pen, Plus, School, Trash2, TriangleAlert, User, X } from 'lucide-react'
import customerService from '../services/customerService';
import './ManageEntities.css';

interface Child {
  id: number;
  name: string;
  age: number;
  hobbies: string;
  school_type: string;
  special_needs: string;
  created_at: string;
}

const ManageChildren: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    hobbies: '',
    schoolType: '',
    specialNeeds: ''
  });

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    setIsLoading(true);
    setError(null);
    
    const response = await customerService.getChildren();
    
    if (response.success && response.data) {
      setChildren(response.data);
    } else {
      setError(response.error || 'Failed to load children');
    }
    
    setIsLoading(false);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setFormData({ name: '', age: '', hobbies: '', schoolType: '', specialNeeds: '' });
    setSuccessMessage(null);
    setError(null);
  };

  const handleEditClick = (child: Child) => {
    setEditingId(child.id);
    setFormData({
      name: child.name,
      age: child.age.toString(),
      hobbies: child.hobbies || '',
      schoolType: child.school_type,
      specialNeeds: child.special_needs || ''
    });
    setSuccessMessage(null);
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', age: '', hobbies: '', schoolType: '', specialNeeds: '' });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.age || !formData.schoolType) {
      setError('Name, age, and school schedule are required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    let response;
    if (isAdding) {
      response = await customerService.addChild(formData);
    } else if (editingId) {
      response = await customerService.updateChild(editingId, formData);
    }

    if (response && response.success) {
      await fetchChildren();
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', age: '', hobbies: '', schoolType: '', specialNeeds: '' });
      setSuccessMessage(response.message || 'Operation successful!');
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response?.error || 'Operation failed');
    }

    setIsSaving(false);
  };

  const handleDelete = async (childId: number, childName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${childName}? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const response = await customerService.deleteChild(childId);

    if (response.success) {
      await fetchChildren();
      setSuccessMessage(response.message || 'Child deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response.error || 'Failed to delete child');
    }
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
      <div className="manage-loading">
        <LoaderCircle size={16} className="spin" />
        <p>Loading children...</p>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h1>Manage Children</h1>
        <p>Add, edit, and manage your children's information</p>
      </div>

      {error && (
        <div className="general-error">
          <TriangleAlert size={16} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <CircleCheck size={16} />
          {successMessage}
        </div>
      )}

      <div className="content-card">
        {/* Add Button */}
        {!isAdding && (
          <div className="add-section-btn" onClick={handleAddClick}>
            <Plus size={16} />
            <span>Add Child</span>
          </div>
        )}

        {/* Add Form */}
        {isAdding && (
          <div className="child-item">
            <div className="item-header">
              <div className="section-card-title">
                <Baby size={16} />
                <span>Add New Child</span>
              </div>
              <button type="button" onClick={handleCancel} className="remove-btn">
                <X size={16} />
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Child's Name *</label>
                <div className="input-group">
                  <User size={16} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Child's name"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Age *</label>
                <div className="input-group">
                  <Calendar size={16} />
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Age"
                    min="0"
                    max="18"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Hobbies & Interests</label>
              <div className="input-group">
                <Heart size={16} />
                <textarea
                  value={formData.hobbies}
                  onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                  placeholder="e.g., Drawing, Soccer, Reading, Music..."
                  rows={3}
                />
              </div>
            </div>

            <div className="form-group">
              <label>School Schedule *</label>
              <div className="checkbox-group">
                <label className="checkbox-container">
                  <input 
                    type="radio" 
                    name="schoolType" 
                    value="regular"
                    checked={formData.schoolType === 'regular'}
                    onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                  />
                  <span className="checkmark"></span>
                  <div className="checkbox-content">
                    <School size={16} />
                    <span>Regular School</span>
                  </div>
                </label>
                <label className="checkbox-container">
                  <input 
                    type="radio" 
                    name="schoolType" 
                    value="homeschooled"
                    checked={formData.schoolType === 'homeschooled'}
                    onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                  />
                  <span className="checkmark"></span>
                  <div className="checkbox-content">
                    <Home size={16} />
                    <span>Homeschooled</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Special Needs or Requirements</label>
              <div className="input-group">
                <Info size={16} />
                <textarea
                  value={formData.specialNeeds}
                  onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                  placeholder="Any allergies, medical conditions, or special care requirements..."
                  rows={2}
                />
              </div>
            </div>

            <div className="card-confirm-section">
              <button 
                type="button" 
                className="confirm-card-btn"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <LoaderCircle size={16} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Child</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Children List */}
        <div className="children-container">
          {children.length === 0 && !isAdding ? (
            <div className="empty-state-text">
              <Baby size={16} />
              <p>No children added yet. Click "Add Child" above to get started.</p>
            </div>
          ) : (
            children.map((child, index) => (
              <div key={child.id} className="child-item">
                {editingId === child.id ? (
                  <>
                    <div className="item-header">
                      <div className="section-card-title">
                        <Baby size={16} />
                        <span>Edit Child {index + 1}</span>
                      </div>
                      <button type="button" onClick={handleCancel} className="remove-btn">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Child's Name *</label>
                        <div className="input-group">
                          <User size={16} />
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Age *</label>
                        <div className="input-group">
                          <Calendar size={16} />
                          <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            min="0"
                            max="18"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Hobbies & Interests</label>
                      <div className="input-group">
                        <Heart size={16} />
                        <textarea
                          value={formData.hobbies}
                          onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                          placeholder="e.g., Drawing, Soccer, Reading, Music..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>School Schedule *</label>
                      <div className="checkbox-group">
                        <label className="checkbox-container">
                          <input 
                            type="radio" 
                            name="schoolType" 
                            value="regular"
                            checked={formData.schoolType === 'regular'}
                            onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                          />
                          <span className="checkmark"></span>
                          <div className="checkbox-content">
                            <School size={16} />
                            <span>Regular School</span>
                          </div>
                        </label>
                        <label className="checkbox-container">
                          <input 
                            type="radio" 
                            name="schoolType" 
                            value="homeschooled"
                            checked={formData.schoolType === 'homeschooled'}
                            onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                          />
                          <span className="checkmark"></span>
                          <div className="checkbox-content">
                            <Home size={16} />
                            <span>Homeschooled</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Special Needs or Requirements</label>
                      <div className="input-group">
                        <Info size={16} />
                        <textarea
                          value={formData.specialNeeds}
                          onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                          placeholder="Any allergies, medical conditions, or special care requirements..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="card-confirm-section">
                      <button 
                        type="button" 
                        className="confirm-card-btn"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <LoaderCircle size={16} className="spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="item-header">
                      <div className="section-card-title">
                        <Baby size={16} />
                        <span>Child {index + 1}</span>
                      </div>
                      <div className="item-actions">
                        <button 
                          type="button" 
                          onClick={() => handleEditClick(child)} 
                          className="edit-btn"
                          title="Edit"
                        >
                          <Pen size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDelete(child.id, child.name)} 
                          className="remove-btn"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="child-details">
                      <div className="detail-item">
                        <span className="detail-label">
                          <User size={16} />
                          Name
                        </span>
                        <span className="detail-value">{child.name}</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">
                          <Calendar size={16} />
                          Age
                        </span>
                        <span className="detail-value">{child.age} years old</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">
                          <School size={16} />
                          School Schedule
                        </span>
                        <span className="detail-value">
                          {child.school_type === 'regular' ? 'Regular School' : 'Homeschooled'}
                        </span>
                      </div>

                      {child.hobbies && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <Heart size={16} />
                            Hobbies & Interests
                          </span>
                          <span className="detail-value">{child.hobbies}</span>
                        </div>
                      )}

                      {child.special_needs && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <Info size={16} />
                            Special Needs
                          </span>
                          <span className="detail-value">{child.special_needs}</span>
                        </div>
                      )}

                      <div className="detail-item">
                        <span className="detail-label">
                          <CalendarPlus size={16} />
                          Added On
                        </span>
                        <span className="detail-value">{formatDate(child.created_at)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageChildren;
