import React from 'react'
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
                  <i className="fas fa-home"></i>
                  <span>Customer Login</span>
                </Link>
                <Link to="/login" className="btn-login-type sitter-login">
                  <i className="fas fa-user-tie"></i>
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
                  <i className="fas fa-home"></i>
                  <span>Customer Signup</span>
                </Link>
                
                <Link to="/signup" className="btn-portal sitter-btn">
                  <i className="fas fa-user-tie"></i>
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
                  <i className="fas fa-shield-alt"></i>
                  <span>Background verified</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-star"></i>
                  <span>Rated and reviewed</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-clock"></i>
                  <span>Flexible scheduling</span>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-heart"></i>
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