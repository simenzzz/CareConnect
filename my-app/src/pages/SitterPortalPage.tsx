import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import SitterProfileSection from '../components/SitterProfileSection'
import './UserPortalPage.css'

const SitterPortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'profile')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Redirect to login if not authenticated
        navigate('/login')
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
              <h2>Sitter Dashboard</h2>
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
                className={`sidebar-item ${activeSection === 'bookings' ? 'active' : ''}`}
                onClick={() => handleSectionChange('bookings')}
              >
                <i className="fas fa-calendar-check"></i>
                <span>Bookings</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'balance' ? 'active' : ''}`}
                onClick={() => handleSectionChange('balance')}
              >
                <i className="fas fa-wallet"></i>
                <span>My Balance</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="portal-content">
            {activeSection === 'profile' && (
              <SitterProfileSection />
            )}

            {activeSection === 'bookings' && (
              <div className="content-section">
                <div className="section-header">
                  <h1>Bookings</h1>
                  <p>View and manage your upcoming and past bookings</p>
                </div>
                
                <div className="content-card">
                  <div className="card-section">
                    <h3>Upcoming Sessions</h3>
                    <p className="coming-soon">Bookings management coming soon...</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'balance' && (
              <div className="content-section">
                <div className="section-header">
                  <h1>My Balance</h1>
                  <p>Track your earnings and payment history</p>
                </div>
                
                <div className="content-card">
                  <div className="card-section">
                    <h3>Current Balance</h3>
                    <div className="balance-display">
                      <div className="balance-amount">
                        <span className="currency">$</span>
                        <span className="amount">0.00</span>
                      </div>
                      <button className="btn-withdraw">Withdraw Funds</button>
                    </div>
                    <p className="coming-soon">Payment tracking coming soon...</p>
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

export default SitterPortalPage

