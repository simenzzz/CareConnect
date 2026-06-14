import React from 'react'
import { Clock, Heart, Home, ShieldCheck, Star, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import './PortalPage.css'

const PortalPage: React.FC = () => {
  return (
    <div className="portal-page">
      <SubPageHeader />
      <div className="portal-main">
        <div className="portal-container">
          <div className="portal-form-container">
            <div className="portal-header">
              <h1>Join CareConnect</h1>
              <p>Choose how you'd like to join our community</p>
            </div>

            <div className="login-type-selection">
              <h3>Already have an account?</h3>
              <div className="login-buttons">
                <Link to="/customer-login" className="btn-login-type customer-login">
                  <Home size={16} />
                  <span>Customer Login</span>
                </Link>
                <Link to="/login" className="btn-login-type sitter-login">
                  <UserRound size={16} />
                  <span>Sitter Login</span>
                </Link>
              </div>
            </div>

            <div className="divider">
              <span>or</span>
            </div>

            <div className="signup-section">
              <h3>New to CareConnect?</h3>
              <div className="portal-buttons">
                <Link to="/customer-signup" className="btn-portal customer-btn">
                  <Home size={16} />
                  <span>Customer Signup</span>
                </Link>
                
                <Link to="/signup" className="btn-portal sitter-btn">
                  <UserRound size={16} />
                  <span>Sitter Signup</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="auth-side">
            <div className="auth-side-content">
              <h2>Welcome to CareConnect</h2>
              <p>Join Lebanon's most trusted caregiving community</p>
              <div className="benefits">
                <div className="benefit-item">
                  <ShieldCheck size={16} />
                  <span>Background verified</span>
                </div>
                <div className="benefit-item">
                  <Star size={16} />
                  <span>Rated and reviewed</span>
                </div>
                <div className="benefit-item">
                  <Clock size={16} />
                  <span>Flexible scheduling</span>
                </div>
                <div className="benefit-item">
                  <Heart size={16} />
                  <span>Personalized care</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default PortalPage