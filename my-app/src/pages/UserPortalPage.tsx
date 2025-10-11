import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import ProfileSection from '../components/ProfileSection'
import ManageChildren from '../components/ManageChildren'
import ManagePets from '../components/ManagePets'
import MyLocations from '../components/MyLocations'
import MyBookings from '../components/MyBookings'
import './UserPortalPage.css'

const UserPortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'profile')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Redirect to login if not authenticated
        navigate('/portal')
      } else {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [navigate])

  useEffect(() => {
    // Update active section when URL params change
    const section = searchParams.get('section')
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setSearchParams({ section })
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="user-portal-page">
      <SubPageHeader />
      <main className="portal-main">
        <div className="portal-container">
          {/* Sidebar Navigation */}
          <aside className="portal-sidebar">
            <div className="sidebar-header">
              <h2>My Portal</h2>
            </div>
            
            <nav className="sidebar-nav">
              <button
                className={`sidebar-item ${activeSection === 'profile' ? 'active' : ''}`}
                onClick={() => handleSectionChange('profile')}
              >
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'manage-children' ? 'active' : ''}`}
                onClick={() => handleSectionChange('manage-children')}
              >
                <i className="fas fa-baby"></i>
                <span>Manage Children</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'manage-pets' ? 'active' : ''}`}
                onClick={() => handleSectionChange('manage-pets')}
              >
                <i className="fas fa-paw"></i>
                <span>Manage Pets</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'my-locations' ? 'active' : ''}`}
                onClick={() => handleSectionChange('my-locations')}
              >
                <i className="fas fa-map-marker-alt"></i>
                <span>My Locations</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'my-bookings' ? 'active' : ''}`}
                onClick={() => handleSectionChange('my-bookings')}
              >
                <i className="fas fa-calendar-check"></i>
                <span>My Bookings</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'payment-methods' ? 'active' : ''}`}
                onClick={() => handleSectionChange('payment-methods')}
              >
                <i className="fas fa-credit-card"></i>
                <span>Payment Methods</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="portal-content">
            {activeSection === 'profile' && (
              <ProfileSection />
            )}

            {activeSection === 'manage-children' && (
              <ManageChildren />
            )}

            {activeSection === 'manage-pets' && (
              <ManagePets />
            )}

            {activeSection === 'my-locations' && (
              <MyLocations />
            )}

            {activeSection === 'my-bookings' && (
              <MyBookings />
            )}

            {activeSection === 'payment-methods' && (
              <div className="content-section">
                <div className="section-header">
                  <h1>Payment Methods</h1>
                  <p>Manage your payment options</p>
                </div>
                
                <div className="content-card">
                  <div className="card-section">
                    <h3>Saved Payment Methods</h3>
                    <p className="coming-soon">Payment methods coming soon...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default UserPortalPage

