import React from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Baby, Check } from 'lucide-react'
import { buttonClasses } from './ui/buttonClasses'
import SectionLabel from './ui/SectionLabel'
import './ServicesDivision.css'

const PET_FEATURES = [
  'In-home pet sitting',
  'Dog walking services',
  'Feeding & medication',
  'Playtime & exercise',
  'Overnight care',
  'Emergency vet visits',
]

const BABY_FEATURES = [
  'Certified childcare providers',
  'Age-appropriate activities',
  'Meal preparation & feeding',
  'Bedtime routines',
  'Educational playtime',
  'First-aid certified',
]

const ServicesDivision: React.FC = () => {
  return (
    <section id="services" className="services-division">
      <div className="container">
        <div className="section-header">
          <SectionLabel center>What we offer</SectionLabel>
          <h2>Two kinds of care, one standard</h2>
          <p>Choose the support your household needs — or both.</p>
        </div>
        <div className="services-grid">
          <article className="service-card pet-service">
            <div className="service-header">
              <div className="service-icon">
                <PawPrint size={30} />
              </div>
              <h3>Pet sitting</h3>
            </div>
            <div className="service-content">
              <ul className="service-features">
                {PET_FEATURES.map((f) => (
                  <li key={f}>
                    <Check size={18} /> {f}
                  </li>
                ))}
              </ul>
              <div className="service-pricing">
                <span className="price">from $25</span>
                <span className="price-unit">/ hour</span>
              </div>
              <Link
                to="/sitters#pet-sitters"
                className={buttonClasses('primary', 'md', 'hearth-btn--block')}
              >
                Book pet care
              </Link>
            </div>
          </article>

          <article className="service-card baby-service">
            <div className="service-header">
              <div className="service-icon">
                <Baby size={30} />
              </div>
              <h3>Baby sitting</h3>
            </div>
            <div className="service-content">
              <ul className="service-features">
                {BABY_FEATURES.map((f) => (
                  <li key={f}>
                    <Check size={18} /> {f}
                  </li>
                ))}
              </ul>
              <div className="service-pricing">
                <span className="price">from $20</span>
                <span className="price-unit">/ hour</span>
              </div>
              <Link
                to="/sitters#baby-sitters"
                className={buttonClasses('primary', 'md', 'hearth-btn--block')}
              >
                Book childcare
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default ServicesDivision
