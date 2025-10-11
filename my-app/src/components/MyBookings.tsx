import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import bookingService from '../services/bookingService'
import './ManageEntities.css'

interface Booking {
  id: number
  sitterId: number
  customerId: number
  locationId: number
  bookingFrom: string
  bookingTo: string
  paymentMethod: string | null
  priceUsd: number
  discount: number
  status: string
  typeOfBooking: 'PET' | 'CHILD'
  createdAt: string
  updatedAt: string
  sitter: {
    name: string
    age: number
  }
  pet?: {
    id: number
    name: string
    type: string
    breed: string
    age: number
  }
  child?: {
    id: number
    name: string
    age: number
    gender: string
  }
  location: {
    name: string
    addressLine: string
    area: string
    city: string
  }
}

const MyBookings: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'pet' | 'child'>('pet')
  const [petBookings, setPetBookings] = useState<Booking[]>([])
  const [childBookings, setChildBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [petResponse, childResponse] = await Promise.all([
        bookingService.getPetBookings(),
        bookingService.getChildBookings()
      ])

      if (petResponse.success && petResponse.data) {
        setPetBookings(petResponse.data)
      }

      if (childResponse.success && childResponse.data) {
        setChildBookings(childResponse.data)
      }
    } catch (err) {
      setError('Failed to load bookings')
      console.error('Error loading bookings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isUpcoming = (booking: Booking) => {
    return new Date(booking.bookingFrom) > new Date()
  }

  const calculateFinalPrice = (price: number, discount: number) => {
    return price - (price * discount / 100)
  }

  const currentBookings = activeTab === 'pet' ? petBookings : childBookings
  const upcomingBookings = currentBookings.filter(isUpcoming)
  const completedBookings = currentBookings.filter(b => !isUpcoming(b))

  const renderBookingCard = (booking: Booking) => (
    <div key={booking.id} className="child-item">
      <div className="item-header">
        <h3 className="section-card-title">
          <i className={`fas ${activeTab === 'pet' ? 'fa-paw' : 'fa-baby'}`}></i>
          Booking #{booking.id}
        </h3>
        <span className={`status-badge ${booking.status.toLowerCase()}`}>
          {booking.status}
        </span>
      </div>

      <div className="info-grid">
        {/* Booking Date & Time */}
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <label>
            <i className="fas fa-calendar-alt"></i>
            Booking Date & Time
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span><strong>From:</strong> {formatDateTime(booking.bookingFrom)}</span>
            <span><strong>To:</strong> {formatDateTime(booking.bookingTo)}</span>
          </div>
        </div>

        {/* Sitter Info */}
        <div className="info-item">
          <label>
            <i className="fas fa-user-nurse"></i>
            Sitter
          </label>
          <span>{booking.sitter.name}, {booking.sitter.age} years old</span>
        </div>

        {/* Pet or Child Info */}
        {booking.pet && (
          <div className="info-item">
            <label>
              <i className="fas fa-paw"></i>
              Pet
            </label>
            <span>{booking.pet.name}, {booking.pet.breed}, {booking.pet.age} years old</span>
          </div>
        )}

        {booking.child && (
          <div className="info-item">
            <label>
              <i className="fas fa-baby"></i>
              Child
            </label>
            <span>{booking.child.name}, {booking.child.gender}, {booking.child.age} years old</span>
          </div>
        )}

        {/* Location */}
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <label>
            <i className="fas fa-map-marker-alt"></i>
            Location
          </label>
          <span>{booking.location.name} - {booking.location.addressLine}, {booking.location.area}, {booking.location.city}</span>
        </div>

        {/* Price */}
        <div className="info-item">
          <label>
            <i className="fas fa-dollar-sign"></i>
            Price
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {booking.discount > 0 ? (
              <>
                <span style={{ 
                  textDecoration: 'line-through', 
                  color: '#95a5a6',
                  fontSize: '0.9rem'
                }}>
                  ${booking.priceUsd.toFixed(2)}
                </span>
                <span style={{ 
                  color: '#27ae60', 
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }}>
                  ${calculateFinalPrice(booking.priceUsd, booking.discount).toFixed(2)}
                </span>
                <span style={{ 
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  -{booking.discount}%
                </span>
              </>
            ) : (
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                ${booking.priceUsd.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="content-section">
        <div className="section-header">
          <h1>My Bookings</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h1>My Bookings</h1>
        <p>View and manage your booking history</p>
      </div>

      {error && (
        <div className="general-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Tabs for Pet/Child Bookings */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #ecf0f1'
      }}>
        <button
          onClick={() => setActiveTab('pet')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'pet' ? '#667eea' : 'transparent',
            color: activeTab === 'pet' ? 'white' : '#7f8c8d',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.3s ease'
          }}
        >
          <i className="fas fa-paw" style={{ marginRight: '8px' }}></i>
          Pet Bookings ({petBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('child')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'child' ? '#667eea' : 'transparent',
            color: activeTab === 'child' ? 'white' : '#7f8c8d',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.3s ease'
          }}
        >
          <i className="fas fa-baby" style={{ marginRight: '8px' }}></i>
          Child Bookings ({childBookings.length})
        </button>
      </div>

      <div className="content-card">
        {/* Create Booking Button */}
        <button 
          className="add-section-btn"
          onClick={() => navigate(`/sitters#${activeTab === 'pet' ? 'pet' : 'baby'}-sitters`)}
        >
          <i className="fas fa-plus-circle"></i>
          Create New Booking
        </button>

        {/* Upcoming Bookings Section */}
        {upcomingBookings.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ 
              fontSize: '1.3rem',
              color: '#2c3e50',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-clock" style={{ color: '#f39c12' }}></i>
              Upcoming Bookings
            </h2>
            <div className="children-list">
              {upcomingBookings.map(renderBookingCard)}
            </div>
          </div>
        )}

        {/* Completed Bookings Section */}
        {completedBookings.length > 0 && (
          <div>
            <h2 style={{ 
              fontSize: '1.3rem',
              color: '#2c3e50',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#27ae60' }}></i>
              Completed Bookings
            </h2>
            <div className="children-list">
              {completedBookings.map(renderBookingCard)}
            </div>
          </div>
        )}

        {/* No Bookings Message */}
        {currentBookings.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#7f8c8d'
          }}>
            <i className={`fas ${activeTab === 'pet' ? 'fa-paw' : 'fa-baby'}`} 
               style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
              No {activeTab === 'pet' ? 'pet' : 'child'} bookings yet
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              Click "Create New Booking" to book your first session
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyBookings

