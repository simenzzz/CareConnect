import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { authService } from '../services/authService'
import './Header.css'

const Header: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState<'customer' | 'sitter' | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user)
      
      if (user) {
        // Fetch user profile to determine type
        const profileResult = await authService.getProfile()
        if (profileResult.success && profileResult.data) {
          setUserType(profileResult.data.user.userType)
        }
      } else {
        setUserType(null)
      }
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      setShowDropdown(false)
      navigate('/')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

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
            {isLoggedIn ? (
              <li className="user-menu" ref={dropdownRef}>
                <div 
                  className="user-icon-link" 
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <div className="user-icon">
                    <i className="fas fa-user-circle"></i>
                  </div>
                </div>
                
                {showDropdown && (
                  <div className="user-dropdown">
                    {userType === 'customer' ? (
                      <>
                        <Link 
                          to="/user-portal?section=profile" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-user"></i>
                          <span>Profile</span>
                        </Link>
                        
                        <Link 
                          to="/user-portal?section=pet-bookings" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-paw"></i>
                          <span>Pet Bookings</span>
                        </Link>
                        
                        <Link 
                          to="/user-portal?section=child-bookings" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-baby"></i>
                          <span>Child Bookings</span>
                        </Link>
                        
                        <Link 
                          to="/user-portal?section=payment-methods" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-credit-card"></i>
                          <span>Payment Methods</span>
                        </Link>
                      </>
                    ) : userType === 'sitter' ? (
                      <>
                        <Link 
                          to="/sitter-portal?section=profile" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-user"></i>
                          <span>Profile</span>
                        </Link>
                        
                        <Link 
                          to="/sitter-portal?section=bookings" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-calendar-check"></i>
                          <span>Bookings</span>
                        </Link>
                        
                        <Link 
                          to="/sitter-portal?section=balance" 
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-wallet"></i>
                          <span>My Balance</span>
                        </Link>
                      </>
                    ) : null}
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item sign-out-btn"
                      onClick={handleSignOut}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <>
                <li><Link to="/customer-login" className="btn-signin">Sign In</Link></li>
                <li><Link to="/portal" className="btn-signup">Sign Up</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header