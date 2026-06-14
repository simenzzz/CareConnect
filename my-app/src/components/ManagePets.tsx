import React, { useState, useEffect } from 'react';
import { Bird, Calendar, CalendarPlus, Cat, Check, CircleCheck, ClipboardList, ClipboardPlus, Dna, Dog, Fish, Heart, LoaderCircle, PawPrint, Pen, Plus, Tag, Trash2, TriangleAlert, X } from 'lucide-react'
import customerService from '../services/customerService';
import './ManageEntities.css';

interface Pet {
  id: number;
  name: string;
  age: number | null;
  type: string;
  breed: string;
  personality: string;
  care_instructions: string;
  special_needs: string;
  created_at: string;
}

const ManagePets: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
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
    type: '',
    breed: '',
    personality: '',
    careInstructions: '',
    specialNeeds: ''
  });

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    setIsLoading(true);
    setError(null);
    
    const response = await customerService.getPets();
    
    if (response.success && response.data) {
      setPets(response.data);
    } else {
      setError(response.error || 'Failed to load pets');
    }
    
    setIsLoading(false);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setFormData({ name: '', age: '', type: '', breed: '', personality: '', careInstructions: '', specialNeeds: '' });
    setSuccessMessage(null);
    setError(null);
  };

  const handleEditClick = (pet: Pet) => {
    setEditingId(pet.id);
    setFormData({
      name: pet.name,
      age: pet.age ? pet.age.toString() : '',
      type: pet.type,
      breed: pet.breed || '',
      personality: pet.personality || '',
      careInstructions: pet.care_instructions || '',
      specialNeeds: pet.special_needs || ''
    });
    setSuccessMessage(null);
    setError(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', age: '', type: '', breed: '', personality: '', careInstructions: '', specialNeeds: '' });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.type.trim()) {
      setError('Name and type are required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    let response;
    if (isAdding) {
      response = await customerService.addPet(formData);
    } else if (editingId) {
      response = await customerService.updatePet(editingId, formData);
    }

    if (response && response.success) {
      await fetchPets();
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', age: '', type: '', breed: '', personality: '', careInstructions: '', specialNeeds: '' });
      setSuccessMessage(response.message || 'Operation successful!');
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response?.error || 'Operation failed');
    }

    setIsSaving(false);
  };

  const handleDelete = async (petId: number, petName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${petName}? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const response = await customerService.deletePet(petId);

    if (response.success) {
      await fetchPets();
      setSuccessMessage(response.message || 'Pet deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(response.error || 'Failed to delete pet');
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
        <p>Loading pets...</p>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h1>Manage Pets</h1>
        <p>Add, edit, and manage your pets' information</p>
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
            <span>Add Pet</span>
          </div>
        )}

        {/* Add Form */}
        {isAdding && (
          <div className="pet-item">
            <div className="item-header">
              <div className="section-card-title">
                <PawPrint size={16} />
                <span>Add New Pet</span>
              </div>
              <button type="button" onClick={handleCancel} className="remove-btn">
                <X size={16} />
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pet's Name *</label>
                <div className="input-group">
                  <Tag size={16} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Pet's name"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Age</label>
                <div className="input-group">
                  <Calendar size={16} />
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Years"
                    min="0"
                    max="30"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Pet Type *</label>
              <div className="pet-type-grid">
                <label className={`pet-type-option ${formData.type === 'dog' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="petType" 
                    value="dog"
                    checked={formData.type === 'dog'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <Dog size={16} />
                  <span>Dog</span>
                </label>
                <label className={`pet-type-option ${formData.type === 'cat' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="petType" 
                    value="cat"
                    checked={formData.type === 'cat'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <Cat size={16} />
                  <span>Cat</span>
                </label>
                <label className={`pet-type-option ${formData.type === 'bird' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="petType" 
                    value="bird"
                    checked={formData.type === 'bird'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <Bird size={16} />
                  <span>Bird</span>
                </label>
                <label className={`pet-type-option ${formData.type === 'fish' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="petType" 
                    value="fish"
                    checked={formData.type === 'fish'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <Fish size={16} />
                  <span>Fish</span>
                </label>
                <label className={`pet-type-option ${formData.type === 'rabbit' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="petType" 
                    value="rabbit"
                    checked={formData.type === 'rabbit'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <PawPrint size={16} />
                  <span>Rabbit</span>
                </label>
                <label className={`pet-type-option ${formData.type === 'other' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="petType" 
                    value="other"
                    checked={formData.type === 'other'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <PawPrint size={16} />
                  <span>Other</span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Breed</label>
                <div className="input-group">
                  <Dna size={16} />
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="e.g., Golden Retriever, Persian..."
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Personality & Behavior</label>
              <div className="input-group">
                <Heart size={16} />
                <textarea
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="e.g., Friendly, energetic, calm, shy..."
                  rows={2}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Care Instructions</label>
              <div className="input-group">
                <ClipboardList size={16} />
                <textarea
                  value={formData.careInstructions}
                  onChange={(e) => setFormData({ ...formData, careInstructions: e.target.value })}
                  placeholder="Feeding schedule, exercise needs, medications, special care..."
                  rows={3}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Medical Conditions, Allergies, or Special Needs</label>
              <div className="input-group">
                <ClipboardPlus size={16} />
                <textarea
                  value={formData.specialNeeds}
                  onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                  placeholder="Any medical conditions, allergies, medications, or special care requirements..."
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
                    <span>Save Pet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Pets List */}
        <div className="pets-container">
          {pets.length === 0 && !isAdding ? (
            <div className="empty-state-text">
              <PawPrint size={16} />
              <p>No pets added yet. Click "Add Pet" above to get started.</p>
            </div>
          ) : (
            pets.map((pet, index) => (
              <div key={pet.id} className="pet-item">
                {editingId === pet.id ? (
                  <>
                    <div className="item-header">
                      <div className="section-card-title">
                        <PawPrint size={16} />
                        <span>Edit Pet {index + 1}</span>
                      </div>
                      <button type="button" onClick={handleCancel} className="remove-btn">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Pet's Name *</label>
                        <div className="input-group">
                          <Tag size={16} />
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Age</label>
                        <div className="input-group">
                          <Calendar size={16} />
                          <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            placeholder="Years"
                            min="0"
                            max="30"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Pet Type *</label>
                      <div className="pet-type-grid">
                        <label className={`pet-type-option ${formData.type === 'dog' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="petType" 
                            value="dog"
                            checked={formData.type === 'dog'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          />
                          <Dog size={16} />
                          <span>Dog</span>
                        </label>
                        <label className={`pet-type-option ${formData.type === 'cat' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="petType" 
                            value="cat"
                            checked={formData.type === 'cat'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          />
                          <Cat size={16} />
                          <span>Cat</span>
                        </label>
                        <label className={`pet-type-option ${formData.type === 'bird' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="petType" 
                            value="bird"
                            checked={formData.type === 'bird'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          />
                          <Bird size={16} />
                          <span>Bird</span>
                        </label>
                        <label className={`pet-type-option ${formData.type === 'fish' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="petType" 
                            value="fish"
                            checked={formData.type === 'fish'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          />
                          <Fish size={16} />
                          <span>Fish</span>
                        </label>
                        <label className={`pet-type-option ${formData.type === 'rabbit' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="petType" 
                            value="rabbit"
                            checked={formData.type === 'rabbit'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          />
                          <PawPrint size={16} />
                          <span>Rabbit</span>
                        </label>
                        <label className={`pet-type-option ${formData.type === 'other' ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="petType" 
                            value="other"
                            checked={formData.type === 'other'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          />
                          <PawPrint size={16} />
                          <span>Other</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Breed</label>
                        <div className="input-group">
                          <Dna size={16} />
                          <input
                            type="text"
                            value={formData.breed}
                            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                            placeholder="e.g., Golden Retriever, Persian..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Personality & Behavior</label>
                      <div className="input-group">
                        <Heart size={16} />
                        <textarea
                          value={formData.personality}
                          onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                          placeholder="e.g., Friendly, energetic, calm, shy..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Care Instructions</label>
                      <div className="input-group">
                        <ClipboardList size={16} />
                        <textarea
                          value={formData.careInstructions}
                          onChange={(e) => setFormData({ ...formData, careInstructions: e.target.value })}
                          placeholder="Feeding schedule, exercise needs, medications, special care..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Medical Conditions, Allergies, or Special Needs</label>
                      <div className="input-group">
                        <ClipboardPlus size={16} />
                        <textarea
                          value={formData.specialNeeds}
                          onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                          placeholder="Any medical conditions, allergies, medications, or special care requirements..."
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
                        <PawPrint size={16} />
                        <span>Pet {index + 1}</span>
                      </div>
                      <div className="item-actions">
                        <button 
                          type="button" 
                          onClick={() => handleEditClick(pet)} 
                          className="edit-btn"
                          title="Edit"
                        >
                          <Pen size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDelete(pet.id, pet.name)} 
                          className="remove-btn"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="pet-details">
                      <div className="detail-item">
                        <span className="detail-label">
                          <Tag size={16} />
                          Name
                        </span>
                        <span className="detail-value">{pet.name}</span>
                      </div>

                      {pet.age && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <Calendar size={16} />
                            Age
                          </span>
                          <span className="detail-value">{pet.age} years old</span>
                        </div>
                      )}

                      <div className="detail-item">
                        <span className="detail-label">
                          <Dog size={16} />
                          Type
                        </span>
                        <span className="detail-value">{pet.type}</span>
                      </div>

                      {pet.breed && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <Dna size={16} />
                            Breed
                          </span>
                          <span className="detail-value">{pet.breed}</span>
                        </div>
                      )}

                      {pet.personality && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <Heart size={16} />
                            Personality
                          </span>
                          <span className="detail-value">{pet.personality}</span>
                        </div>
                      )}

                      {pet.care_instructions && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <ClipboardList size={16} />
                            Care Instructions
                          </span>
                          <span className="detail-value">{pet.care_instructions}</span>
                        </div>
                      )}

                      {pet.special_needs && (
                        <div className="detail-item">
                          <span className="detail-label">
                            <ClipboardPlus size={16} />
                            Special Needs
                          </span>
                          <span className="detail-value">{pet.special_needs}</span>
                        </div>
                      )}

                      <div className="detail-item">
                        <span className="detail-label">
                          <CalendarPlus size={16} />
                          Added On
                        </span>
                        <span className="detail-value">{formatDate(pet.created_at)}</span>
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

export default ManagePets;
