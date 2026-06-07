import React, { useState, useEffect } from 'react'
import { logger } from '../utils/logger';
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { auth } from '../config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { authService } from '../services/authService'
import customerService from '../services/customerService'
import bookingService from '../services/bookingService'
import locationService, { type Location } from '../services/locationService'
import AddLocationForm, { type LocationFormData } from './booking/AddLocationForm'
import EntitySection, { type Child, type Pet, type EntityFormData } from './booking/EntitySection'
import { useLocationMap } from './booking/useLocationMap'
import './BookingModal.css'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  sitterName: string
  sitterId: number
  sitterType: 'pet' | 'baby'
  isLoggedIn: boolean
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  sitterName,
  sitterId,
  sitterType,
  isLoggedIn: propIsLoggedIn
}) => {
  // Authentication state
  const [actualIsLoggedIn, setActualIsLoggedIn] = useState(propIsLoggedIn)
  const [userType, setUserType] = useState<'customer' | 'sitter' | null>(null)
  
  // Data state
  const [children, setChildren] = useState<Child[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  // Form state
  const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  // Handle entity selection toggle
  const toggleEntitySelection = (entityId: number) => {
    setSelectedEntityIds(prev => {
      if (prev.includes(entityId)) {
        return prev.filter(id => id !== entityId)
      } else {
        return [...prev, entityId]
      }
    })
  }

  // Handle start time change and reset end time if needed
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime)
    
    // If end time is now invalid (less than 1 hour after new start), reset it
    if (newStartTime && endTime) {
      const [startHour] = newStartTime.split(':').map(Number)
      const [endHour] = endTime.split(':').map(Number)
      if (endHour <= startHour) {
        setEndTime('')
      }
    }
  }
  
  // Add entity state
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSavingEntity, setIsSavingEntity] = useState(false)
  // Dynamic child/pet form payload; relevant fields vary by sitterType before submit.
  const [entityFormData, setEntityFormData] = useState<EntityFormData>({})
  
  // Add location state
  const [showAddLocationForm, setShowAddLocationForm] = useState(false)
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [locationFormData, setLocationFormData] = useState<LocationFormData>({
    location_name: '',
    address_name: '',
    street_name: '',
    building_name: '',
    floor: '',
    area: '',
    city: '',
    postal_code: '',
    latitude: 33.8547, // Beirut
    longitude: 35.8623,
    is_default: false
  })
  // Google Maps wiring for the add-location form lives in a dedicated hook.
  const { mapRef, searchInputRef } = useLocationMap(showAddLocationForm, setLocationFormData)

  // UI state
  const [isMounted, setIsMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check Firebase auth state and user type
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setActualIsLoggedIn(!!user)
      
      if (user) {
        const profileResult = await authService.getProfile()
        if (profileResult.success && profileResult.data) {
          setUserType(profileResult.data.user.userType)
          
          // Load children/pets if customer
          if (profileResult.data.user.userType === 'customer') {
            await loadCustomerData()
          }
        }
      } else {
        setUserType(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // Load customer's children, pets, and locations
  const loadCustomerData = async () => {
    setIsLoadingData(true)
    
    try {
      const [childrenResponse, petsResponse, locationsResponse] = await Promise.all([
        customerService.getChildren(),
        customerService.getPets(),
        locationService.getLocations()
      ])
      
      if (childrenResponse.success && childrenResponse.data) {
        setChildren(childrenResponse.data)
      }
      
      if (petsResponse.success && petsResponse.data) {
        setPets(petsResponse.data)
      }
      
      if (locationsResponse.success && locationsResponse.data) {
        setLocations(locationsResponse.data)
        
        // Auto-select default location if exists
        const defaultLocation = locationsResponse.data.find((loc: Location) => loc.is_default)
        if (defaultLocation) {
          setSelectedLocationId(String(defaultLocation.id))
        }
      }
    } catch (err) {
      logger.error('Error loading customer data:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  // Handle modal mount/unmount
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
      
      // Reset form when opening
      setSelectedEntityIds([])
      setSelectedLocationId('')
      setBookingDate('')
      setStartTime('')
      setEndTime('')
      setNotes('')
      setError(null)
      setShowAddForm(false)
      setShowAddLocationForm(false)
    } else {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('modal-open')
      const timer = setTimeout(() => setIsMounted(false), 100)
      return () => clearTimeout(timer)
    }
    
    return () => {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('modal-open')
    }
  }, [isOpen])

  // Initialize add entity form
  const handleAddEntityClick = () => {
    setShowAddForm(true)
    setError(null)
    
    if (sitterType === 'pet') {
      setEntityFormData({
        name: '',
        age: '',
        type: '',
        breed: '',
        personality: '',
        careInstructions: '',
        specialNeeds: ''
      })
    } else {
      setEntityFormData({
        name: '',
        age: '',
        hobbies: '',
        schoolType: '',
        specialNeeds: ''
      })
    }
  }

  // Save new entity
  const handleSaveEntity = async () => {
    setError(null)
    
    // Validation
    if (sitterType === 'pet') {
      if (!entityFormData.name || !entityFormData.type) {
        setError('Pet name and type are required')
        return
      }
    } else {
      if (!entityFormData.name || !entityFormData.age || !entityFormData.schoolType) {
        setError('Child name, age, and school schedule are required')
        return
      }
    }
    
    setIsSavingEntity(true)
    
    try {
      let response
      if (sitterType === 'pet') {
        response = await customerService.addPet({
          name: entityFormData.name ?? '',
          age: entityFormData.age,
          type: entityFormData.type ?? '',
          breed: entityFormData.breed,
          personality: entityFormData.personality,
          careInstructions: entityFormData.careInstructions,
          specialNeeds: entityFormData.specialNeeds,
        })
      } else {
        response = await customerService.addChild({
          name: entityFormData.name ?? '',
          age: entityFormData.age ?? '',
          hobbies: entityFormData.hobbies,
          schoolType: entityFormData.schoolType ?? '',
          specialNeeds: entityFormData.specialNeeds,
        })
      }
      
      if (response.success) {
        // Reload data
        await loadCustomerData()
        setShowAddForm(false)
        setEntityFormData({})
        
        // Auto-select the newly added entity. customerService unwraps the API
        // envelope so response.data IS the created pet/child row (with its id).
        const newId = response.data?.id
        if (newId) {
          setSelectedEntityIds(prev => [...prev, newId])
        }
      } else {
        setError(response.error || `Failed to add ${sitterType === 'pet' ? 'pet' : 'child'}`)
      }
    } catch {
      setError(`Error adding ${sitterType === 'pet' ? 'pet' : 'child'}`)
    } finally {
      setIsSavingEntity(false)
    }
  }

  // Submit booking
  const handleSaveLocation = async () => {
    if (!locationFormData.location_name || !locationFormData.area || !locationFormData.city) {
      setError('Location name, area, and city are required')
      return
    }

    setIsSavingLocation(true)
    setError(null)

    // Auto-generate address_line
    const addressParts = [
      locationFormData.street_name,
      locationFormData.building_name,
      locationFormData.floor ? `Floor ${locationFormData.floor}` : '',
      locationFormData.area,
      locationFormData.city
    ].filter(part => part && part.trim()).join(', ')

    const dataToSave = {
      ...locationFormData,
      address_line: addressParts || `${locationFormData.area}, ${locationFormData.city}`
    }

    const response = await locationService.addLocation(dataToSave)

    if (response.success && response.data && response.data.location) {
      // Reload locations
      const locationsResponse = await locationService.getLocations()
      if (locationsResponse.success && locationsResponse.data) {
        setLocations(locationsResponse.data)
        setSelectedLocationId(String(response.data.location.id))
      }

      // Reset form and close
      setLocationFormData({
        location_name: '',
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
      setShowAddLocationForm(false)
    } else {
      setError(response.error || 'Failed to add location')
    }

    setIsSavingLocation(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (selectedEntityIds.length === 0) {
      setError(`Please select at least one ${sitterType === 'pet' ? 'pet' : 'child'}`)
      return
    }
    
    if (!selectedLocationId) {
      setError('Please select or add a location')
      return
    }
    
    if (!bookingDate || !startTime || !endTime) {
      setError('Please fill in all required fields')
      return
    }
    
    // Validate end time is at least 1 hour after start time
    if (startTime && endTime) {
      const [startHour] = startTime.split(':').map(Number)
      const [endHour] = endTime.split(':').map(Number)
      if (endHour <= startHour) {
        setError('End time must be at least 1 hour after start time')
        return
      }
    }
    
    setIsSubmitting(true)
    
    try {
      // Combine date and time to create datetime strings
      const bookingFrom = `${bookingDate}T${startTime}:00`
      const bookingTo = `${bookingDate}T${endTime}:00`
      
      const bookingData = {
        sitterId: sitterId,
        locationId: parseInt(selectedLocationId),
        bookingFrom: bookingFrom,
        bookingTo: bookingTo,
        paymentMethod: null,  // Will be set later
        priceUsd: 50.00,  // Placeholder - calculate based on hours
        discount: 0,
        additionalNotes: notes || null,
        typeOfBooking: (sitterType === 'pet' ? 'PET' : 'CHILD') as 'PET' | 'CHILD',
        ...(sitterType === 'pet' 
          ? { petIds: selectedEntityIds }
          : { childrenIds: selectedEntityIds }
        )
      }
      
      logger.debug('Submitting booking:', bookingData)
      
      // Call booking API endpoint
      const response = await bookingService.createBooking(bookingData)
      
      if (response.success) {
        // Show success message
        setSuccessMessage('Booking request submitted successfully!')
        setError(null)
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose()
          setSuccessMessage(null)
        }, 2000)
      } else {
        setError(response.error || 'Failed to submit booking. Please try again.')
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit booking. Please try again.')
      logger.error('Booking error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen && !isMounted) return null

  const modalContent = (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-header">
          <h2>Book a Session with {sitterName}</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="booking-modal-content">
          {!actualIsLoggedIn ? (
            // Login Section
            <div className="login-section">
              <div className="login-icon">
                <i className="fas fa-user-lock"></i>
              </div>
              <h3>Sign in to Book a Session</h3>
              <p>You need to be logged in to book a session with our sitters.</p>
              <div className="login-buttons">
                <Link to="/customer-login" className="btn-login">
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </Link>
                <Link to="/customer-signup" className="btn-signup">
                  <i className="fas fa-user-plus"></i>
                  Sign Up
                </Link>
              </div>
            </div>
          ) : userType === 'sitter' ? (
            // Sitter Warning Section
            <div className="login-section">
              <div className="login-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3>You need to be signed in as a Customer to book a session!</h3>
              <p>Sitters cannot book sessions. Please sign in with a customer account or create one.</p>
              <div className="login-buttons">
                <Link to="/customer-login" className="btn-login">
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In as Customer
                </Link>
                <Link to="/customer-signup" className="btn-signup">
                  <i className="fas fa-user-plus"></i>
                  Sign Up as Customer
                </Link>
              </div>
            </div>
          ) : (
            // Booking Form Section
            <form onSubmit={handleSubmit} className="booking-form">
              {error && (
                <div className="form-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="form-success">
                  <i className="fas fa-check-circle"></i>
                  {successMessage}
                </div>
              )}
              
              {/* Entity Selection or Add Form */}
              <EntitySection
                sitterType={sitterType}
                childItems={children}
                petItems={pets}
                selectedEntityIds={selectedEntityIds}
                onToggleSelect={toggleEntitySelection}
                isLoadingData={isLoadingData}
                showAddForm={showAddForm}
                onAddClick={handleAddEntityClick}
                onCancelAdd={() => setShowAddForm(false)}
                entityFormData={entityFormData}
                setEntityFormData={setEntityFormData}
                isSavingEntity={isSavingEntity}
                onSaveEntity={handleSaveEntity}
              />

              {/* Add Location Form */}
              {showAddLocationForm && (
                <AddLocationForm
                  locationFormData={locationFormData}
                  setLocationFormData={setLocationFormData}
                  mapRef={mapRef}
                  searchInputRef={searchInputRef}
                  isSavingLocation={isSavingLocation}
                  onClose={() => setShowAddLocationForm(false)}
                  onSave={handleSaveLocation}
                />
              )}

              {!showAddForm && !showAddLocationForm && (
                <>
                  {/* Location Selection */}
                  <div className="form-group">
                    <label htmlFor="location-select">
                      <i className="fas fa-map-marker-alt"></i>
                      Select Location
                    </label>
                    <select
                      id="location-select"
                      value={selectedLocationId}
                      onChange={(e) => {
                        if (e.target.value === 'add-new') {
                          setShowAddLocationForm(true)
                        } else {
                          setSelectedLocationId(e.target.value)
                        }
                      }}
                      required
                      disabled={isLoadingData}
                    >
                      <option value="">Choose location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.location_name} - {location.area}, {location.city}
                          {location.is_default ? ' (Default)' : ''}
                        </option>
                      ))}
                      <option value="add-new" className="add-new-option">
                        ➕ Add a Location
                      </option>
                    </select>
                  </div>

                  {/* Date Selection */}
                  <div className="form-group">
                    <label htmlFor="booking-date">
                      <i className="fas fa-calendar"></i>
                      Booking Date
                    </label>
                    <input
                      type="date"
                      id="booking-date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  {/* Time Selection */}
              <div className="time-selection">
                <div className="form-group">
                  <label htmlFor="start-time">
                    <i className="fas fa-clock"></i>
                    Start Time
                  </label>
                  <select
                    id="start-time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    required
                  >
                    <option value="">Select start time</option>
                        {Array.from({ length: 14 }, (_, i) => i + 7).map(hour => {
                          const time = `${hour.toString().padStart(2, '0')}:00`
                          const display = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
                          return <option key={time} value={time}>{display}</option>
                        })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="end-time">
                    <i className="fas fa-clock"></i>
                    End Time
                  </label>
                  <select
                    id="end-time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    disabled={!startTime}
                  >
                    <option value="">
                      {!startTime ? 'Select start time first' : 'Select end time'}
                    </option>
                        {startTime && Array.from({ length: 15 }, (_, i) => i + 7).map(hour => {
                          const time = `${hour.toString().padStart(2, '0')}:00`
                          const display = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
                          const [startHour] = startTime.split(':').map(Number)
                          
                          // Only show times that are at least 1 hour after start time
                          if (hour <= startHour) {
                            return null
                          }
                          
                          return <option key={time} value={time}>{display}</option>
                        })}
                  </select>
                </div>
              </div>

                  {/* Additional Notes */}
              <div className="form-group">
                <label htmlFor="notes">
                  <i className="fas fa-sticky-note"></i>
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Any special instructions for ${sitterName}?`}
                  rows={3}
                />
              </div>

                  {/* Form Actions */}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Submitting...
                        </>
                      ) : (
                        <>
                  <i className="fas fa-calendar-check"></i>
                  Book Session
                        </>
                      )}
                </button>
              </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default BookingModal
