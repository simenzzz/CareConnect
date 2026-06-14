import { Plus, Baby, X, User, Calendar, Heart, School, Home, Info, CircleCheck, Check } from 'lucide-react'
import type { Child } from './types'

interface ChildrenSectionProps {
  children: Child[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: keyof Child, value: string) => void
  onConfirm: (id: string) => void
}

/** "Children Information" block of the customer signup form. */
function ChildrenSection({ children, onAdd, onRemove, onUpdate, onConfirm }: ChildrenSectionProps) {
  return (
    <div className="form-section">
      <h3>Children Information</h3>
      <p className="section-description">Add information about your children who need care</p>

      <div className="add-section-btn" onClick={onAdd}>
        <Plus size={18} />
        <span>Add Child</span>
      </div>

      <div className="children-container">
        {children.map((child) => (
          <div key={child.id} className="child-item">
            <div className="item-header">
              <div className="section-card-title">
                <Baby size={18} />
                <span>Child {children.indexOf(child) + 1}</span>
              </div>
              <button type="button" onClick={() => onRemove(child.id)} className="remove-btn" aria-label="Remove child">
                <X size={16} />
              </button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Child's Name *</label>
                <div className="input-group">
                  <User size={18} />
                  <input
                    type="text"
                    value={child.name}
                    onChange={(e) => onUpdate(child.id, 'name', e.target.value)}
                    placeholder="Child's name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Age *</label>
                <div className="input-group">
                  <Calendar size={18} />
                  <input
                    type="number"
                    value={child.age}
                    onChange={(e) => onUpdate(child.id, 'age', e.target.value)}
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
                <Heart size={18} />
                <textarea
                  value={child.hobbies}
                  onChange={(e) => onUpdate(child.id, 'hobbies', e.target.value)}
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
                    name={`schoolType_${child.id}`}
                    value="regular"
                    checked={child.schoolType === 'regular'}
                    onChange={(e) => onUpdate(child.id, 'schoolType', e.target.value)}
                  />
                  <span className="checkmark"></span>
                  <div className="checkbox-content">
                    <School size={18} />
                    <span>Regular School</span>
                  </div>
                </label>
                <label className="checkbox-container">
                  <input
                    type="radio"
                    name={`schoolType_${child.id}`}
                    value="homeschooled"
                    checked={child.schoolType === 'homeschooled'}
                    onChange={(e) => onUpdate(child.id, 'schoolType', e.target.value)}
                  />
                  <span className="checkmark"></span>
                  <div className="checkbox-content">
                    <Home size={18} />
                    <span>Homeschooled</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Special Needs or Requirements</label>
              <div className="input-group">
                <Info size={18} />
                <textarea
                  value={child.specialNeeds}
                  onChange={(e) => onUpdate(child.id, 'specialNeeds', e.target.value)}
                  placeholder="Any allergies, medical conditions, or special care requirements..."
                  rows={2}
                />
              </div>
            </div>

            {/* Confirm Button */}
            <div className="card-confirm-section">
              {child.isConfirmed ? (
                <div className="confirmed-status">
                  <CircleCheck size={18} />
                  <span>Confirmed</span>
                </div>
              ) : (
                <button type="button" className="confirm-card-btn" onClick={() => onConfirm(child.id)}>
                  <Check size={18} />
                  <span>Confirm Child</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ChildrenSection
