import React from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import ScrollLink from './ScrollLink'
import './Header.css'

const SubPageHeader: React.FC = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <div className="logo-container">
              <div className="logo-icon">
                <Heart size={18} fill="currentColor" strokeWidth={0} />
              </div>
              <h1>CareConnect</h1>
            </div>
          </Link>
        </div>
        
        <nav className="nav">
          <ul className="nav-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/sitters">Find Sitters</Link></li>
            <li><Link to="/careers">Careers</Link></li>
            <li><ScrollLink to="/#about">About Us</ScrollLink></li>
            <li><ScrollLink to="/#faq">FAQ</ScrollLink></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default SubPageHeader
