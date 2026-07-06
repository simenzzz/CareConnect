import React, { useState, useEffect } from 'react'
import { Baby, CalendarCheck, CreditCard, MapPin, PawPrint, User } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProfileSection from '../components/ProfileSection'
import ManageChildren from '../components/ManageChildren'
import ManagePets from '../components/ManagePets'
import MyLocations from '../components/MyLocations'
import MyBookings from '../components/MyBookings'
import './UserPortalPage.css'

const UserPortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'profile')

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

  return (
    <div className="user-portal-page">
      <Header />
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
                <User size={16} />
                <span>Profile</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'manage-children' ? 'active' : ''}`}
                onClick={() => handleSectionChange('manage-children')}
              >
                <Baby size={16} />
                <span>Manage Children</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'manage-pets' ? 'active' : ''}`}
                onClick={() => handleSectionChange('manage-pets')}
              >
                <PawPrint size={16} />
                <span>Manage Pets</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'my-locations' ? 'active' : ''}`}
                onClick={() => handleSectionChange('my-locations')}
              >
                <MapPin size={16} />
                <span>My Locations</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'my-bookings' ? 'active' : ''}`}
                onClick={() => handleSectionChange('my-bookings')}
              >
                <CalendarCheck size={16} />
                <span>My Bookings</span>
              </button>
              
              <button
                className={`sidebar-item ${activeSection === 'payment-methods' ? 'active' : ''}`}
                onClick={() => handleSectionChange('payment-methods')}
              >
                <CreditCard size={16} />
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

