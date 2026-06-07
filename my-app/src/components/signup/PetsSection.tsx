import type { Pet } from './types'

interface PetsSectionProps {
  pets: Pet[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Pet, value: string) => void
  onConfirm: (id: string) => void
}

const PET_TYPES: { value: string; icon: string; label: string }[] = [
  { value: 'dog', icon: 'fa-dog', label: 'Dog' },
  { value: 'cat', icon: 'fa-cat', label: 'Cat' },
  { value: 'bird', icon: 'fa-dove', label: 'Bird' },
  { value: 'fish', icon: 'fa-fish', label: 'Fish' },
  { value: 'rabbit', icon: 'fa-paw', label: 'Rabbit' },
  { value: 'other', icon: 'fa-paw', label: 'Other' },
]

/** "Pets Information" block of the customer signup form. */
function PetsSection({ pets, onAdd, onRemove, onUpdate, onConfirm }: PetsSectionProps) {
  return (
    <div className="form-section">
      <h3>Pets Information</h3>
      <p className="section-description">Add information about your pets who need care</p>

      <div className="add-section-btn" onClick={onAdd}>
        <i className="fas fa-plus"></i>
        <span>Add Pet</span>
      </div>

      <div className="pets-container">
        {pets.map((pet) => (
          <div key={pet.id} className="pet-item">
            <div className="item-header">
              <div className="section-card-title">
                <i className="fas fa-paw"></i>
                <span>Pet {pets.indexOf(pet) + 1}</span>
              </div>
              <button type="button" onClick={() => onRemove(pet.id)} className="remove-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pet's Name *</label>
                <div className="input-group">
                  <i className="fas fa-tag"></i>
                  <input
                    type="text"
                    value={pet.name}
                    onChange={(e) => onUpdate(pet.id, 'name', e.target.value)}
                    placeholder="Pet's name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Age</label>
                <div className="input-group">
                  <i className="fas fa-calendar-alt"></i>
                  <input
                    type="number"
                    value={pet.age || ''}
                    onChange={(e) => onUpdate(pet.id, 'age', e.target.value)}
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
                {PET_TYPES.map((option) => (
                  <label key={option.value} className={`pet-type-option ${pet.type === option.value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`petType_${pet.id}`}
                      value={option.value}
                      checked={pet.type === option.value}
                      onChange={(e) => onUpdate(pet.id, 'type', e.target.value)}
                    />
                    <i className={`fas ${option.icon}`}></i>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Breed</label>
                <div className="input-group">
                  <i className="fas fa-dna"></i>
                  <input
                    type="text"
                    value={pet.breed}
                    onChange={(e) => onUpdate(pet.id, 'breed', e.target.value)}
                    placeholder="e.g., Golden Retriever, Persian..."
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Personality & Behavior</label>
              <div className="input-group">
                <i className="fas fa-heart"></i>
                <textarea
                  value={pet.personality || ''}
                  onChange={(e) => onUpdate(pet.id, 'personality', e.target.value)}
                  placeholder="e.g., Friendly, energetic, calm, shy..."
                  rows={2}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Care Instructions</label>
              <div className="input-group">
                <i className="fas fa-clipboard-list"></i>
                <textarea
                  value={pet.careInstructions || ''}
                  onChange={(e) => onUpdate(pet.id, 'careInstructions', e.target.value)}
                  placeholder="Feeding schedule, exercise needs, medications, special care..."
                  rows={3}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Medical Conditions, Allergies, or Special Needs</label>
              <div className="input-group">
                <i className="fas fa-notes-medical"></i>
                <textarea
                  value={pet.specialNeeds}
                  onChange={(e) => onUpdate(pet.id, 'specialNeeds', e.target.value)}
                  placeholder="Any medical conditions, allergies, medications, or special care requirements..."
                  rows={2}
                />
              </div>
            </div>

            {/* Confirm Button */}
            <div className="card-confirm-section">
              {pet.isConfirmed ? (
                <div className="confirmed-status">
                  <i className="fas fa-check-circle"></i>
                  <span>Confirmed</span>
                </div>
              ) : (
                <button type="button" className="confirm-card-btn" onClick={() => onConfirm(pet.id)}>
                  <i className="fas fa-check"></i>
                  <span>Confirm Pet</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PetsSection
