import React from 'react'
import './WhyChooseUs.css'

const WhyChooseUs: React.FC = () => {
  return (
    <section id="about" className="why-choose-us">
      <div className="container">
        <div className="section-header">
          <h2>Why Choose CareConnect?</h2>
          <p>We're committed to providing the highest quality care for your most precious family members</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Fully Insured & Bonded</h3>
            <p>Complete peace of mind with comprehensive insurance coverage and background-checked caregivers.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-clock"></i>
            </div>
            <h3>24/7 Availability</h3>
            <p>Round-the-clock service availability. We're here when you need us, day or night.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-star"></i>
            </div>
            <h3>Experienced Professionals</h3>
            <p>Our caregivers are trained professionals with years of experience in pet and child care.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <h3>Real-time Updates</h3>
            <p>Stay connected with photo updates and regular check-ins throughout the service period.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-heart"></i>
            </div>
            <h3>Personalized Care</h3>
            <p>Customized care plans tailored to your pet's or child's specific needs and preferences.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <h3>Competitive Pricing</h3>
            <p>Affordable rates without compromising on quality. Transparent pricing with no hidden fees.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhyChooseUs
