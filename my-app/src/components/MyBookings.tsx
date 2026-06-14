import React, { useState, useEffect } from 'react'
import { Baby, Calendar, CalendarX, ChevronDown, ChevronUp, CircleAlert, CircleCheck, CirclePlus, Clock, DollarSign, History, MapPin, PawPrint, Stethoscope } from 'lucide-react'
import { logger } from '../utils/logger';
import { useNavigate } from 'react-router-dom'
import bookingService from '../services/bookingService'
import './ManageEntities.css'

interface Pet {
  id: number
  name: string
  type: string
  breed: string
  age: number
}

interface Child {
  id: number
  fullName: string
  age: number
  gender: string
}

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
  pets?: Pet[]
  children?: Child[]
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
  const [upcomingExpanded, setUpcomingExpanded] = useState(true)
  const [finishedExpanded, setFinishedExpanded] = useState(false)

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
        logger.debug('Pet bookings response:', petResponse.data)
        setPetBookings(petResponse.data)
      }

      if (childResponse.success && childResponse.data) {
        logger.debug('Child bookings response:', childResponse.data)
        setChildBookings(childResponse.data)
      }
    } catch (err) {
      setError('Failed to load bookings')
      logger.error('Error loading bookings:', err)
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

  const renderBookingCard = (booking: Booking) => {
    const pets = booking.pets || []
    const children = booking.children || []

    return (
      <div key={booking.id} className="child-item">
        <div className="item-header" style={{ justifyContent: 'flex-end' }}>
          <span className={`status-badge ${booking.status.toLowerCase()}`}>
            {booking.status}
          </span>
        </div>

        <div className="info-grid">
          {/* Booking Date & Time */}
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Calendar size={16} />
              <span style={{ fontWeight: 600 }}>Booking Date & Time</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '30px' }}>
              <span><strong>From:</strong> {formatDateTime(booking.bookingFrom)}</span>
              <span><strong>To:</strong> {formatDateTime(booking.bookingTo)}</span>
            </div>
          </div>

          {/* Sitter Info */}
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Stethoscope size={16} />
              <span style={{ fontWeight: 600 }}>Sitter</span>
            </label>
            <div style={{ paddingLeft: '30px' }}>
              {booking.sitter.name}, {booking.sitter.age} years old
            </div>
          </div>

          {/* Pets Info */}
          {pets.length > 0 && (
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <PawPrint size={16} />
                <span style={{ fontWeight: 600 }}>{pets.length > 1 ? 'Pets' : 'Pet'}</span>
              </label>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '45px', 
                listStyleType: 'disc',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {pets.map(pet => (
                  <li key={pet.id} style={{ color: 'var(--ink)' }}>
                    <strong>{pet.name}</strong> - {pet.type}, {pet.breed}, {pet.age} years old
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Children Info */}
          {children.length > 0 && (
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Baby size={16} />
                <span style={{ fontWeight: 600 }}>{children.length > 1 ? 'Children' : 'Child'}</span>
              </label>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '45px', 
                listStyleType: 'disc',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {children.map(child => (
                  <li key={child.id} style={{ color: 'var(--ink)' }}>
                    <strong>{child.fullName}</strong> - {child.gender}, {child.age} years old
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Location */}
          {booking.location && (
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <MapPin size={16} />
                <span style={{ fontWeight: 600 }}>Location</span>
              </label>
              <div style={{ paddingLeft: '30px' }}>
                {booking.location.name} - {booking.location.addressLine}, {booking.location.area}, {booking.location.city}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <DollarSign size={16} />
              <span style={{ fontWeight: 600 }}>Price</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '30px' }}>
              {booking.discount > 0 ? (
                <>
                  <span style={{ 
                    textDecoration: 'line-through', 
                    color: 'var(--ink-faint)',
                    fontSize: '0.9rem'
                  }}>
                    ${booking.priceUsd.toFixed(2)}
                  </span>
                  <span style={{
                    color: 'var(--olive)',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}>
                    ${calculateFinalPrice(booking.priceUsd, booking.discount).toFixed(2)}
                  </span>
                  <span style={{ 
                    backgroundColor: 'var(--error)',
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
  }

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
          <CircleAlert size={16} />
          {error}
        </div>
      )}

      {/* Tabs for Pet/Child Bookings - Centered */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid var(--line)'
      }}>
        <button
          onClick={() => setActiveTab('pet')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'pet' ? 'var(--terracotta)' : 'transparent',
            color: activeTab === 'pet' ? 'white' : 'var(--ink-faint)',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.3s ease'
          }}
        >
          <PawPrint size={16} />
          Pet Bookings ({petBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('child')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'child' ? 'var(--terracotta)' : 'transparent',
            color: activeTab === 'child' ? 'white' : 'var(--ink-faint)',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.3s ease'
          }}
        >
          <Baby size={16} />
          Child Bookings ({childBookings.length})
        </button>
      </div>

      <div className="content-card">
        {/* Create Booking Button */}
        <button 
          className="add-section-btn"
          onClick={() => navigate(`/sitters#${activeTab === 'pet' ? 'pet' : 'baby'}-sitters`)}
        >
          <CirclePlus size={16} />
          Create New Booking
        </button>

        {/* Upcoming Bookings Dropdown */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setUpcomingExpanded(!upcomingExpanded)}
            style={{
              width: '100%',
              padding: '15px 20px',
              border: '2px solid var(--terracotta)',
              background: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--ink)',
              transition: 'all 0.3s ease',
              marginBottom: upcomingExpanded ? '15px' : '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--paper-deep)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
            }}
          >
            <span>
              <Clock size={16} />
              Upcoming Bookings ({upcomingBookings.length})
            </span>
            {(upcomingExpanded) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {upcomingExpanded && (
            <div className="children-list">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map(renderBookingCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-faint)' }}>
                  <CalendarX size={16} />
                  <p>No upcoming bookings</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finished Bookings Dropdown */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setFinishedExpanded(!finishedExpanded)}
            style={{
              width: '100%',
              padding: '15px 20px',
              border: '2px solid var(--olive)',
              background: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--ink)',
              transition: 'all 0.3s ease',
              marginBottom: finishedExpanded ? '15px' : '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--paper-deep)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
            }}
          >
            <span>
              <CircleCheck size={16} />
              Finished Bookings ({completedBookings.length})
            </span>
            {(finishedExpanded) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {finishedExpanded && (
            <div className="children-list">
              {completedBookings.length > 0 ? (
                completedBookings.map(renderBookingCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-faint)' }}>
                  <History size={16} />
                  <p>No finished bookings</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* No Bookings Message */}
        {currentBookings.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--ink-faint)'
          }}>
            {activeTab === 'pet' ? <PawPrint size={48} /> : <Baby size={48} />}
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

