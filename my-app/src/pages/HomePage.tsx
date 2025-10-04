import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import ServicesDivision from '../components/ServicesDivision'
import WhyChooseUs from '../components/WhyChooseUs'
import FAQ from '../components/FAQ'
import { useScrollToSection } from '../hooks/useScrollToSection'
import './HomePage.css'

const HomePage: React.FC = () => {
  useScrollToSection()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setShowSuccessModal(true)
      // Remove the query parameter from URL
      searchParams.delete('signup')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const closeModal = () => {
    setShowSuccessModal(false)
  }

  return (
    <div className="home-page">
      <Header />
      <main>
        <Hero />
        <WhyChooseUs />
        <ServicesDivision />
        <FAQ />
      </main>
      <Footer />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay" onClick={closeModal}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Account Created Successfully!</h2>
            <p>
              We will review your application and contact you on WhatsApp with the number you provided within 2-3 business days.
            </p>
            <button className="success-modal-btn" onClick={closeModal}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
