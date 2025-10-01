import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import './SignupPage.css'

interface FormData {
  fullName: string
  age: string
  dateOfBirth: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  area: string
  hoursPerWeek: string
  sitterType: string[]
  cv: File | null
  identityDocument: File | null
  termsAccepted: boolean
}

interface FormErrors {
  [key: string]: string
}

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    age: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    area: '',
    hoursPerWeek: '',
    sitterType: [],
    cv: null,
    identityDocument: null,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.age) newErrors.age = 'Age is required'
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.area) newErrors.area = 'Area is required'
    if (!formData.hoursPerWeek) newErrors.hoursPerWeek = 'Hours per week is required'
    if (formData.sitterType.length === 0) newErrors.sitterType = 'Please select at least one sitter type'
    if (!formData.cv) newErrors.cv = 'CV is required'
    if (!formData.identityDocument) newErrors.identityDocument = 'Identity document is required'
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
      
      alert('Account created successfully!')
    } catch (error) {
      console.error('Error creating account:', error)
      alert('Error creating account. Please try again.')
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

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="age">Age *</label>
                    <div className="input-group">
                      <i className="fas fa-calendar-alt"></i>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className={errors.age ? 'error' : ''}
                        placeholder="Your age"
                        min="18"
                        max="65"
                      />
                    </div>
                    {errors.age && <span className="error-message">{errors.age}</span>}
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
                  {errors.area && <span className="error-message">{errors.area}</span>}
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
                  <div className="checkbox-group">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        name="sitterType"
                        value="pet-sitter"
                        checked={formData.sitterType.includes('pet-sitter')}
                        onChange={handleCheckboxChange}
                      />
                      <span className="checkmark"></span>
                      <div className="checkbox-content">
                        <i className="fas fa-paw"></i>
                        <span>Pet Sitter</span>
                      </div>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        name="sitterType"
                        value="baby-sitter"
                        checked={formData.sitterType.includes('baby-sitter')}
                        onChange={handleCheckboxChange}
                      />
                      <span className="checkmark"></span>
                      <div className="checkbox-content">
                        <i className="fas fa-baby"></i>
                        <span>Baby Sitter</span>
                      </div>
                    </label>
                  </div>
                  {errors.sitterType && <span className="error-message">{errors.sitterType}</span>}
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
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? 'error' : ''}
                      placeholder="Create a password"
                    />
                    <button type="button" className="password-toggle">
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className="input-group">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={errors.confirmPassword ? 'error' : ''}
                      placeholder="Confirm your password"
                    />
                    <button type="button" className="password-toggle">
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>
              </div>

              {/* Document Upload */}
              <div className="form-section">
                <h3>Required Documents</h3>
                
                <div className="form-group">
                  <label htmlFor="cv">CV/Resume (PDF) *</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="cv"
                      name="cv"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className={errors.cv ? 'error' : ''}
                    />
                    <label htmlFor="cv" className="file-upload-label">
                      <i className="fas fa-file-pdf"></i>
                      <span className="file-text">Choose CV file</span>
                      <span className="file-info">PDF format only</span>
                    </label>
                  </div>
                  {errors.cv && <span className="error-message">{errors.cv}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="identityDocument">Identity Document *</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="identityDocument"
                      name="identityDocument"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className={errors.identityDocument ? 'error' : ''}
                    />
                    <label htmlFor="identityDocument" className="file-upload-label">
                      <i className="fas fa-id-card"></i>
                      <span className="file-text">Choose Identity Document</span>
                      <span className="file-info">PDF, JPG, PNG formats accepted</span>
                    </label>
                  </div>
                  {errors.identityDocument && <span className="error-message">{errors.identityDocument}</span>}
                  <p className="help-text">Upload your Lebanese ID card or passport</p>
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