import React, { useState, useEffect, useRef } from 'react'
import { logger } from '../utils/logger';
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart,
  User,
  Baby,
  PawPrint,
  MapPin,
  CalendarCheck,
  CreditCard,
  Wallet,
  LogOut,
} from 'lucide-react'
import { auth } from '../config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { authService } from '../services/authService'
import ScrollLink from './ScrollLink'
import './Header.css'

const PageHeader: React.FC = () => {
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
      logger.error('Sign out failed:', error)
    }
  }

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
            <li><ScrollLink to="/#about">About Us</ScrollLink></li>
            <li><ScrollLink to="/#faq">FAQ</ScrollLink></li>
            {isLoggedIn ? (
              <li className="user-menu" ref={dropdownRef}>
                <button
                  type="button"
                  className="user-icon-link"
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-label="Account menu"
                  aria-expanded={showDropdown}
                >
                  <div className="user-icon">
                    <User size={20} />
                  </div>
                </button>

                {showDropdown && (
                  <div className="user-dropdown">
                    {userType === 'customer' ? (
                      <>
                        <Link
                          to="/user-portal?section=profile"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <User size={17} />
                          <span>Profile</span>
                        </Link>

                        <Link
                          to="/user-portal?section=manage-children"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <Baby size={17} />
                          <span>Manage Children</span>
                        </Link>

                        <Link
                          to="/user-portal?section=manage-pets"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <PawPrint size={17} />
                          <span>Manage Pets</span>
                        </Link>

                        <Link
                          to="/user-portal?section=my-locations"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <MapPin size={17} />
                          <span>My Locations</span>
                        </Link>

                        <Link
                          to="/user-portal?section=my-bookings"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <CalendarCheck size={17} />
                          <span>My Bookings</span>
                        </Link>

                        <Link
                          to="/user-portal?section=payment-methods"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <CreditCard size={17} />
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
                          <User size={17} />
                          <span>Profile</span>
                        </Link>

                        <Link
                          to="/sitter-portal?section=bookings"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <CalendarCheck size={17} />
                          <span>Bookings</span>
                        </Link>

                        <Link
                          to="/sitter-portal?section=balance"
                          className="dropdown-item"
                          onClick={() => setShowDropdown(false)}
                        >
                          <Wallet size={17} />
                          <span>My Balance</span>
                        </Link>
                      </>
                    ) : null}

                    <div className="dropdown-divider"></div>

                    <button
                      className="dropdown-item sign-out-btn"
                      onClick={handleSignOut}
                    >
                      <LogOut size={17} />
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

export default PageHeader
