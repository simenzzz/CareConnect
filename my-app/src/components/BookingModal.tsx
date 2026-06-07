import React, { useState, useEffect, useRef } from 'react'
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
import './BookingModal.css'

interface Child {
  id: number
  name: string
  age: number
  hobbies?: string
  school_type: string
  special_needs?: string
}

interface Pet {
  id: number
  name: string
  age: number | null
  type: string
  breed?: string
  personality?: string
  care_instructions?: string
  special_needs?: string
}

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
  // Dynamic child/pet form payload; shape varies by sitterType before submit.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entityFormData, setEntityFormData] = useState<any>({})
  
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
  const mapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  
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

  // Initialize Google Maps when location form is shown
  useEffect(() => {
    if (showAddLocationForm && mapRef.current && !mapInstanceRef.current) {
      setTimeout(() => {
        initializeLocationMap()
      }, 100)
    }
    
    // Only cleanup when form is actually closed
    if (!showAddLocationForm) {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
      autocompleteRef.current = null
    }
  }, [showAddLocationForm])

  const initializeLocationMap = () => {
    if (!mapRef.current || typeof google === 'undefined' || !google.maps) {
      logger.debug('Google Maps not ready')
      return
    }

    logger.debug('Initializing location map and search...')

    const LEBANON_CENTER = { lat: 33.8547, lng: 35.8623 }

    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          logger.debug('Got user location:', userLocation)
          setLocationFormData(prev => ({
            ...prev,
            latitude: userLocation.lat,
            longitude: userLocation.lng
          }))
          createLocationMap(userLocation)
        },
        (error) => {
          logger.debug('Geolocation error:', error)
          createLocationMap(LEBANON_CENTER)
        }
      )
    } else {
      logger.debug('Geolocation not supported')
      createLocationMap(LEBANON_CENTER)
    }
  }

  const createLocationMap = (center: { lat: number; lng: number }) => {
    if (!mapRef.current) return

    logger.debug('Creating map at:', center)

    const map = new google.maps.Map(mapRef.current, {
      center: center,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false
    })

    mapInstanceRef.current = map

    const marker = new google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      title: 'Selected Location'
    })

    markerRef.current = marker

    // Click event on map
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        marker.setPosition({ lat, lng })
        setLocationFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
        reverseGeocodeLocation(lat, lng)
      }
    })

    // Drag event on marker
    marker.addListener('dragend', () => {
      const position = marker.getPosition()
      if (position) {
        const lat = position.lat()
        const lng = position.lng()
        setLocationFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
        reverseGeocodeLocation(lat, lng)
      }
    })

    // Initialize search autocomplete
    if (searchInputRef.current && !autocompleteRef.current) {
      logger.debug('Initializing autocomplete on search input')
      
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'lb' },
        fields: ['address_components', 'geometry', 'formatted_address', 'name']
      })

      autocomplete.bindTo('bounds', map)
      autocompleteRef.current = autocomplete

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()

        if (!place.geometry || !place.geometry.location) {
          logger.debug('No geometry found for place')
          return
        }

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        logger.debug('Place selected:', place.name, lat, lng)

        marker.setPosition({ lat, lng })
        map.setCenter({ lat, lng })
        map.setZoom(17)

        setLocationFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

        if (place.address_components) {
          let street = ''
          let area = ''
          let city = ''

          place.address_components.forEach(component => {
            if (component.types.includes('route')) {
              street = component.long_name
            }
            if (component.types.includes('administrative_area_level_2')) {
              area = component.long_name
            }
            if (component.types.includes('locality')) {
              city = component.long_name
            }
          })

          setLocationFormData(prev => ({
            ...prev,
            street_name: street || prev.street_name,
            area: area || prev.area,
            city: city || prev.city
          }))
        }
      })
    }
  }

  const reverseGeocodeLocation = (lat: number, lng: number) => {
    if (typeof google === 'undefined' || !google.maps) return

    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const addressComponents = results[0].address_components
        let street = ''
        let area = ''
        let city = ''

        addressComponents.forEach(component => {
          if (component.types.includes('route')) {
            street = component.long_name
          }
          if (component.types.includes('administrative_area_level_2')) {
            area = component.long_name
          }
          if (component.types.includes('locality')) {
            city = component.long_name
          }
        })

        setLocationFormData(prev => ({
          ...prev,
          street_name: street || prev.street_name,
          area: area || prev.area,
          city: city || prev.city
        }))
      }
    })
  }

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
        response = await customerService.addPet(entityFormData)
      } else {
        response = await customerService.addChild(entityFormData)
      }
      
      if (response.success) {
        // Reload data
        await loadCustomerData()
        setShowAddForm(false)
        setEntityFormData({})
        
        // Auto-select the newly added entity
        if (response.data) {
          const newId = sitterType === 'pet' ? response.data.pet?.id : response.data.child?.id
          if (newId) {
            setSelectedEntityIds(prev => [...prev, newId])
          }
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

  const availableItems = sitterType === 'baby' ? children : pets
  const entityLabel = sitterType === 'baby' ? 'Child' : 'Pet'

  // Format display text for dropdown
  const getEntityDisplayText = (item: Child | Pet) => {
    if (sitterType === 'pet') {
      const pet = item as Pet
      return `${pet.name}${pet.breed ? `, ${pet.breed}` : ''}${pet.age !== null ? `, ${pet.age} years` : ''}`
    } else {
      const child = item as Child
      return `${child.name}, ${child.age} years`
    }
  }

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
              {!showAddForm ? (
              <div className="form-group">
                <label>
                  <i className={`fas fa-${sitterType === 'baby' ? 'baby' : 'paw'}`}></i>
                  Select Your {entityLabel}(s) *
                </label>
                <div style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#f9f9f9'
                }}>
                  {availableItems.length > 0 ? (
                    availableItems.map((item) => (
                      <label 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background 0.2s',
                          backgroundColor: selectedEntityIds.includes(item.id) ? '#e8f4f8' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedEntityIds.includes(item.id)) {
                            e.currentTarget.style.backgroundColor = '#f0f0f0'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedEntityIds.includes(item.id)) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEntityIds.includes(item.id)}
                          onChange={() => toggleEntitySelection(item.id)}
                          style={{ marginRight: '10px', cursor: 'pointer', width: '18px', height: '18px' }}
                          disabled={isLoadingData}
                        />
                        <span style={{ flex: 1 }}>
                          {getEntityDisplayText(item)}
                        </span>
                        {selectedEntityIds.includes(item.id) && (
                          <i className="fas fa-check" style={{ color: '#667eea', marginLeft: '8px' }}></i>
                        )}
                      </label>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>
                      No {entityLabel.toLowerCase()}s available
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddEntityClick}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    border: '2px dashed #667eea',
                    background: 'white',
                    color: '#667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  <i className="fas fa-plus-circle"></i> Add a {entityLabel}
                </button>
              </div>
              ) : (
                <div className="add-entity-form">
                  <div className="add-entity-header">
                    <h3>Add {entityLabel}</h3>
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                      className="btn-close-add"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  
                  {sitterType === 'pet' ? (
                    // Pet Form Fields
                    <>
                      <div className="form-group">
                        <label>
                          <i className="fas fa-tag"></i>
                          Pet Name *
                        </label>
                        <input
                          type="text"
                          value={entityFormData.name || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, name: e.target.value})}
                          placeholder="Enter pet name"
                          required
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>
                            <i className="fas fa-paw"></i>
                            Pet Type *
                          </label>
                          <div className="pet-type-grid">
                            {['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Fish', 'Other'].map(type => (
                              <button
                                key={type}
                                type="button"
                                className={`pet-type-option ${entityFormData.type === type ? 'selected' : ''}`}
                                onClick={() => setEntityFormData({...entityFormData, type})}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>
                            <i className="fas fa-dog"></i>
                            Breed
                          </label>
                          <input
                            type="text"
                            value={entityFormData.breed || ''}
                            onChange={(e) => setEntityFormData({...entityFormData, breed: e.target.value})}
                            placeholder="e.g., Golden Retriever"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>
                            <i className="fas fa-calendar"></i>
                            Age
                          </label>
                          <input
                            type="number"
                            value={entityFormData.age || ''}
                            onChange={(e) => setEntityFormData({...entityFormData, age: e.target.value})}
                            placeholder="Age in years"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-smile"></i>
                          Personality
                        </label>
                        <textarea
                          value={entityFormData.personality || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, personality: e.target.value})}
                          placeholder="Describe your pet's personality..."
                          rows={2}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-clipboard-list"></i>
                          Care Instructions
                        </label>
                        <textarea
                          value={entityFormData.careInstructions || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, careInstructions: e.target.value})}
                          placeholder="Special care instructions..."
                          rows={2}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-medkit"></i>
                          Special Needs / Medical Conditions
                        </label>
                        <textarea
                          value={entityFormData.specialNeeds || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, specialNeeds: e.target.value})}
                          placeholder="Any medical conditions or special needs..."
                          rows={2}
                        />
                      </div>
                    </>
                  ) : (
                    // Child Form Fields
                    <>
                      <div className="form-group">
                        <label>
                          <i className="fas fa-user"></i>
                          Child's Name *
                        </label>
                        <input
                          type="text"
                          value={entityFormData.name || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, name: e.target.value})}
                          placeholder="Enter child's name"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-birthday-cake"></i>
                          Age *
                        </label>
                        <input
                          type="number"
                          value={entityFormData.age || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, age: e.target.value})}
                          placeholder="Age in years"
                          min="0"
                          max="18"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-heart"></i>
                          Hobbies & Interests
                        </label>
                        <textarea
                          value={entityFormData.hobbies || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, hobbies: e.target.value})}
                          placeholder="What does your child enjoy?"
                          rows={2}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-school"></i>
                          School Schedule *
                        </label>
                        <div className="checkbox-group">
                          {['Full Time', 'Part Time', 'Not in School'].map(schedule => (
                            <div 
                              key={schedule}
                              className={`checkbox-container ${entityFormData.schoolType === schedule ? 'selected' : ''}`}
                              onClick={() => setEntityFormData({...entityFormData, schoolType: schedule})}
                            >
                              <div className="checkbox-content">
                                <div className="checkmark">
                                  {entityFormData.schoolType === schedule && <i className="fas fa-check"></i>}
                                </div>
                                <span>{schedule}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>
                          <i className="fas fa-medkit"></i>
                          Special Needs / Medical Conditions
                        </label>
                        <textarea
                          value={entityFormData.specialNeeds || ''}
                          onChange={(e) => setEntityFormData({...entityFormData, specialNeeds: e.target.value})}
                          placeholder="Any medical conditions or special needs..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="add-entity-actions">
                    <button 
                      type="button" 
                      className="btn-cancel-add"
                      onClick={() => setShowAddForm(false)}
                      disabled={isSavingEntity}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn-save-add"
                      onClick={handleSaveEntity}
                      disabled={isSavingEntity}
                    >
                      {isSavingEntity ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check"></i>
                          Save {entityLabel}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

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
