import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
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
                className={`sidebar-item ${activeSection === 'pet-bookings' ? 'active' : ''}`}
                onClick={() => handleSectionChange('pet-bookings')}
              >
                <i className="fas fa-paw"></i>
                <span>Pet Bookings</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'child-bookings' ? 'active' : ''}`}
                onClick={() => handleSectionChange('child-bookings')}
              >
                <i className="fas fa-baby"></i>
                <span>Child Bookings</span>
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
              <div className="content-section">
                <div className="section-header">
                  <h1>Profile</h1>
                  <p>Manage your personal information</p>
                </div>
                
                <div className="content-card">
                  <div className="card-section">
                    <h3>Personal Information</h3>
                    <p className="coming-soon">Profile management coming soon...</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'pet-bookings' && (
              <div className="content-section">
                <div className="section-header">
                  <h1>Pet Bookings</h1>
                  <p>View and manage your pet sitting bookings</p>
                </div>
                
                <div className="content-card">
                  <div className="card-section">
                    <h3>Upcoming Bookings</h3>
                    <p className="coming-soon">Pet bookings coming soon...</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'child-bookings' && (
              <div className="content-section">
                <div className="section-header">
                  <h1>Child Bookings</h1>
                  <p>View and manage your childcare bookings</p>
                </div>
                
                <div className="content-card">
                  <div className="card-section">
                    <h3>Upcoming Bookings</h3>
                    <p className="coming-soon">Child bookings coming soon...</p>
                  </div>
                </div>
              </div>
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

