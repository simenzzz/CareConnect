import React from 'react'
import { Link } from 'react-router-dom'
import './ServicesDivision.css'

const ServicesDivision: React.FC = () => {
  return (
    <section id="services" className="services-division">
      <div className="container">
        <div className="section-header">
          <h2>Our Services</h2>
          <p>Choose the perfect care solution for your needs</p>
        </div>
        <div className="services-grid">
          {/* Pet Sitting Services */}
          <div className="service-card pet-service">
            <div className="service-header">
              <div className="service-icon">
                <i className="fas fa-paw"></i>
              </div>
              <h3>Pet Sitting Services</h3>
            </div>
            <div className="service-content">
              <ul className="service-features">
                <li><i className="fas fa-check"></i> In-home pet sitting</li>
                <li><i className="fas fa-check"></i> Dog walking services</li>
                <li><i className="fas fa-check"></i> Feeding & medication</li>
                <li><i className="fas fa-check"></i> Playtime & exercise</li>
                <li><i className="fas fa-check"></i> Overnight care</li>
                <li><i className="fas fa-check"></i> Emergency vet visits</li>
              </ul>
              <div className="service-pricing">
                <span className="price">Starting at $25/hour</span>
              </div>
              <Link to="#contact" className="btn-service">Book Pet Care</Link>
            </div>
          </div>

          {/* Baby Sitting Services */}
          <div className="service-card baby-service">
            <div className="service-header">
              <div className="service-icon">
                <i className="fas fa-baby"></i>
              </div>
              <h3>Baby Sitting Services</h3>
            </div>
            <div className="service-content">
              <ul className="service-features">
                <li><i className="fas fa-check"></i> Certified childcare providers</li>
                <li><i className="fas fa-check"></i> Age-appropriate activities</li>
                <li><i className="fas fa-check"></i> Meal preparation & feeding</li>
                <li><i className="fas fa-check"></i> Bedtime routines</li>
                <li><i className="fas fa-check"></i> Educational playtime</li>
                <li><i className="fas fa-check"></i> First aid certified</li>
              </ul>
              <div className="service-pricing">
                <span className="price">Starting at $20/hour</span>
              </div>
              <Link to="#contact" className="btn-service">Book Childcare</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ServicesDivision