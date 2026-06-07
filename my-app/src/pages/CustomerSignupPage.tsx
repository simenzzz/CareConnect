import React, { useState } from 'react'
import { logger } from '../utils/logger';
import { Link, useNavigate } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import { authService } from '../services/authService'
import { lebanonAreas } from '../data/lebanon'
import {
  isValidEmail,
  isValidLebanesePhone,
  isOver18,
  isValidPassword,
  getPasswordErrorMessage,
} from '../utils/validation'
import ChildrenSection from '../components/signup/ChildrenSection'
import PetsSection from '../components/signup/PetsSection'
import type { Child, Pet } from '../components/signup/types'
import './CustomerSignupPage.css'

interface FormData {
  customerName: string
  customerDOB: string
  customerArea: string
  customerLocation: string
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
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerDOB: '',
    customerArea: '',
    customerLocation: '',
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset location when area changes
      ...(name === 'customerArea' && { customerLocation: '' })
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

        // Clear general error when user starts typing
        if (errors.general) {
          setErrors(prev => ({
            ...prev,
            general: ''
          }))
        }

        // Clear success message when user starts typing
        if (successMessage) {
          setSuccessMessage('')
        }

    // Real-time validation for specific fields
    if (name === 'customerEmail' && value.trim()) {
      if (!isValidEmail(value)) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Please enter a valid email address'
        }))
      } else {
        // Clear error if validation passes
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }))
      }
    }

    if (name === 'customerPhone' && value.trim()) {
      if (!isValidLebanesePhone(value)) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Please enter a valid Lebanese phone number'
        }))
      } else {
        // Clear error if validation passes
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }))
      }
    }

    if (name === 'customerDOB' && value) {
      if (!isOver18(value)) {
        setErrors(prev => ({
          ...prev,
          [name]: 'You must be at least 18 years old to register'
        }))
      } else {
        // Clear error if validation passes
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }))
      }
    }

    if (name === 'customerPassword' && value) {
      if (!isValidPassword(value)) {
        setErrors(prev => ({
          ...prev,
          [name]: getPasswordErrorMessage(value)
        }))
      } else {
        // Clear error if validation passes
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }))
      }
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const addChild = () => {
    const newChild: Child = {
      id: Date.now().toString(),
      name: '',
      age: '',
      hobbies: '',
      schoolType: '',
      specialNeeds: '',
      isConfirmed: false
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
      personality: '',
      careInstructions: '',
      specialNeeds: '',
      isConfirmed: false
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

  const confirmChild = (childId: string) => {
    logger.debug('🔍 confirmChild called with ID:', childId)
    const child = formData.children.find(c => c.id === childId)
    if (!child) {
      logger.debug('❌ Child not found with ID:', childId)
      return
    }
    
    logger.debug('🔍 Found child:', child)
    
    // Validate required fields
    if (!child.name.trim() || !child.age.trim()) {
      logger.debug('❌ Validation failed - missing name or age')
      setErrors(prev => ({
        ...prev,
        general: 'Please fill in the child\'s name and age before confirming.'
      }))
      return
    }
    
    logger.debug('✅ Validation passed, marking child as confirmed')
    
    // Mark child as confirmed
    setFormData(prev => ({
      ...prev,
      children: prev.children.map(c => 
        c.id === childId ? { ...c, isConfirmed: true } : c
      )
    }))
    
    // Show success message
    setSuccessMessage(`✅ ${child.name} has been confirmed for your account!`)
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const confirmPet = (petId: string) => {
    logger.debug('🔍 confirmPet called with ID:', petId)
    const pet = formData.pets.find(p => p.id === petId)
    if (!pet) {
      logger.debug('❌ Pet not found with ID:', petId)
      return
    }
    
    logger.debug('🔍 Found pet:', pet)
    
    // Validate required fields
    if (!pet.name.trim() || !pet.type.trim()) {
      logger.debug('❌ Validation failed - missing name or type')
      setErrors(prev => ({
        ...prev,
        general: 'Please fill in the pet\'s name and type before confirming.'
      }))
      return
    }
    
    logger.debug('✅ Validation passed, marking pet as confirmed')
    
    // Mark pet as confirmed
    setFormData(prev => ({
      ...prev,
      pets: prev.pets.map(p => 
        p.id === petId ? { ...p, isConfirmed: true } : p
      )
    }))
    
    // Show success message
    setSuccessMessage(`✅ ${pet.name} has been confirmed for your account!`)
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000)
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
    
    if (!formData.customerDOB) {
      newErrors.customerDOB = 'Date of birth is required'
    } else if (!isOver18(formData.customerDOB)) {
      newErrors.customerDOB = 'You must be at least 18 years old to register'
    }
    
    if (!formData.customerArea) newErrors.customerArea = 'Area is required'
    if (!formData.customerLocation) newErrors.customerLocation = 'Location is required'
    
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required'
    } else if (!isValidEmail(formData.customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address'
    }
    
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required'
    } else if (!isValidLebanesePhone(formData.customerPhone)) {
      newErrors.customerPhone = 'Please enter a valid Lebanese phone number'
    }
    
    if (!formData.customerPassword) {
      newErrors.customerPassword = 'Password is required'
    } else if (!isValidPassword(formData.customerPassword)) {
      newErrors.customerPassword = getPasswordErrorMessage(formData.customerPassword)
    }
    
    if (formData.customerPassword !== formData.customerConfirmPassword) {
      newErrors.customerConfirmPassword = 'Passwords do not match'
    }
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions'
    
    // Check if children and pets are confirmed (if any were added)
    const confirmedChildren = formData.children.filter(child => child.isConfirmed)
    const confirmedPets = formData.pets.filter(pet => pet.isConfirmed)
    
    if (formData.children.length > 0 && confirmedChildren.length === 0) {
      newErrors.general = 'Please confirm your children information before creating account'
    }
    
    if (formData.pets.length > 0 && confirmedPets.length === 0) {
      newErrors.general = 'Please confirm your pets information before creating account'
    }

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
      logger.debug('🚀 Starting customer signup...')
      
      // Prepare profile data for API - only include confirmed children and pets
      logger.debug('🔍 Before filtering - All children:', formData.children)
      logger.debug('🔍 Before filtering - All pets:', formData.pets)
      
      const confirmedChildren = formData.children.filter(child => {
        logger.debug(`🔍 Checking child ${child.name}: isConfirmed = ${child.isConfirmed}`)
        return child.isConfirmed
      })
      const confirmedPets = formData.pets.filter(pet => {
        logger.debug(`🔍 Checking pet ${pet.name}: isConfirmed = ${pet.isConfirmed}`)
        return pet.isConfirmed
      })
      
      logger.debug('🔍 After filtering - Confirmed children:', confirmedChildren)
      logger.debug('🔍 After filtering - Confirmed pets:', confirmedPets)
      
      const profileData = {
        fullName: formData.customerName,
        dateOfBirth: formData.customerDOB,
        area: formData.customerArea,
        city: formData.customerLocation,
        phone: formData.customerPhone,
        children: confirmedChildren,
        pets: confirmedPets
      }
      
      logger.debug('📤 Sending profile data:', JSON.stringify(profileData, null, 2))
      logger.debug('👶 Confirmed children count:', confirmedChildren.length)
      logger.debug('🐕 Confirmed pets count:', confirmedPets.length)
      
      // Call our auth service
      const result = await authService.signup({
        email: formData.customerEmail,
        password: formData.customerPassword,
        userType: 'customer',
        profileData: profileData
      })
      
      if (result.success) {
        setSuccessMessage('Customer account created successfully! Redirecting to login...')
        logger.debug('✅ Signup successful:', result.data)
        // Clear form on success
        setFormData({
          customerName: '',
          customerDOB: '',
          customerEmail: '',
          customerPhone: '',
          customerPassword: '',
          customerConfirmPassword: '',
          customerArea: '',
          customerLocation: '',
          children: [],
          pets: [],
          termsAccepted: false
        })
        // Redirect to customer login page after 2 seconds
        setTimeout(() => {
          navigate('/customer-login')
        }, 2000)
      } else {
        // Show error in the UI instead of alert
        setErrors(prev => ({
          ...prev,
          general: result.error || 'Account creation failed'
        }))
        logger.error('❌ Signup failed:', result.error)
      }
      
    } catch (error) {
      logger.error('Error creating account:', error)
      setErrors(prev => ({
        ...prev,
        general: 'Error creating account. Please try again.'
      }))
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
                      <option value="Beirut">Beirut</option>
                      <option value="Mount Lebanon">Mount Lebanon</option>
                      <option value="North Lebanon">North Lebanon</option>
                      <option value="South Lebanon">South Lebanon</option>
                      <option value="Bekaa">Bekaa</option>
                      <option value="Nabatieh">Nabatieh</option>
                    </select>
                  </div>
                  {errors.customerArea && <span className="error-message">{errors.customerArea}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerLocation">Location *</label>
                  <div className="input-group">
                    <i className="fas fa-location-dot"></i>
                    <select
                      id="customerLocation"
                      name="customerLocation"
                      value={formData.customerLocation}
                      onChange={handleInputChange}
                      className={errors.customerLocation ? 'error' : ''}
                      disabled={!formData.customerArea}
                    >
                      <option value="">Select your location</option>
                      {formData.customerArea && lebanonAreas[formData.customerArea as keyof typeof lebanonAreas]?.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.customerLocation && <span className="error-message">{errors.customerLocation}</span>}
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
                      type={showPassword ? "text" : "password"}
                      id="customerPassword"
                      name="customerPassword"
                      value={formData.customerPassword}
                      onChange={handleInputChange}
                      className={errors.customerPassword ? 'error' : ''}
                      placeholder="Create a password"
                    />
                    <button type="button" className="password-toggle" onClick={togglePassword}>
                      <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                    </button>
                  </div>
                  {errors.customerPassword && <span className="error-message">{errors.customerPassword}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customerConfirmPassword">Confirm Password *</label>
                  <div className="input-group">
                    <i className="fas fa-lock"></i>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="customerConfirmPassword"
                      name="customerConfirmPassword"
                      value={formData.customerConfirmPassword}
                      onChange={handleInputChange}
                      className={errors.customerConfirmPassword ? 'error' : ''}
                      placeholder="Confirm your password"
                    />
                    <button type="button" className="password-toggle" onClick={toggleConfirmPassword}>
                      <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
                    </button>
                  </div>
                  {errors.customerConfirmPassword && <span className="error-message">{errors.customerConfirmPassword}</span>}
                </div>
              </div>

              <ChildrenSection
                children={formData.children}
                onAdd={addChild}
                onRemove={removeChild}
                onUpdate={updateChild}
                onConfirm={confirmChild}
              />

              <PetsSection
                pets={formData.pets}
                onAdd={addPet}
                onRemove={removePet}
                onUpdate={updatePet}
                onConfirm={confirmPet}
              />

              {/* Terms and Conditions */}
              <div className="form-group">
                <div className="terms-agreement">
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '14px', color: '#2c3e50' }}>
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleCheckboxChange}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        marginTop: '2px',
                        accentColor: '#e74c3c',
                        cursor: 'pointer'
                      }}
                    />
                    <span>
                      I agree to the <a href="#" className="terms-link">Terms and Conditions</a> and <a href="#" className="terms-link">Privacy Policy</a> *
                    </span>
                  </label>
                </div>
                {errors.termsAccepted && <span className="error-message">{errors.termsAccepted}</span>}
              </div>

                {/* Success Message Display */}
                {successMessage && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i>
                    {successMessage}
                  </div>
                )}

                {/* General Error Display */}
                {errors.general && (
                  <div className="error-message general-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    {errors.general}
                  </div>
                )}

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