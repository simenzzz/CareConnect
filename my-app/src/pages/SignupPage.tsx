import React, { useState } from 'react'
import { logger } from '../utils/logger';
import { Link, useNavigate } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import { authService } from '../services/authService'
import storageService from '../services/storageService'
import { lebanonAreas } from '../data/lebanon'
import {
  isValidEmail,
  isValidLebanesePhone,
  isOver18,
  isValidPassword,
  getPasswordErrorMessage,
} from '../utils/validation'
import SkillsManager from '../components/signup/SkillsManager'
import DocumentUploadSection from '../components/signup/DocumentUploadSection'
import './SignupPage.css'

interface FormData {
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  area: string
  location: string
  hoursPerWeek: string
  sitterType: string[]
  description: string
  skills: string[]
  cv: File | null
  identityDocument: File | null
  termsAccepted: boolean
}

interface FormErrors {
  [key: string]: string
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    area: '',
    location: '',
    hoursPerWeek: '',
    sitterType: [],
    description: '',
    skills: [],
    cv: null,
    identityDocument: null,
    termsAccepted: false
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadingCV, setUploadingCV] = useState(false)
  const [uploadingID, setUploadingID] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset location when area changes
      ...(name === 'area' && { location: '' })
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
    if (name === 'email' && value.trim()) {
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

    if (name === 'phone' && value.trim()) {
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

    if (name === 'dateOfBirth' && value) {
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

    if (name === 'password' && value) {
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
    const { name, value, checked } = e.target
    
    if (name === 'sitterType') {
      setFormData(prev => ({
        ...prev,
        sitterType: checked 
          ? [...prev.sitterType, value]
          : prev.sitterType.filter(type => type !== value)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    }
  }

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const handleAddSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, skill]
    }))
    // Clear any skill errors
    setErrors(prev => ({
      ...prev,
      skills: ''
    }))
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files[0]) {
      const file = files[0]
      
      // Just store the file in form data, don't upload yet
      setFormData(prev => ({
        ...prev,
        [name]: file
      }))
      
      // Clear any previous errors for this field
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
      
      logger.debug(`📎 File selected for ${name}:`, file.name)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required'
    } else if (!isOver18(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'You must be at least 18 years old to register'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!isValidLebanesePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Lebanese phone number'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = getPasswordErrorMessage(formData.password)
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.area) newErrors.area = 'Area is required'
    if (!formData.location) newErrors.location = 'Location is required'
    if (!formData.hoursPerWeek) newErrors.hoursPerWeek = 'Hours per week is required'
    if (formData.sitterType.length === 0) newErrors.sitterType = 'Please select at least one sitter type'
    
    // Check if files are selected
    if (!formData.cv) newErrors.cv = 'Please select your CV'
    if (!formData.identityDocument) newErrors.identityDocument = 'Please select your identity document'
    
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || document.querySelector('.error')
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Show general error message summarizing validation issues
      setErrors(prev => ({
        ...prev,
        general: 'Please fill in all required fields correctly before submitting.'
      }))
      return
    }

    setIsLoading(true)
    
    try {
      logger.debug('🚀 Starting sitter signup...')
      
      // Step 1: Create Firebase account first (without documents)
      logger.debug('👤 Creating sitter signup...')
      
      // Convert sitterType array to single character: B (baby), P (pet), T (both)
      let sitterTypeChar = 'T'
      if (formData.sitterType.length === 1) {
        sitterTypeChar = formData.sitterType[0] === 'baby-sitter' ? 'B' : 'P'
      } else if (formData.sitterType.length === 2) {
        sitterTypeChar = 'T' // Both types selected
      }
      
      const profileDataWithoutDocs = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        area: formData.area,
        city: formData.location,
        phone: formData.phone,
        hoursPerWeek: formData.hoursPerWeek,
        sitterType: sitterTypeChar, // B, P, or T
        experience: 'Not specified',
        description: formData.description,
        skills: formData.skills
      }
      
      const signupResult = await authService.signup({
        email: formData.email,
        password: formData.password,
        userType: 'sitter',
        profileData: profileDataWithoutDocs
      })
      
      if (!signupResult.success) {
        logger.error('❌ Account creation failed:', signupResult.error)
        setErrors(prev => ({
          ...prev,
          general: signupResult.error || 'Account creation failed. Please try again.'
        }))
        setIsLoading(false)
        return
      }
      
      logger.debug('✅ Firebase account created successfully')
      
      // Step 2: Now upload documents to Firebase Storage
      logger.debug('📤 Uploading documents...')
      let uploadedCvUrl = ''
      let uploadedIdUrl = ''
      
      if (formData.cv) {
        setUploadingCV(true)
        const cvResult = await storageService.uploadCV(formData.cv, formData.fullName)
        setUploadingCV(false)
        
        if (!cvResult.success) {
          logger.error('❌ CV upload failed:', cvResult.error)
          // Account is created but document upload failed - log this
          setErrors(prev => ({
            ...prev,
            general: 'Account created but CV upload failed. You can update it later from your profile.'
          }))
          setIsLoading(false)
          return
        }
        uploadedCvUrl = cvResult.url || ''
        logger.debug('✅ CV uploaded:', uploadedCvUrl)
      }
      
      if (formData.identityDocument) {
        setUploadingID(true)
        const idResult = await storageService.uploadIdentityDocument(formData.identityDocument, formData.fullName)
        setUploadingID(false)
        
        if (!idResult.success) {
          logger.error('❌ Identity document upload failed:', idResult.error)
          // Account is created but document upload failed - log this
          setErrors(prev => ({
            ...prev,
            general: 'Account created but identity document upload failed. You can update it later from your profile.'
          }))
          setIsLoading(false)
          return
        }
        uploadedIdUrl = idResult.url || ''
        logger.debug('✅ Identity Document uploaded:', uploadedIdUrl)
      }
      
      // Step 3: Update the user profile with document URLs in the database
      logger.debug('📝 Updating database with document URLs...')
      const updateResult = await authService.updateSitterDocuments(uploadedCvUrl, uploadedIdUrl)
      
      if (!updateResult.success) {
        logger.error('❌ Failed to update documents in database:', updateResult.error)
        setErrors(prev => ({
          ...prev,
          general: 'Account created but failed to save document links. Please contact support.'
        }))
        setIsLoading(false)
        return
      }
      
      logger.debug('✅ Documents saved to database')
      
      const result = signupResult
      
      if (result.success) {
        logger.debug('✅ Signup successful:', result.data)
        // Redirect to homepage with success message
        navigate('/?signup=success')
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
    <div className="signup-page">
      <SubPageHeader />
      <div className="signup-main">
        <div className="signup-container">
          <div className="signup-form-container">
            <div className="signup-header">
              <h1>Join as a Sitter</h1>
              <p>Start your journey as a trusted caregiver</p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              {/* Personal Information */}
              <div className="form-section">
                <h3>Personal Information</h3>
                
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <div className="input-group">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={errors.fullName ? 'error' : ''}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth *</label>
                  <div className="input-group">
                    <i className="fas fa-birthday-cake"></i>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className={errors.dateOfBirth ? 'error' : ''}
                    />
                  </div>
                  {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="area">Area in Lebanon *</label>
                  <div className="input-group">
                    <i className="fas fa-map-marker-alt"></i>
                    <select
                      id="area"
                      name="area"
                      value={formData.area}
                      onChange={handleInputChange}
                      className={errors.area ? 'error' : ''}
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
                  {errors.area && <span className="error-message">{errors.area}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location *</label>
                  <div className="input-group">
                    <i className="fas fa-location-dot"></i>
                    <select
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className={errors.location ? 'error' : ''}
                      disabled={!formData.area}
                    >
                      <option value="">Select your location</option>
                      {formData.area && lebanonAreas[formData.area as keyof typeof lebanonAreas]?.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.location && <span className="error-message">{errors.location}</span>}
                </div>
              </div>

              {/* Work Information */}
              <div className="form-section">
                <h3>Work Information</h3>
                
                <div className="form-group">
                  <label htmlFor="hoursPerWeek">How many hours can you work per week? *</label>
                  <div className="input-group">
                    <i className="fas fa-clock"></i>
                    <select
                      id="hoursPerWeek"
                      name="hoursPerWeek"
                      value={formData.hoursPerWeek}
                      onChange={handleInputChange}
                      className={errors.hoursPerWeek ? 'error' : ''}
                    >
                      <option value="">Select hours per week</option>
                      <option value="1-10">1-10 hours</option>
                      <option value="11-20">11-20 hours</option>
                      <option value="21-30">21-30 hours</option>
                      <option value="31-40">31-40 hours</option>
                      <option value="40+">40+ hours</option>
                    </select>
                  </div>
                  {errors.hoursPerWeek && <span className="error-message">{errors.hoursPerWeek}</span>}
                </div>

                <div className="form-group">
                  <label>What type of sitter are you? *</label>
                  <div className="radio-group">
                    <label className="radio-container">
                      <input
                        type="checkbox"
                        name="sitterType"
                        value="pet-sitter"
                        checked={formData.sitterType.includes('pet-sitter')}
                        onChange={handleCheckboxChange}
                      />
                      <span className="radio-mark"></span>
                      <div className="radio-content">
                        <i className="fas fa-paw"></i>
                        <span>Pet Sitter</span>
                      </div>
                    </label>
                    <label className="radio-container">
                      <input
                        type="checkbox"
                        name="sitterType"
                        value="baby-sitter"
                        checked={formData.sitterType.includes('baby-sitter')}
                        onChange={handleCheckboxChange}
                      />
                      <span className="radio-mark"></span>
                      <div className="radio-content">
                        <i className="fas fa-baby"></i>
                        <span>Baby Sitter</span>
                      </div>
                    </label>
                  </div>
                  {errors.sitterType && <span className="error-message">{errors.sitterType}</span>}
                </div>

                <SkillsManager
                  skills={formData.skills}
                  onAdd={handleAddSkill}
                  onRemove={handleRemoveSkill}
                  error={errors.skills}
                />

                {/* Description Section */}
                <div className="form-group">
                  <label htmlFor="description">Describe Yourself</label>
                  <p className="help-text">Tell families about yourself, your experience, and why you'd be a great sitter</p>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={errors.description ? 'error' : ''}
                    placeholder="Share your experience, personality, and what makes you special..."
                    rows={6}
                    maxLength={1000}
                  />
                  <div className="char-count">
                    {formData.description.length}/1000 characters
                  </div>
                  {errors.description && <span className="error-message">{errors.description}</span>}
                </div>
              </div>

              {/* Contact Information */}
              <div className="form-section">
                <h3>Contact Information</h3>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <div className="input-group">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'error' : ''}
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <div className="input-group">
                    <i className="fas fa-phone"></i>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'error' : ''}
                      placeholder="+961 XX XXX XXX"
                    />
                  </div>
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <div className="input-group">
                    <i className="fas fa-lock"></i>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? 'error' : ''}
                      placeholder="Create a password"
                    />
                    <button type="button" className="password-toggle" onClick={togglePassword}>
                      <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className="input-group">
                    <i className="fas fa-lock"></i>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={errors.confirmPassword ? 'error' : ''}
                      placeholder="Confirm your password"
                    />
                    <button type="button" className="password-toggle" onClick={toggleConfirmPassword}>
                      <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>
              </div>

              <DocumentUploadSection
                cv={formData.cv}
                identityDocument={formData.identityDocument}
                uploadingCV={uploadingCV}
                uploadingID={uploadingID}
                onFileChange={handleFileChange}
                cvError={errors.cv}
                idError={errors.identityDocument}
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
                <span className="btn-text">Create Account</span>
                <div className="btn-loader" style={{ display: isLoading ? 'block' : 'none' }}>
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign in here</Link></p>
              <p>Are you a customer? <Link to="/customer-signup">Sign up as a customer</Link></p>
            </div>
          </div>

          <div className="auth-side">
            <div className="auth-side-content">
              <h2>Why Join CareConnect?</h2>
              <p>Become part of Lebanon's most trusted caregiving community and start earning while making a difference.</p>
              <div className="benefits">
                <div className="benefit-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Background verified</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-dollar-sign"></i>
                  <span>Competitive rates</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-calendar"></i>
                  <span>Flexible hours</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-users"></i>
                  <span>Supportive team</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-mobile-alt"></i>
                  <span>Easy booking system</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-heart"></i>
                  <span>Make a difference</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupPage