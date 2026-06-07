import { useState } from 'react'
import type React from 'react'

interface SkillsManagerProps {
  skills: string[]
  onAdd: (skill: string) => void
  onRemove: (skill: string) => void
  error?: string
}

/** Skills input + tag list for the sitter signup form. Owns its own input state. */
function SkillsManager({ skills, onAdd, onRemove, error }: SkillsManagerProps) {
  const [newSkill, setNewSkill] = useState('')

  const addSkill = () => {
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      onAdd(trimmed)
      setNewSkill('')
    }
  }

  const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  return (
    <div className="form-group">
      <label>Skills</label>
      <p className="help-text">Add skills that make you a great sitter (e.g., First Aid, CPR, Cooking, etc.)</p>

      <div className="skills-input-container">
        <div className="input-group">
          <i className="fas fa-star"></i>
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Type a skill and press Enter or click +"
            maxLength={50}
          />
          <button type="button" className="btn-add-skill" onClick={addSkill} disabled={!newSkill.trim()}>
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="skills-list">
          {skills.map((skill, index) => (
            <div key={index} className="skill-tag">
              <span>{skill}</span>
              <button type="button" onClick={() => onRemove(skill)} className="btn-remove-skill">
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <span className="error-message">{error}</span>}
    </div>
  )
}

export default SkillsManager
