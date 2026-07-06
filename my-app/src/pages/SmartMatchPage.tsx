import React, { useEffect, useMemo, useState } from 'react'
import { Baby, PawPrint, WandSparkles, LoaderCircle, ListChecks } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import BabySitterCard from '../components/BabySitterCard'
import PetSitterCard from '../components/PetSitterCard'
import customerService from '../services/customerService'
import locationService, { type Location } from '../services/locationService'
import sittersService, { type SitterSuggestion } from '../services/sittersService'
import type { Child, Pet } from '../components/booking/EntitySection'
import './SmartMatchPage.css'

type BookingKind = 'CHILD' | 'PET'

const toCard = (sitter: SitterSuggestion) => ({
  id: sitter.id,
  name: sitter.fullName,
  area: `${sitter.city}, ${sitter.area}`,
  experience: sitter.description || sitter.experience || 'Verified CareConnect sitter',
  rating: sitter.rating,
  specialties: sitter.skills,
  profileImageUrl: sitter.profileImageUrl,
  matchReasons: sitter.matchReasons,
  matchScore: sitter.matchScore,
  matchEventId: sitter.matchEventId,
})

const SmartMatchPage: React.FC = () => {
  const [bookingKind, setBookingKind] = useState<BookingKind>('CHILD')
  const [children, setChildren] = useState<Child[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [suggestions, setSuggestions] = useState<SitterSuggestion[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true)
      try {
        const [childrenResult, petsResult, locationsResult] = await Promise.all([
          customerService.getChildren(),
          customerService.getPets(),
          locationService.getLocations(),
        ])
        if (childrenResult.success && childrenResult.data) setChildren(childrenResult.data)
        if (petsResult.success && petsResult.data) setPets(petsResult.data)
        if (locationsResult.success && locationsResult.data) {
          setLocations(locationsResult.data)
          const defaultLocation = locationsResult.data.find((location: Location) => location.is_default)
          if (defaultLocation?.id) setSelectedLocationId(String(defaultLocation.id))
        }
      } catch {
        setError('Failed to load your details. Please refresh and try again.')
      } finally {
        setIsLoadingData(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    setSelectedEntityIds([])
    setSuggestions([])
    setError('')
  }, [bookingKind])

  useEffect(() => {
    setSuggestions([])
  }, [selectedEntityIds, selectedLocationId, bookingDate, startTime, endTime])

  const availableEntities = useMemo(
    () => (bookingKind === 'CHILD' ? children : pets),
    [bookingKind, children, pets],
  )

  const toggleEntity = (id: number) => {
    setSelectedEntityIds((current) =>
      current.includes(id) ? current.filter((entityId) => entityId !== id) : [...current, id],
    )
  }

  const handleStartTimeChange = (value: string) => {
    setStartTime(value)
    if (value && endTime && endTime <= value) setEndTime('')
  }

  const findMatches = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (selectedEntityIds.length === 0) {
      setError(`Select at least one ${bookingKind === 'CHILD' ? 'child' : 'pet'}.`)
      return
    }
    if (!selectedLocationId || !bookingDate || !startTime || !endTime) {
      setError('Choose a location, date, start time, and end time.')
      return
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    setIsSearching(true)
    const bookingFrom = `${bookingDate}T${startTime}:00`
    const bookingTo = `${bookingDate}T${endTime}:00`
    const result = await sittersService.fetchSuggestions({
      typeOfBooking: bookingKind,
      locationId: Number(selectedLocationId),
      bookingFrom,
      bookingTo,
      ...(bookingKind === 'CHILD' ? { childrenIds: selectedEntityIds } : { petIds: selectedEntityIds }),
      limit: 10,
    })
    if (result.success && result.data) {
      setSuggestions(result.data)
    } else {
      setError(result.error || 'Could not find matches.')
    }
    setIsSearching(false)
  }

  const initialBookingContext = (sitter: SitterSuggestion) => ({
    selectedEntityIds,
    selectedLocationId,
    bookingDate,
    startTime,
    endTime,
    matchEventId: sitter.matchEventId,
  })

  return (
    <div className="smart-match-page">
      <Header />
      <main className="smart-match-main">
        <section className="smart-match-header">
          <div className="smart-match-container">
            <h1>Find a sitter for this booking</h1>
            <p>Choose the care details first, then compare ranked sitters for that exact request.</p>
          </div>
        </section>

        <section className="smart-match-container smart-match-workspace">
          <form className="match-request-panel" onSubmit={findMatches}>
            {error && <div className="match-error">{error}</div>}

            <div className="segmented-control" aria-label="Care type">
              <button type="button" className={bookingKind === 'CHILD' ? 'active' : ''} onClick={() => setBookingKind('CHILD')}>
                <Baby size={18} />
                Child
              </button>
              <button type="button" className={bookingKind === 'PET' ? 'active' : ''} onClick={() => setBookingKind('PET')}>
                <PawPrint size={18} />
                Pet
              </button>
            </div>

            <div className="match-field">
              <label>{bookingKind === 'CHILD' ? 'Children' : 'Pets'}</label>
              <div className="entity-choice-list">
                {isLoadingData ? (
                  <p>Loading...</p>
                ) : availableEntities.length === 0 ? (
                  <p>No {bookingKind === 'CHILD' ? 'children' : 'pets'} found in your profile.</p>
                ) : (
                  availableEntities.map((entity) => (
                    <label key={entity.id} className={selectedEntityIds.includes(entity.id) ? 'selected' : ''}>
                      <input
                        type="checkbox"
                        checked={selectedEntityIds.includes(entity.id)}
                        onChange={() => toggleEntity(entity.id)}
                      />
                      <span>{entity.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="match-field">
              <label htmlFor="match-location">Location</label>
              <select id="match-location" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                <option value="">Choose location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.location_name} - {location.area}, {location.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="match-grid">
              <div className="match-field">
                <label htmlFor="match-date">Date</label>
                <input
                  id="match-date"
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>
              <div className="match-field">
                <label htmlFor="match-start">Start</label>
                <input id="match-start" type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)} />
              </div>
              <div className="match-field">
                <label htmlFor="match-end">End</label>
                <input id="match-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="find-matches-btn" disabled={isSearching}>
              {isSearching ? <LoaderCircle size={18} className="spin" /> : <WandSparkles size={18} />}
              {isSearching ? 'Finding matches...' : 'Find sitters'}
            </button>
          </form>

          <div className="match-results-panel">
            <div className="match-results-header">
              <h2>Ranked matches</h2>
              <span>{suggestions.length} found</span>
            </div>
            {suggestions.length === 0 ? (
              <div className="empty-match-results">
                <ListChecks size={32} />
                <p>Enter a request to see the best available sitters.</p>
              </div>
            ) : (
              <div className="smart-match-grid">
                {suggestions.map((sitter) =>
                  bookingKind === 'PET' ? (
                    <PetSitterCard key={sitter.id} sitter={toCard(sitter)} initialBookingContext={initialBookingContext(sitter)} />
                  ) : (
                    <BabySitterCard key={sitter.id} sitter={toCard(sitter)} initialBookingContext={initialBookingContext(sitter)} />
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default SmartMatchPage
