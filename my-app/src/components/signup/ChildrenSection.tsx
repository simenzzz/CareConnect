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
        <i className="fas fa-plus"></i>
        <span>Add Child</span>
      </div>

      <div className="children-container">
        {children.map((child) => (
          <div key={child.id} className="child-item">
            <div className="item-header">
              <div className="section-card-title">
                <i className="fas fa-child"></i>
                <span>Child {children.indexOf(child) + 1}</span>
              </div>
              <button type="button" onClick={() => onRemove(child.id)} className="remove-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Child's Name *</label>
                <div className="input-group">
                  <i className="fas fa-user"></i>
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
                  <i className="fas fa-calendar-alt"></i>
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
                <i className="fas fa-heart"></i>
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
                    <i className="fas fa-school"></i>
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
                    <i className="fas fa-home"></i>
                    <span>Homeschooled</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Special Needs or Requirements</label>
              <div className="input-group">
                <i className="fas fa-info-circle"></i>
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
                  <i className="fas fa-check-circle"></i>
                  <span>Confirmed</span>
                </div>
              ) : (
                <button type="button" className="confirm-card-btn" onClick={() => onConfirm(child.id)}>
                  <i className="fas fa-check"></i>
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
