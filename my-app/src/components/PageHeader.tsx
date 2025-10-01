import React from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

const PageHeader: React.FC = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <div className="logo-container">
              <div className="logo-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h1>CareConnect</h1>
            </div>
          </Link>
        </div>
        
        <nav className="nav">
          <ul className="nav-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/sitters">Find Sitters</Link></li>
            <li><a href="#about">About Us</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><Link to="/portal">Sign In</Link></li>
            <li><Link to="/portal" className="btn-signup">Sign Up</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default PageHeader
