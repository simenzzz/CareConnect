import type { LucideIcon } from 'lucide-react'
import { Plus, PawPrint, X, Tag, Calendar, Dna, Heart, ClipboardList, ClipboardPlus, CircleCheck, Check, Dog, Cat, Bird, Fish } from 'lucide-react'
import type { Pet } from './types'

interface PetsSectionProps {
  pets: Pet[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Pet, value: string) => void
  onConfirm: (id: string) => void
}

const PET_TYPES: { value: string; Icon: LucideIcon; label: string }[] = [
  { value: 'dog', Icon: Dog, label: 'Dog' },
  { value: 'cat', Icon: Cat, label: 'Cat' },
  { value: 'bird', Icon: Bird, label: 'Bird' },
  { value: 'fish', Icon: Fish, label: 'Fish' },
  { value: 'rabbit', Icon: PawPrint, label: 'Rabbit' },
  { value: 'other', Icon: PawPrint, label: 'Other' },
]

/** "Pets Information" block of the customer signup form. */
function PetsSection({ pets, onAdd, onRemove, onUpdate, onConfirm }: PetsSectionProps) {
  return (
    <div className="form-section">
      <h3>Pets Information</h3>
      <p className="section-description">Add information about your pets who need care</p>

      <div className="add-section-btn" onClick={onAdd}>
        <Plus size={18} />
        <span>Add Pet</span>
      </div>

      <div className="pets-container">
        {pets.map((pet) => (
          <div key={pet.id} className="pet-item">
            <div className="item-header">
              <div className="section-card-title">
                <PawPrint size={18} />
                <span>Pet {pets.indexOf(pet) + 1}</span>
              </div>
              <button type="button" onClick={() => onRemove(pet.id)} className="remove-btn" aria-label="Remove pet">
                <X size={16} />
              </button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pet's Name *</label>
                <div className="input-group">
                  <Tag size={18} />
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
                  <Calendar size={18} />
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
                {PET_TYPES.map(({ value, Icon, label }) => (
                  <label key={value} className={`pet-type-option ${pet.type === value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`petType_${pet.id}`}
                      value={value}
                      checked={pet.type === value}
                      onChange={(e) => onUpdate(pet.id, 'type', e.target.value)}
                    />
                    <Icon size={22} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Breed</label>
                <div className="input-group">
                  <Dna size={18} />
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
                <Heart size={18} />
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
                <ClipboardList size={18} />
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
                <ClipboardPlus size={18} />
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
                  <CircleCheck size={18} />
                  <span>Confirmed</span>
                </div>
              ) : (
                <button type="button" className="confirm-card-btn" onClick={() => onConfirm(pet.id)}>
                  <Check size={18} />
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
