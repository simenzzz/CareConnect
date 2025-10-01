import React from 'react'
import './Footer.css'

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="logo">
              <i className="fas fa-heart"></i>
              <span>CareConnect</span>
            </div>
            <p>Providing trusted care for your most precious family members.</p>
            <div className="social-links">
              <a href="#"><i className="fab fa-facebook"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>
          <div className="footer-section">
            <h3>Services</h3>
            <ul>
              <li><a href="#services">Pet Sitting</a></li>
              <li><a href="#services">Baby Sitting</a></li>
              <li><a href="#services">Dog Walking</a></li>
              <li><a href="#services">Overnight Care</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Contact Info</h3>
            <div className="contact-info">
              <p><i className="fas fa-phone"></i> (555) 123-4567</p>
              <p><i className="fas fa-envelope"></i> info@careconnect.com</p>
              <p><i className="fas fa-map-marker-alt"></i> 123 Care Street, City, State 12345</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 CareConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
