import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, Phone, Mail, MapPin } from 'lucide-react'
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedinIcon,
} from './ui/icons'
import './Footer.css'

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="footer-logo__badge">
                <Heart size={16} fill="currentColor" strokeWidth={0} />
              </span>
              <span>CareConnect</span>
            </div>
            <p>Trusted care for your most precious family members — across Lebanon.</p>
            <div className="social-links">
              <a href="#" aria-label="Facebook"><FacebookIcon size={18} /></a>
              <a href="#" aria-label="Instagram"><InstagramIcon size={18} /></a>
              <a href="#" aria-label="Twitter"><TwitterIcon size={18} /></a>
              <a href="#" aria-label="LinkedIn"><LinkedinIcon size={18} /></a>
            </div>
          </div>
          <div className="footer-section">
            <h3>Services</h3>
            <ul>
              <li><a href="#services">Pet sitting</a></li>
              <li><a href="#services">Baby sitting</a></li>
              <li><a href="#services">Dog walking</a></li>
              <li><a href="#services">Overnight care</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Caregivers</h3>
            <ul>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/careers/sitter/apply">Apply as a sitter</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Get in touch</h3>
            <div className="contact-info">
              <p><Phone size={16} /> +961 1 234 567</p>
              <p><Mail size={16} /> hello@careconnect.lb</p>
              <p><MapPin size={16} /> Beirut, Lebanon</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} CareConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
