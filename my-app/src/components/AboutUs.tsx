import React from 'react'
import SectionLabel from './ui/SectionLabel'
import aboutCare from '../assets/images/about-care.jpg'
import './AboutUs.css'

const AboutUs: React.FC = () => {
  return (
    <section className="about-us">
      <div className="about-photo" aria-hidden="true">
        <img src={aboutCare} alt="" width={1100} height={1300} loading="lazy" />
        <div className="about-photo__veil" />
      </div>
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <SectionLabel>Our story</SectionLabel>
            <h2>Care, the way it should feel</h2>
            <p>
              CareConnect connects Lebanese families with experienced, verified
              caregivers for their children and pets. Finding the right care is one of
              the most important decisions you make — we treat it that way.
            </p>
            <p>
              Our mission is a safe, reliable and convenient way for families to find
              qualified sitters, while giving caregivers the chance to build meaningful
              relationships with the families they serve.
            </p>
            <div className="about-stats">
              <div className="stat">
                <h3>500+</h3>
                <p>Verified sitters</p>
              </div>
              <div className="stat">
                <h3>1,000+</h3>
                <p>Happy families</p>
              </div>
              <div className="stat">
                <h3>5,000+</h3>
                <p>Bookings made</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutUs
