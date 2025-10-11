import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import { authService } from '../services/authService'
import './CustomerSignupPage.css'

interface Child {
  id: string
  name: string
  age: string
  hobbies: string
  schoolType: string
  specialNeeds: string
  isConfirmed: boolean
}

interface Pet {
  id: string
  name: string
  age: string
  type: string
  breed: string
  personality: string
  careInstructions: string
  specialNeeds: string
  isConfirmed: boolean
}

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

  // Lebanon geography data
  const lebanonAreas = {
    'Beirut': ['Hamra', 'Verdun', 'Ashrafieh', 'Gemmayzeh', 'Mar Mikhael', 'Ras Beirut', 'Achrafieh', 'Badaro', 'Sin el Fil', 'Bourj Hammoud'],
    'Mount Lebanon': ['Jounieh', 'Kaslik', 'Antelias', 'Dbayeh', 'Zalka', 'Baabda', 'Aley', 'Bhamdoun', 'Broummana', 'Metn', 'Hazmieh'],
    'North Lebanon': ['Tripoli', 'Zgharta', 'Koura', 'Bcharre', 'Batroun', 'Byblos', 'Jbeil', 'Amioun', 'Miniyeh'],
    'South Lebanon': ['Sidon', 'Tyre', 'Nabatieh', 'Marjayoun', 'Hasbaya', 'Jezzine', 'Saida', 'Sour', 'Bint Jbeil', 'Khiam'],
    'Bekaa': ['Zahle', 'Baalbek', 'Hermel', 'Rashaya', 'West Bekaa', 'Marjayoun', 'Chtaura', 'Anjar', 'Qabb Elias', 'Rayak'],
    'Nabatieh': ['Nabatieh', 'Marjayoun', 'Hasbaya', 'Bint Jbeil', 'Khiam', 'Tebnine', 'Ain Ebel', 'Deir Mimas', 'Kfar Kila', 'Rmeish']
  }

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
    console.log('🔍 confirmChild called with ID:', childId)
    const child = formData.children.find(c => c.id === childId)
    if (!child) {
      console.log('❌ Child not found with ID:', childId)
      return
    }
    
    console.log('🔍 Found child:', child)
    
    // Validate required fields
    if (!child.name.trim() || !child.age.trim()) {
      console.log('❌ Validation failed - missing name or age')
      setErrors(prev => ({
        ...prev,
        general: 'Please fill in the child\'s name and age before confirming.'
      }))
      return
    }
    
    console.log('✅ Validation passed, marking child as confirmed')
    
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
    console.log('🔍 confirmPet called with ID:', petId)
    const pet = formData.pets.find(p => p.id === petId)
    if (!pet) {
      console.log('❌ Pet not found with ID:', petId)
      return
    }
    
    console.log('🔍 Found pet:', pet)
    
    // Validate required fields
    if (!pet.name.trim() || !pet.type.trim()) {
      console.log('❌ Validation failed - missing name or type')
      setErrors(prev => ({
        ...prev,
        general: 'Please fill in the pet\'s name and type before confirming.'
      }))
      return
    }
    
    console.log('✅ Validation passed, marking pet as confirmed')
    
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

  // Validation helper functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidLebanesePhone = (phone: string): boolean => {
    // Lebanese phone number patterns: +961XXXXXXXXX or 961XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+961|961|0)?[0-9]{8}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const isOver18 = (dateOfBirth: string): boolean => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18
    }
    return age >= 18
  }

  const isValidPassword = (password: string): boolean => {
    // At least 8 characters
    if (password.length < 8) return false
    
    // At least 1 uppercase letter (A-Z)
    if (!/[A-Z]/.test(password)) return false
    
    // At least 1 lowercase letter (a-z)
    if (!/[a-z]/.test(password)) return false
    
    // At least 1 number (0-9)
    if (!/[0-9]/.test(password)) return false
    
    // At least 1 special character (!@#$%^&* etc.)
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false
    
    return true
  }

  const getPasswordErrorMessage = (password: string): string => {
    if (password.length < 8) return 'Password must be at least 8 characters long'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter (A-Z)'
    if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter (a-z)'
    if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number (0-9)'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least 1 special character (!@#$%^&* etc.)'
    return ''
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
      console.log('🚀 Starting customer signup...')
      
      // Prepare profile data for API - only include confirmed children and pets
      console.log('🔍 Before filtering - All children:', formData.children)
      console.log('🔍 Before filtering - All pets:', formData.pets)
      
      const confirmedChildren = formData.children.filter(child => {
        console.log(`🔍 Checking child ${child.name}: isConfirmed = ${child.isConfirmed}`)
        return child.isConfirmed
      })
      const confirmedPets = formData.pets.filter(pet => {
        console.log(`🔍 Checking pet ${pet.name}: isConfirmed = ${pet.isConfirmed}`)
        return pet.isConfirmed
      })
      
      console.log('🔍 After filtering - Confirmed children:', confirmedChildren)
      console.log('🔍 After filtering - Confirmed pets:', confirmedPets)
      
      const profileData = {
        fullName: formData.customerName,
        dateOfBirth: formData.customerDOB,
        area: formData.customerArea,
        city: formData.customerLocation,
        phone: formData.customerPhone,
        children: confirmedChildren,
        pets: confirmedPets
      }
      
      console.log('📤 Sending profile data:', JSON.stringify(profileData, null, 2))
      console.log('👶 Confirmed children count:', confirmedChildren.length)
      console.log('🐕 Confirmed pets count:', confirmedPets.length)
      
      // Call our auth service
      const result = await authService.signup({
        email: formData.customerEmail,
        password: formData.customerPassword,
        userType: 'customer',
        profileData: profileData
      })
      
      if (result.success) {
        setSuccessMessage('Customer account created successfully! Redirecting to login...')
        console.log('✅ Signup successful:', result.data)
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
        console.error('❌ Signup failed:', result.error)
      }
      
    } catch (error) {
      console.error('Error creating account:', error)
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
                            value={child.hobbies}
                            onChange={(e) => updateChild(child.id, 'hobbies', e.target.value)}
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
                              onChange={(e) => updateChild(child.id, 'schoolType', e.target.value)}
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
                              onChange={(e) => updateChild(child.id, 'schoolType', e.target.value)}
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
                            onChange={(e) => updateChild(child.id, 'specialNeeds', e.target.value)}
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
                          <button 
                            type="button" 
                            className="confirm-card-btn"
                            onClick={() => confirmChild(child.id)}
                          >
                            <i className="fas fa-check"></i>
                            <span>Confirm Child</span>
                          </button>
                        )}
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
                          <label className={`pet-type-option ${pet.type === 'dog' ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name={`petType_${pet.id}`} 
                              value="dog"
                              checked={pet.type === 'dog'}
                              onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            />
                            <i className="fas fa-dog"></i>
                            <span>Dog</span>
                          </label>
                          <label className={`pet-type-option ${pet.type === 'cat' ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name={`petType_${pet.id}`} 
                              value="cat"
                              checked={pet.type === 'cat'}
                              onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            />
                            <i className="fas fa-cat"></i>
                            <span>Cat</span>
                          </label>
                          <label className={`pet-type-option ${pet.type === 'bird' ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name={`petType_${pet.id}`} 
                              value="bird"
                              checked={pet.type === 'bird'}
                              onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            />
                            <i className="fas fa-dove"></i>
                            <span>Bird</span>
                          </label>
                          <label className={`pet-type-option ${pet.type === 'fish' ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name={`petType_${pet.id}`} 
                              value="fish"
                              checked={pet.type === 'fish'}
                              onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            />
                            <i className="fas fa-fish"></i>
                            <span>Fish</span>
                          </label>
                          <label className={`pet-type-option ${pet.type === 'rabbit' ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name={`petType_${pet.id}`} 
                              value="rabbit"
                              checked={pet.type === 'rabbit'}
                              onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            />
                            <i className="fas fa-paw"></i>
                            <span>Rabbit</span>
                          </label>
                          <label className={`pet-type-option ${pet.type === 'other' ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name={`petType_${pet.id}`} 
                              value="other"
                              checked={pet.type === 'other'}
                              onChange={(e) => updatePet(pet.id, 'type', e.target.value)}
                            />
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
                      
                      {/* Confirm Button */}
                      <div className="card-confirm-section">
                        {pet.isConfirmed ? (
                          <div className="confirmed-status">
                            <i className="fas fa-check-circle"></i>
                            <span>Confirmed</span>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            className="confirm-card-btn"
                            onClick={() => confirmPet(pet.id)}
                          >
                            <i className="fas fa-check"></i>
                            <span>Confirm Pet</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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