import React from 'react'
import './AboutUs.css'

const AboutUs: React.FC = () => {
  return (
    <section id="about" className="about-us">
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <h2>About CareConnect</h2>
            <p>
              CareConnect is a trusted platform that connects families with experienced, 
              verified caregivers for their children and pets. We understand that finding 
              the right care for your loved ones is one of the most important decisions 
              you'll make.
            </p>
            <p>
              Our mission is to provide a safe, reliable, and convenient way for families 
              to find qualified sitters while giving caregivers the opportunity to build 
              meaningful relationships with the families they serve.
            </p>
            <div className="about-stats">
              <div className="stat">
                <h3>500+</h3>
                <p>Verified Sitters</p>
              </div>
              <div className="stat">
                <h3>1,000+</h3>
                <p>Happy Families</p>
              </div>
              <div className="stat">
                <h3>5,000+</h3>
                <p>Successful Bookings</p>
              </div>
            </div>
          </div>
          <div className="about-image">
            <div className="about-placeholder">
              <i className="fas fa-users"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutUs
