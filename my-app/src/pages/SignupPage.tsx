import React, { useEffect, useState } from 'react'
import { logger } from '../utils/logger';
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Cake,
  MapPin,
  Building2,
  Search,
  Clock,
  PawPrint,
  Baby,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CircleCheck,
  TriangleAlert,
  ShieldCheck,
  DollarSign,
  Calendar,
  Users,
  Smartphone,
  Heart,
  Camera,
} from 'lucide-react'
import SubPageHeader from '../components/SubPageHeader'
import Button from '../components/ui/Button'
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
import { useLocationMap } from '../components/booking/useLocationMap'
import type { LocationFormData } from '../components/booking/AddLocationForm'
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
  latitude: number
  longitude: number
  hoursPerWeek: string
  sitterType: string[]
  description: string
  profileImage: File | null
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
    latitude: 33.8547,
    longitude: 35.8623,
    hoursPerWeek: '',
    sitterType: [],
    description: '',
    profileImage: null,
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
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)
  const [profileImagePreview, setProfileImagePreview] = useState('')
  const [mapLocationData, setMapLocationData] = useState<LocationFormData>({
    location_name: 'Sitter location',
    address_name: '',
    street_name: '',
    building_name: '',
    floor: '',
    area: '',
    city: '',
    postal_code: '',
    latitude: 33.8547,
    longitude: 35.8623,
    is_default: false
  })
  const { mapRef, searchInputRef } = useLocationMap(true, setMapLocationData)

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      latitude: mapLocationData.latitude,
      longitude: mapLocationData.longitude,
      area: mapLocationData.area || prev.area,
      location: mapLocationData.city || prev.location
    }))
  }, [mapLocationData.latitude, mapLocationData.longitude, mapLocationData.area, mapLocationData.city])

  useEffect(() => {
    if (!formData.profileImage) {
      setProfileImagePreview('')
      return
    }
    const objectUrl = URL.createObjectURL(formData.profileImage)
    setProfileImagePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [formData.profileImage])

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
    if (!formData.profileImage) newErrors.profileImage = 'Please select a profile photo'
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

    const uploadedPaths: string[] = []
    let createdFirebaseAccount = false

    try {
      logger.debug('🚀 Starting sitter signup...')

      // Step 1: Create Firebase account first so Storage writes are UID-scoped.
      logger.debug('👤 Creating sitter signup...')
      const accountResult = await authService.createFirebaseAccount(formData.email, formData.password)
      if (!accountResult.success) {
        setErrors(prev => ({
          ...prev,
          general: accountResult.error || 'Account creation failed. Please try again.'
        }))
        return
      }
      createdFirebaseAccount = true

      // Convert sitterType array to single character: B (baby), P (pet), T (both)
      let sitterTypeChar = 'T'
      if (formData.sitterType.length === 1) {
        sitterTypeChar = formData.sitterType[0] === 'baby-sitter' ? 'B' : 'P'
      } else if (formData.sitterType.length === 2) {
        sitterTypeChar = 'T' // Both types selected
      }

      logger.debug('✅ Firebase account created successfully')

      // Step 2: Upload required profile photo and private documents to Firebase Storage.
      logger.debug('📤 Uploading profile photo and documents...')
      let uploadedProfileImageUrl = ''
      let uploadedProfileImagePath = ''
      let uploadedCvUrl = ''
      let uploadedIdUrl = ''

      if (formData.profileImage) {
        setUploadingProfileImage(true)
        const profileImageResult = await storageService.uploadProfileImage(formData.profileImage)
        setUploadingProfileImage(false)

        if (!profileImageResult.success || !profileImageResult.url || !profileImageResult.path) {
          throw new Error(profileImageResult.error || 'Profile photo upload failed. Please try again.')
        }
        uploadedProfileImageUrl = profileImageResult.url
        uploadedProfileImagePath = profileImageResult.path
        uploadedPaths.push(profileImageResult.path)
      }

      if (formData.cv) {
        setUploadingCV(true)
        const cvResult = await storageService.uploadCV(formData.cv, formData.fullName)
        setUploadingCV(false)

        if (!cvResult.success || !cvResult.url) {
          throw new Error(cvResult.error || 'CV upload failed. Please try again.')
        }
        uploadedCvUrl = cvResult.url
        if (cvResult.path) uploadedPaths.push(cvResult.path)
      }

      if (formData.identityDocument) {
        setUploadingID(true)
        const idResult = await storageService.uploadIdentityDocument(formData.identityDocument, formData.fullName)
        setUploadingID(false)

        if (!idResult.success || !idResult.url) {
          throw new Error(idResult.error || 'Identity document upload failed. Please try again.')
        }
        uploadedIdUrl = idResult.url
        if (idResult.path) uploadedPaths.push(idResult.path)
      }

      // Step 3: Register the app profile with all Storage object references.
      const profileData = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        area: formData.area,
        city: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        phone: formData.phone,
        hoursPerWeek: formData.hoursPerWeek,
        sitterType: sitterTypeChar, // B, P, or T
        experience: 'Not specified',
        description: formData.description,
        profileImageUrl: uploadedProfileImageUrl,
        profileImagePath: uploadedProfileImagePath,
        cvUrl: uploadedCvUrl,
        identityDocumentUrl: uploadedIdUrl,
        skills: formData.skills
      }

      const result = await authService.registerProfile(accountResult.user, 'sitter', profileData)
      logger.debug('✅ Signup successful:', result.data)
      navigate('/?signup=success')

    } catch (error) {
      logger.error('Error creating account:', error)
      await Promise.all(
        uploadedPaths.map((path) =>
          storageService.deleteFile(path).catch((deleteError) => logger.error('Failed to cleanup uploaded file:', deleteError)),
        ),
      )
      if (createdFirebaseAccount) {
        await authService.deleteCurrentFirebaseUser()
      }
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'Error creating account. Please try again.'
      }))
    } finally {
      setUploadingProfileImage(false)
      setUploadingCV(false)
      setUploadingID(false)
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
              <h1>Join as a sitter</h1>
              <p>Start your journey as a trusted caregiver</p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              {/* Personal Information */}
              <div className="form-section">
                <h3>Personal information</h3>

                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <div className="input-group">
                    <User size={18} />
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
                    <Cake size={18} />
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
                    <MapPin size={18} />
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
                    <Building2 size={18} />
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

                <div className="form-group">
                  <label htmlFor="sitter-location-search">Pin Your Service Area *</label>
                  <p className="help-text">Search in Lebanon, click on the map, or drag the marker to set your coordinates.</p>
                  <div className="input-group">
                    <Search size={18} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      id="sitter-location-search"
                      placeholder="Search for your area in Lebanon..."
                    />
                  </div>
                  <div className="signup-map" ref={mapRef}></div>
                  <div className="coordinate-readout">
                    {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div className="form-section">
                <h3>Work information</h3>

                <div className="form-group">
                  <label htmlFor="hoursPerWeek">How many hours can you work per week? *</label>
                  <div className="input-group">
                    <Clock size={18} />
                    <select
                      id="hoursPerWeek"
                      name="hoursPerWeek"
                      value={formData.hoursPerWeek}
                      onChange={handleInputChange}
                      className={errors.hoursPerWeek ? 'error' : ''}
                    >
                      <option value="">Select hours per week</option>
                      <option value="10">1-10 hours</option>
                      <option value="20">11-20 hours</option>
                      <option value="30">21-30 hours</option>
                      <option value="40">31-40 hours</option>
                      <option value="50">40+ hours</option>
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
                        <PawPrint size={18} />
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
                        <Baby size={18} />
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
                <h3>Contact information</h3>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <div className="input-group">
                    <Mail size={18} />
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
                    <Phone size={18} />
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
                    <Lock size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? 'error' : ''}
                      placeholder="Create a password"
                    />
                    <button type="button" className="password-toggle" onClick={togglePassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <div className="input-group">
                    <Lock size={18} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={errors.confirmPassword ? 'error' : ''}
                      placeholder="Confirm your password"
                    />
                    <button type="button" className="password-toggle" onClick={toggleConfirmPassword} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>
              </div>

              <div className="form-section">
                <h3>Profile photo *</h3>
                <div className="form-group">
                  <label htmlFor="profileImage">Public sitter profile photo *</label>
                  <p className="help-text">This photo appears on your sitter card after verification.</p>
                  <div className={`file-upload profile-photo-upload ${formData.profileImage ? 'has-file' : ''}`}>
                    <input
                      type="file"
                      id="profileImage"
                      name="profileImage"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      className={errors.profileImage ? 'error' : ''}
                      disabled={uploadingProfileImage}
                    />
                    <label htmlFor="profileImage" className="file-upload-label">
                      {profileImagePreview ? (
                        <>
                          <img src={profileImagePreview} alt="" className="profile-photo-preview" />
                          <span className="file-text">Photo selected</span>
                          <span className="file-info">{formData.profileImage?.name}</span>
                        </>
                      ) : (
                        <>
                          <Camera size={28} />
                          <span className="file-text">Choose profile photo</span>
                          <span className="file-info">JPG, PNG, or WebP (Max 5MB)</span>
                        </>
                      )}
                    </label>
                  </div>
                  {errors.profileImage && <span className="error-message">{errors.profileImage}</span>}
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
                  <label className="terms-checkbox">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleCheckboxChange}
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
                    <CircleCheck size={18} />
                    {successMessage}
                  </div>
                )}

                {/* General Error Display */}
                {errors.general && (
                  <div className="general-error">
                    <TriangleAlert size={18} />
                    {errors.general}
                  </div>
                )}

              <Button type="submit" loading={isLoading} fullWidth size="lg">
                Create account
              </Button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/careers/sitter/login">Sign in here</Link></p>
              <p>Are you a customer? <Link to="/customer-signup">Sign up as a customer</Link></p>
            </div>
          </div>

          <div className="auth-side">
            <div className="auth-side-content">
              <h2>Why join CareConnect?</h2>
              <p>Become part of Lebanon's most trusted caregiving community and start earning while making a difference.</p>
              <div className="benefits">
                <div className="benefit-item">
                  <ShieldCheck size={18} />
                  <span>Background verified</span>
                </div>
                <div className="benefit-item">
                  <DollarSign size={18} />
                  <span>Competitive rates</span>
                </div>
                <div className="benefit-item">
                  <Calendar size={18} />
                  <span>Flexible hours</span>
                </div>
                <div className="benefit-item">
                  <Users size={18} />
                  <span>Supportive team</span>
                </div>
                <div className="benefit-item">
                  <Smartphone size={18} />
                  <span>Easy booking system</span>
                </div>
                <div className="benefit-item">
                  <Heart size={18} />
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
