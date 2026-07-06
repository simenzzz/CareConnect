import React, { useState, useEffect, useRef } from 'react'
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
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buttonClasses } from './ui/buttonClasses'
import ScrollLink from './ScrollLink'
import './Header.css'

const Header: React.FC = () => {
  const { user, userType, signOut } = useAuth()
  const isLoggedIn = !!user
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Close dropdown/mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false)
      }
      if (
        navRef.current && !navRef.current.contains(target) &&
        toggleRef.current && !toggleRef.current.contains(target)
      ) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowDropdown(false)
      setMobileMenuOpen(false)
      navigate('/')
    } catch {
      // Sign-out failures are non-fatal; the user stays on the page.
    }
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <div className="logo-container">
              <div className="logo-icon">
                <Heart size={18} fill="currentColor" strokeWidth={0} />
              </div>
              <span className="logo-text">CareConnect</span>
            </div>
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav id="primary-navigation" className={`nav ${mobileMenuOpen ? 'nav-open' : ''}`} ref={navRef}>
          <ul className="nav-list">
            <li><Link to="/" onClick={closeMobileMenu}>Home</Link></li>
            <li><Link to="/sitters" onClick={closeMobileMenu}>Find Sitters</Link></li>
            <li><Link to="/careers" onClick={closeMobileMenu}>Careers</Link></li>
            <li><ScrollLink to="/#about" onNavigate={closeMobileMenu}>About Us</ScrollLink></li>
            <li><ScrollLink to="/#faq" onNavigate={closeMobileMenu}>FAQ</ScrollLink></li>
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
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <User size={17} />
                          <span>Profile</span>
                        </Link>

                        <Link
                          to="/user-portal?section=manage-children"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <Baby size={17} />
                          <span>Manage Children</span>
                        </Link>

                        <Link
                          to="/user-portal?section=manage-pets"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <PawPrint size={17} />
                          <span>Manage Pets</span>
                        </Link>

                        <Link
                          to="/user-portal?section=my-locations"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <MapPin size={17} />
                          <span>My Locations</span>
                        </Link>

                        <Link
                          to="/user-portal?section=my-bookings"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <CalendarCheck size={17} />
                          <span>My Bookings</span>
                        </Link>

                        <Link
                          to="/user-portal?section=payment-methods"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
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
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <User size={17} />
                          <span>Profile</span>
                        </Link>

                        <Link
                          to="/sitter-portal?section=bookings"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
                        >
                          <CalendarCheck size={17} />
                          <span>Bookings</span>
                        </Link>

                        <Link
                          to="/sitter-portal?section=balance"
                          className="dropdown-item"
                          onClick={() => { setShowDropdown(false); closeMobileMenu() }}
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
              <li className="nav-auth">
                <Link to="/login" className={buttonClasses('secondary', 'sm')} onClick={closeMobileMenu}>Sign In</Link>
                <Link to="/customer-signup" className={buttonClasses('primary', 'sm')} onClick={closeMobileMenu}>Sign Up</Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
