import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './BookingModal.css'

interface Child {
  id: string
  name: string
  age: string
}

interface Pet {
  id: string
  name: string
  type: string
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  sitterName: string
  sitterType: 'pet' | 'baby'
  isLoggedIn: boolean
  userChildren?: Child[]
  userPets?: Pet[]
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  sitterName,
  sitterType,
  isLoggedIn,
  userChildren = [],
  userPets = []
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [duration, setDuration] = useState('2')
  const [notes, setNotes] = useState('')

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement booking submission logic
    console.log('Booking submitted:', {
      sitterName,
      sitterType,
      selectedItems,
      selectedDate,
      selectedTime,
      duration,
      notes
    })
    onClose()
  }

  if (!isOpen) return null

  const availableItems = sitterType === 'baby' ? userChildren : userPets
  const itemLabel = sitterType === 'baby' ? 'children' : 'pets'

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-header">
          <h2>Book a Session with {sitterName}</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="booking-modal-content">
          {!isLoggedIn ? (
            <div className="login-prompt">
              <div className="login-prompt-icon">
                <i className="fas fa-user-lock"></i>
              </div>
              <h3>Sign in to Book a Session</h3>
              <p>You need to be logged in to book a session with our sitters.</p>
              <div className="login-buttons">
                <Link to="/portal" className="btn-login">
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </Link>
                <Link to="/portal" className="btn-signup">
                  <i className="fas fa-user-plus"></i>
                  Sign Up
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="booking-form">
              <div className="form-section">
                <h3>
                  <i className={`fas fa-${sitterType === 'baby' ? 'baby' : 'paw'}`}></i>
                  Select Your {sitterType === 'baby' ? 'Children' : 'Pets'}
                </h3>
                {availableItems.length === 0 ? (
                  <div className="no-items">
                    <p>You haven't registered any {itemLabel} yet.</p>
                    <Link to={sitterType === 'baby' ? '/customer-signup' : '/customer-signup'} className="btn-add">
                      Add {sitterType === 'baby' ? 'Children' : 'Pets'}
                    </Link>
                  </div>
                ) : (
                  <div className="items-selection">
                    {availableItems.map((item) => (
                      <div key={item.id} className="item-option">
                        <input
                          type="checkbox"
                          id={item.id}
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                        />
                        <label htmlFor={item.id}>
                          <span className="item-name">{item.name}</span>
                          <span className="item-details">
                            {sitterType === 'baby' ? `Age: ${(item as Child).age}` : `Type: ${(item as Pet).type}`}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-calendar-alt"></i>
                  Select Date & Time
                </h3>
                <div className="datetime-selection">
                  <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <input
                      type="date"
                      id="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="time">Time</label>
                    <select
                      id="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                    >
                      <option value="">Select time</option>
                      <option value="08:00">8:00 AM</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="18:00">6:00 PM</option>
                      <option value="19:00">7:00 PM</option>
                      <option value="20:00">8:00 PM</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="duration">Duration (hours)</label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                    >
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="3">3 hours</option>
                      <option value="4">4 hours</option>
                      <option value="6">6 hours</option>
                      <option value="8">8 hours</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  <i className="fas fa-sticky-note"></i>
                  Additional Notes
                </h3>
                <div className="form-group">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`Any special instructions for ${sitterName}?`}
                    rows={4}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={selectedItems.length === 0}>
                  <i className="fas fa-calendar-check"></i>
                  Book Session
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingModal
