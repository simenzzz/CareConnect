import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import ServicesDivision from '../components/ServicesDivision'
import WhyChooseUs from '../components/WhyChooseUs'
import AboutUs from '../components/AboutUs'
import FAQ from '../components/FAQ'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
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
        <AboutUs />
        <FAQ />
      </main>
      <Footer />

      <Modal open={showSuccessModal} onClose={closeModal} hideClose size="sm">
        <div className="success-modal-body">
          <div className="success-modal-icon">
            <CircleCheck size={56} strokeWidth={1.5} />
          </div>
          <h2>Account created</h2>
          <p>
            We'll review your application and contact you on WhatsApp at the number you
            provided within 2&ndash;3 business days.
          </p>
          <Button onClick={closeModal} fullWidth>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default HomePage
