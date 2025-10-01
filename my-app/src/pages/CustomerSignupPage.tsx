import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import './CustomerSignupPage.css'

interface Child {
  id: string
  name: string
  age: string
  specialNeeds: string
}

interface Pet {
  id: string
  name: string
  age: string
  type: string
  breed: string
  size: string
  personality: string
  careInstructions: string
  specialNeeds: string
}

interface FormData {
  customerName: string
  customerDOB: string
  customerArea: string
  customerEmail: string
  customerPhone: string
  customerPassword: string
  customerConfirmPassword: string
  children: Child[]
  pets: Pet[]
  termsAccepted: boolean
}

interface FormErrors {
  [key: string]: string
}

const CustomerSignupPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerDOB: '',
    customerArea: '',
    customerEmail: '',
    customerPhone: '',
    customerPassword: '',
    customerConfirmPassword: '',
    children: [],
    pets: [],
    termsAccepted: false
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  const addChild = () => {
    const newChild: Child = {
      id: Date.now().toString(),
      name: '',
      age: '',
      specialNeeds: ''
    }
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, newChild]
    }))
  }

  const removeChild = (id: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter(child => child.id !== id)
    }))
  }

  const updateChild = (id: string, field: keyof Child, value: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map(child =>
        child.id === id ? { ...child, [field]: value } : child
      )
    }))
  }

  const addPet = () => {
    const newPet: Pet = {
      id: Date.now().toString(),
      name: '',
      age: '',
      type: '',
      breed: '',
      size: '',
      personality: '',
      careInstructions: '',
      specialNeeds: ''
    }
    setFormData(prev => ({
      ...prev,
      pets: [...prev.pets, newPet]
    }))
  }

  const removePet = (id: string) => {
    setFormData(prev => ({
      ...prev,
      pets: prev.pets.filter(pet => pet.id !== id)
    }))
  }

  const updatePet = (id: string, field: keyof Pet, value: string) => {
    setFormData(prev => ({
      ...prev,
      pets: prev.pets.map(pet =>
        pet.id === id ? { ...pet, [field]: value } : pet
      )
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.customerName.trim()) newErrors.customerName = 'Full name is required'
    if (!formData.customerDOB) newErrors.customerDOB = 'Date of birth is required'
    if (!formData.customerArea) newErrors.customerArea = 'Area is required'
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required'
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone number is required'
    if (!formData.customerPassword) newErrors.customerPassword = 'Password is required'
    if (formData.customerPassword !== formData.customerConfirmPassword) newErrors.customerConfirmPassword = 'Passwords do not match'
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      // Here you would typically send the data to your backend
      console.log('Form data:', formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert('Customer account created successfully!')
    } catch (error) {
      console.error('Error creating account:', error)
      alert('Error creating account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="customer-signup-page">
      <SubPageHeader />
      <div className="customer-signup-main">
        <div className="customer-signup-container">
          <div className="customer-signup-form-container">
            <div className="customer-signup-header">
              <h1>Join as a Customer</h1>
              <p>Create your account and find trusted care for your family</p>
            </div>

            <form onSubmit={handleSubmit} className="customer-signup-form">
              {/* Personal Information */}
              <div className="form-section">
                <h3>Personal Information</h3>
                
                <div className="form-group">
                  <label htmlFor="customerName">Full Name *</label>
                  <div className="input-group">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className={errors.customerName ? 'error' : ''}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.customerName && <span className="error-message">{errors.customerName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerDOB">Date of Birth *</label>
                  <div className="input-group">
                    <i className="fas fa-birthday-cake"></i>
                    <input
                      type="date"
                      id="customerDOB"
                      name="customerDOB"
                      value={formData.customerDOB}
                      onChange={handleInputChange}
                      className={errors.customerDOB ? 'error' : ''}
                    />
                  </div>
                  {errors.customerDOB && <span className="error-message">{errors.customerDOB}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerArea">Area in Lebanon *</label>
                  <div className="input-group">
                    <i className="fas fa-map-marker-alt"></i>
                    <select
                      id="customerArea"
                      name="customerArea"
                      value={formData.customerArea}
                      onChange={handleInputChange}
                      className={errors.customerArea ? 'error' : ''}
                    >
                      <option value="">Select your area</option>
                      <option value="beirut">Beirut</option>
                      <option value="mount-lebanon">Mount Lebanon</option>
                      <option value="north-lebanon">North Lebanon</option>
                      <option value="south-lebanon">South Lebanon</option>
                      <option value="beqaa">Beqaa</option>
                      <option value="nabatieh">Nabatieh</option>
                      <option value="akkar">Akkar</option>
                      <option value="baalbek-hermel">Baalbek-Hermel</option>
                    </select>
                  </div>
                  {errors.customerArea && <span className="error-message">{errors.customerArea}</span>}
                </div>
              </div>

              {/* Contact Information */}
              <div className="form-section">
                <h3>Contact Information</h3>
                
                <div className="form-group">
                  <label htmlFor="customerEmail">Email Address *</label>
                  <div className="input-group">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className={errors.customerEmail ? 'error' : ''}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.customerEmail && <span className="error-message">{errors.customerEmail}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerPhone">Phone Number *</label>
                  <div className="input-group">
                    <i className="fas fa-phone"></i>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className={errors.customerPhone ? 'error' : ''}
                      placeholder="+961 XX XXX XXX"
                    />
                  </div>
                  {errors.customerPhone && <span className="error-message">{errors.customerPhone}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerPassword">Password *</label>
                  <div className="input-group">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      id="customerPassword"
                      name="customerPassword"
                      value={formData.customerPassword}
                      onChange={handleInputChange}
                      className={errors.customerPassword ? 'error' : ''}
                      placeholder="Create a password"
                    />
                    <button type="button" className="password-toggle">
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                  {errors.customerPassword && <span className="error-message">{errors.customerPassword}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerConfirmPassword">Confirm Password *</label>
                  <div className="input-group">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      id="customerConfirmPassword"
                      name="customerConfirmPassword"
                      value={formData.customerConfirmPassword}
                      onChange={handleInputChange}
                      className={errors.customerConfirmPassword ? 'error' : ''}
                      placeholder="Confirm your password"
                    />
                    <button type="button" className="password-toggle">
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                  {errors.customerConfirmPassword && <span className="error-message">{errors.customerConfirmPassword}</span>}
                </div>
              </div>

              {/* Children Section */}
              <div className="form-section">
                <h3>Children Information</h3>
                <p className="section-description">Add information about your children who need care</p>
                
                <div className="add-section-btn" onClick={addChild}>
                  <i className="fas fa-plus"></i>
                  <span>Add Child</span>
                </div>

                <div className="children-container">
                  {formData.children.map((child) => (
                    <div key={child.id} className="child-item">
                      <div className="item-header">
                        <div className="section-card-title">
                          <i className="fas fa-child"></i>
                          <span>Child {formData.children.indexOf(child) + 1}</span>
                        </div>
                        <button type="button" onClick={() => removeChild(child.id)} className="remove-btn">
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
                              onChange={(e) => updateChild(child.id, 'name', e.target.value)}
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
                              onChange={(e) => updateChild(child.id, 'age', e.target.value)}
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
                            value={child.specialNeeds}
                            onChange={(e) => updateChild(child.id, 'specialNeeds', e.target.value)}
                            placeholder="e.g., Drawing, Soccer, Reading, Music..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>School Schedule *</label>
                        <div className="checkbox-group">
                          <label className="checkbox-container">
                            <input type="radio" name={`schoolType_${child.id}`} value="regular" />
                            <span className="checkmark"></span>
                            <div className="checkbox-content">
                              <i className="fas fa-school"></i>
                              <span>Regular School</span>
                            </div>
                          </label>
                          <label className="checkbox-container">
                            <input type="radio" name={`schoolType_${child.id}`} value="homeschooled" />
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
                            onChange={(e) => updateChild(child.id, 'specialNeeds', e.target.value)}
                            placeholder="Any allergies, medical conditions, or special care requirements..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pets Section */}
              <div className="form-section">
                <h3>Pets Information</h3>
                <p className="section-description">Add information about your pets who need care</p>
                
                <div className="add-section-btn" onClick={addPet}>
                  <i className="fas fa-plus"></i>
                  <span>Add Pet</span>
                </div>

                <div className="pets-container">
                  {formData.pets.map((pet) => (
                    <div key={pet.id} className="pet-item">
                      <div className="item-header">
                        <div className="section-card-title">
                          <i className="fas fa-paw"></i>
                          <span>Pet {formData.pets.indexOf(pet) + 1}</span>
                        </div>
                        <button type="button" onClick={() => removePet(pet.id)} className="remove-btn">
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
                              onChange={(e) => updatePet(pet.id, 'name', e.target.value)}
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
                              onChange={(e) => updatePet(pet.id, 'age', e.target.value)}
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
                          <label className="pet-type-option">
                            <input type="radio" name={`petType_${pet.id}`} value="dog" />
                            <i className="fas fa-dog"></i>
                            <span>Dog</span>
                          </label>
                          <label className="pet-type-option">
                            <input type="radio" name={`petType_${pet.id}`} value="cat" />
                            <i className="fas fa-cat"></i>
                            <span>Cat</span>
                          </label>
                          <label className="pet-type-option">
                            <input type="radio" name={`petType_${pet.id}`} value="bird" />
                            <i className="fas fa-dove"></i>
                            <span>Bird</span>
                          </label>
                          <label className="pet-type-option">
                            <input type="radio" name={`petType_${pet.id}`} value="fish" />
                            <i className="fas fa-fish"></i>
                            <span>Fish</span>
                          </label>
                          <label className="pet-type-option">
                            <input type="radio" name={`petType_${pet.id}`} value="rabbit" />
                            <i className="fas fa-paw"></i>
                            <span>Rabbit</span>
                          </label>
                          <label className="pet-type-option">
                            <input type="radio" name={`petType_${pet.id}`} value="other" />
                            <i className="fas fa-paw"></i>
                            <span>Other</span>
                          </label>
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
                              onChange={(e) => updatePet(pet.id, 'breed', e.target.value)}
                              placeholder="e.g., Golden Retriever, Persian..."
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Size</label>
                          <div className="input-group">
                            <i className="fas fa-ruler"></i>
                            <select
                              value={pet.size || ''}
                              onChange={(e) => updatePet(pet.id, 'size', e.target.value)}
                            >
                              <option value="">Select size</option>
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="large">Large</option>
                              <option value="extra-large">Extra Large</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Personality & Behavior</label>
                        <div className="input-group">
                          <i className="fas fa-heart"></i>
                          <textarea
                            value={pet.personality || ''}
                            onChange={(e) => updatePet(pet.id, 'personality', e.target.value)}
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
                            onChange={(e) => updatePet(pet.id, 'careInstructions', e.target.value)}
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
                            onChange={(e) => updatePet(pet.id, 'specialNeeds', e.target.value)}
                            placeholder="Any medical conditions, allergies, medications, or special care requirements..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="form-group">
                <label className="checkbox-container terms-checkbox">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleCheckboxChange}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-text">
                    I agree to the <a href="#" className="terms-link">Terms and Conditions</a> and <a href="#" className="terms-link">Privacy Policy</a> *
                  </span>
                </label>
                {errors.termsAccepted && <span className="error-message">{errors.termsAccepted}</span>}
              </div>

              <button type="submit" className="btn-auth" disabled={isLoading}>
                <span className="btn-text">Create Customer Account</span>
                <div className="btn-loader" style={{ display: isLoading ? 'block' : 'none' }}>
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/customer-login">Sign in here</Link></p>
              <p>Are you a sitter? <Link to="/signup">Join as a sitter</Link></p>
            </div>
          </div>

          <div className="auth-side">
            <div className="auth-side-content">
              <h2>Find Trusted Care</h2>
              <p>Connect with verified sitters who will care for your children and pets like their own.</p>
              <div className="benefits">
                <div className="benefit-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Background verified sitters</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-star"></i>
                  <span>Rated and reviewed</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-clock"></i>
                  <span>Flexible scheduling</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-mobile-alt"></i>
                  <span>Easy booking system</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-heart"></i>
                  <span>Personalized care</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-dollar-sign"></i>
                  <span>Transparent pricing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerSignupPage