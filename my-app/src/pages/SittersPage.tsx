import React, { useState, useEffect } from 'react'
import { logger } from '../utils/logger';
import { Link, useLocation } from 'react-router-dom'
import { PawPrint, Baby, Search, Map, MapPin, X, LoaderCircle, CircleAlert, WandSparkles } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import PetSitterCard from '../components/PetSitterCard'
import BabySitterCard from '../components/BabySitterCard'
import sittersService from '../services/sittersService'
import type { Sitter } from '../services/sittersService'
import './SittersPage.css'

const SittersPage: React.FC = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'pet' | 'baby'>('pet')
  const [searchName, setSearchName] = useState('')
  const [searchArea, setSearchArea] = useState('')
  const [searchCity, setSearchCity] = useState('')
  const [petSitters, setPetSitters] = useState<Sitter[]>([])
  const [babySitters, setBabySitters] = useState<Sitter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch sitters from API
  useEffect(() => {
    const loadSitters = async () => {
      try {
        setIsLoading(true)
        const result = await sittersService.fetchSitters()
        
        if (result.success && result.data) {
          setPetSitters(result.data.petSitters)
          setBabySitters(result.data.babySitters)
          logger.debug('✅ Sitters loaded:', {
            pet: result.data.petSitters.length,
            baby: result.data.babySitters.length
          })
        } else {
          setError(result.error || 'Failed to load sitters')
        }
      } catch (err) {
        logger.error('Error loading sitters:', err)
        setError('Failed to load sitters')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSitters()
  }, [])

  // Handle hash navigation on component mount and location change
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash === 'baby-sitters') {
      setActiveTab('baby')
    } else if (hash === 'pet-sitters') {
      setActiveTab('pet')
    }
    
    // Scroll to top of page when navigating with hash
    window.scrollTo(0, 0)
  }, [location])

  // Get current sitters based on active tab
  const currentSitters = activeTab === 'pet' ? petSitters : babySitters
  
  // Filter sitters by name, area, and city
  const filteredSitters = currentSitters.filter(sitter => {
    const nameMatch = !searchName || 
      sitter.fullName.toLowerCase().includes(searchName.toLowerCase())
    
    const areaMatch = !searchArea || 
      sitter.area.toLowerCase().includes(searchArea.toLowerCase())
    
    const cityMatch = !searchCity || 
      sitter.city.toLowerCase().includes(searchCity.toLowerCase())
    
    return nameMatch && areaMatch && cityMatch
  })

  return (
    <div className="sitters-page">
      <PageHeader />
      <main className="sitters-main">
        <div className="sitters-hero">
          <div className="container">
            <h1>Find your perfect sitter</h1>
            <p>Browse our verified sitters and find the perfect match for your family</p>
          </div>
        </div>

        <div className="sitters-tabs">
          <div className="container">
            <div className="tabs-container">
              <button
                className={`tab-btn ${activeTab === 'pet' ? 'active' : ''}`}
                onClick={() => setActiveTab('pet')}
              >
                <PawPrint size={18} />
                Pet Sitters
              </button>
              <button
                className={`tab-btn ${activeTab === 'baby' ? 'active' : ''}`}
                onClick={() => setActiveTab('baby')}
              >
                <Baby size={18} />
                Baby Sitters
              </button>
            </div>
          </div>
        </div>

        <div className="sitters-filters">
          <div className="container">
            <div className="filters-container">
              <div className="filter-group">
                <label htmlFor="search-name">
                  <Search size={16} />
                  Search by Name
                </label>
                <input
                  type="text"
                  id="search-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter sitter name..."
                />
              </div>

              <div className="filter-group">
                <label htmlFor="search-area">
                  <Map size={16} />
                  Area
                </label>
                <input
                  type="text"
                  id="search-area"
                  value={searchArea}
                  onChange={(e) => setSearchArea(e.target.value)}
                  placeholder="e.g., Beirut, Mount Lebanon"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="search-city">
                  <MapPin size={16} />
                  Location
                </label>
                <input
                  type="text"
                  id="search-city"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="e.g., Hamra, Jounieh"
                />
              </div>

              {(searchName || searchArea || searchCity) && (
                <button
                  className="clear-filters-btn"
                  onClick={() => {
                    setSearchName('')
                    setSearchArea('')
                    setSearchCity('')
                  }}
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="sitters-results">
          <div className="container">
            {/* Loading State */}
            {isLoading && (
              <div className="loading-state">
                <LoaderCircle size={32} className="spin" />
                <p>Loading sitters...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="error-state">
                <CircleAlert size={32} />
                <p>{error}</p>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && (
              <>
                <div className="results-header">
                  <h2>
                    {activeTab === 'pet' ? 'Pet Sitters' : 'Baby Sitters'} 
                    ({filteredSitters.length})
                  </h2>
                  <p>
                    {activeTab === 'pet' 
                      ? 'Professional pet care specialists ready to care for your furry friends'
                      : 'Experienced childcare providers ready to care for your little ones'
                    }
                  </p>
                  <Link to="/smart-match" className="smart-match-link">
                    <WandSparkles size={18} />
                    Find a sitter for a booking
                  </Link>
                </div>
                
                <div className="sitters-grid">
                  {filteredSitters.map(sitter => (
                    activeTab === 'pet' ? (
                      <PetSitterCard 
                        key={sitter.id} 
                        sitter={{
                          id: sitter.id,
                          name: sitter.fullName,
                          area: `${sitter.city}, ${sitter.area}`,
                          experience: sitter.description || sitter.experience,
                          rating: sitter.rating,
                          specialties: sitter.skills
                        }} 
                      />
                    ) : (
                      <BabySitterCard 
                        key={sitter.id} 
                        sitter={{
                          id: sitter.id,
                          name: sitter.fullName,
                          area: `${sitter.city}, ${sitter.area}`,
                          experience: sitter.description || sitter.experience,
                          rating: sitter.rating,
                          specialties: sitter.skills
                        }} 
                      />
                    )
                  ))}
                </div>

                {filteredSitters.length === 0 && (
                  <div className="no-results">
                    <h3>No {activeTab === 'pet' ? 'pet sitters' : 'baby sitters'} found</h3>
                    <p>Try adjusting your search criteria or check back later for new sitters.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default SittersPage
