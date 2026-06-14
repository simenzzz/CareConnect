import React from 'react'
import {
  Baby,
  PawPrint,
  Check,
  CirclePlus,
  X,
  Tag,
  Dog,
  Calendar,
  Smile,
  ClipboardList,
  BriefcaseMedical,
  User,
  Cake,
  Heart,
  School,
  LoaderCircle,
} from 'lucide-react'

export interface Child {
  id: number
  name: string
  age: number
  hobbies?: string
  school_type: string
  special_needs?: string
}

export interface Pet {
  id: number
  name: string
  age: number | null
  type: string
  breed?: string
  personality?: string
  care_instructions?: string
  special_needs?: string
}

/**
 * Draft payload for the inline "add child / add pet" form. All inputs are text,
 * so every field is an optional string; which fields are relevant depends on
 * `sitterType`. Kept as one flat shape (rather than a discriminated union)
 * because the form updates fields individually through a single setter.
 */
export interface EntityFormData {
  name?: string
  age?: string
  // pet-only
  type?: string
  breed?: string
  personality?: string
  careInstructions?: string
  // child-only
  hobbies?: string
  schoolType?: string
  // shared
  specialNeeds?: string
}

interface EntitySectionProps {
  sitterType: 'pet' | 'baby'
  childItems: Child[]
  petItems: Pet[]
  selectedEntityIds: number[]
  onToggleSelect: (entityId: number) => void
  isLoadingData: boolean
  showAddForm: boolean
  onAddClick: () => void
  onCancelAdd: () => void
  entityFormData: EntityFormData
  setEntityFormData: React.Dispatch<React.SetStateAction<EntityFormData>>
  isSavingEntity: boolean
  onSaveEntity: () => void
}

/**
 * The child/pet picker plus the inline add-entity form for the booking modal.
 * Purely presentational: all state lives in the parent and is threaded through
 * props, so behaviour is identical to the pre-extraction inline markup.
 */
const EntitySection: React.FC<EntitySectionProps> = ({
  sitterType,
  childItems,
  petItems,
  selectedEntityIds,
  onToggleSelect,
  isLoadingData,
  showAddForm,
  onAddClick,
  onCancelAdd,
  entityFormData,
  setEntityFormData,
  isSavingEntity,
  onSaveEntity,
}) => {
  const availableItems: (Child | Pet)[] = sitterType === 'baby' ? childItems : petItems
  const entityLabel = sitterType === 'baby' ? 'Child' : 'Pet'

  const getEntityDisplayText = (item: Child | Pet) => {
    if (sitterType === 'pet') {
      const pet = item as Pet
      return `${pet.name}${pet.breed ? `, ${pet.breed}` : ''}${pet.age !== null ? `, ${pet.age} years` : ''}`
    }
    const child = item as Child
    return `${child.name}, ${child.age} years`
  }

  if (!showAddForm) {
    return (
      <div className="form-group">
        <label>
          {sitterType === 'baby' ? <Baby size={16} /> : <PawPrint size={16} />}
          Select Your {entityLabel}(s) *
        </label>
        <div className="entity-list">
          {availableItems.length > 0 ? (
            availableItems.map((item) => (
              <label
                key={item.id}
                className={`entity-option ${selectedEntityIds.includes(item.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedEntityIds.includes(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  disabled={isLoadingData}
                />
                <span className="entity-option__text">
                  {getEntityDisplayText(item)}
                </span>
                {selectedEntityIds.includes(item.id) && (
                  <Check size={16} className="entity-option__check" />
                )}
              </label>
            ))
          ) : (
            <p className="entity-empty">
              No {entityLabel.toLowerCase()}s available
            </p>
          )}
        </div>
        <button type="button" onClick={onAddClick} className="btn-add-entity">
          <CirclePlus size={18} /> Add a {entityLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="add-entity-form">
      <div className="add-entity-header">
        <h3>Add {entityLabel}</h3>
        <button
          type="button"
          onClick={onCancelAdd}
          className="btn-close-add"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {sitterType === 'pet' ? (
        // Pet Form Fields
        <>
          <div className="form-group">
            <label>
              <Tag size={16} />
              Pet Name *
            </label>
            <input
              type="text"
              value={entityFormData.name || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, name: e.target.value })}
              placeholder="Enter pet name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <PawPrint size={16} />
                Pet Type *
              </label>
              <div className="pet-type-grid">
                {['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Fish', 'Other'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`pet-type-option ${entityFormData.type === type ? 'selected' : ''}`}
                    onClick={() => setEntityFormData({ ...entityFormData, type })}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <Dog size={16} />
                Breed
              </label>
              <input
                type="text"
                value={entityFormData.breed || ''}
                onChange={(e) => setEntityFormData({ ...entityFormData, breed: e.target.value })}
                placeholder="e.g., Golden Retriever"
              />
            </div>

            <div className="form-group">
              <label>
                <Calendar size={16} />
                Age
              </label>
              <input
                type="number"
                value={entityFormData.age || ''}
                onChange={(e) => setEntityFormData({ ...entityFormData, age: e.target.value })}
                placeholder="Age in years"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <Smile size={16} />
              Personality
            </label>
            <textarea
              value={entityFormData.personality || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, personality: e.target.value })}
              placeholder="Describe your pet's personality..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>
              <ClipboardList size={16} />
              Care Instructions
            </label>
            <textarea
              value={entityFormData.careInstructions || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, careInstructions: e.target.value })}
              placeholder="Special care instructions..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>
              <BriefcaseMedical size={16} />
              Special Needs / Medical Conditions
            </label>
            <textarea
              value={entityFormData.specialNeeds || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, specialNeeds: e.target.value })}
              placeholder="Any medical conditions or special needs..."
              rows={2}
            />
          </div>
        </>
      ) : (
        // Child Form Fields
        <>
          <div className="form-group">
            <label>
              <User size={16} />
              Child's Name *
            </label>
            <input
              type="text"
              value={entityFormData.name || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, name: e.target.value })}
              placeholder="Enter child's name"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Cake size={16} />
              Age *
            </label>
            <input
              type="number"
              value={entityFormData.age || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, age: e.target.value })}
              placeholder="Age in years"
              min="0"
              max="18"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Heart size={16} />
              Hobbies & Interests
            </label>
            <textarea
              value={entityFormData.hobbies || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, hobbies: e.target.value })}
              placeholder="What does your child enjoy?"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>
              <School size={16} />
              School Schedule *
            </label>
            <div className="checkbox-group">
              {['Full Time', 'Part Time', 'Not in School'].map(schedule => (
                <div
                  key={schedule}
                  className={`checkbox-container ${entityFormData.schoolType === schedule ? 'selected' : ''}`}
                  onClick={() => setEntityFormData({ ...entityFormData, schoolType: schedule })}
                >
                  <div className="checkbox-content">
                    <div className="checkmark">
                      {entityFormData.schoolType === schedule && <Check size={14} />}
                    </div>
                    <span>{schedule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>
              <BriefcaseMedical size={16} />
              Special Needs / Medical Conditions
            </label>
            <textarea
              value={entityFormData.specialNeeds || ''}
              onChange={(e) => setEntityFormData({ ...entityFormData, specialNeeds: e.target.value })}
              placeholder="Any medical conditions or special needs..."
              rows={2}
            />
          </div>
        </>
      )}

      <div className="add-entity-actions">
        <button
          type="button"
          className="btn-cancel-add"
          onClick={onCancelAdd}
          disabled={isSavingEntity}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-save-add"
          onClick={onSaveEntity}
          disabled={isSavingEntity}
        >
          {isSavingEntity ? (
            <>
              <LoaderCircle size={18} className="spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Save {entityLabel}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default EntitySection
