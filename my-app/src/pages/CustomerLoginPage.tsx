import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import { authService } from '../services/authService'
import './AuthPage.css'

const CustomerLoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerPassword: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.customerEmail) {
      newErrors.customerEmail = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email is invalid'
    }
    
    if (!formData.customerPassword) {
      newErrors.customerPassword = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setErrors({}) // Clear any previous errors
    
    try {
      // Call the login API
      const result = await authService.login({
        email: formData.customerEmail,
        password: formData.customerPassword,
        expectedUserType: 'customer',
        rememberMe: formData.rememberMe
      })
      
      if (result.success) {
        // Send customers to their portal.
        navigate('/user-portal')
      } else {
        // Show error message
        setErrors({ general: result.error || 'Login failed. Please try again.' })
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePassword = () => {
    setShowPassword(prev => !prev)
  }

  return (
    <div className="auth-page">
      <SubPageHeader />
      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-form-container">
            <div className="login-type-tabs">
              <Link to="/customer-login" className="tab-link active">
                <i className="fas fa-home"></i>
                Customer
              </Link>
              <Link to="/login" className="tab-link">
                <i className="fas fa-user-tie"></i>
                Sitter
              </Link>
            </div>

            <div className="auth-header">
              <h1>Welcome Back</h1>
              <p>Sign in to your customer account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {errors.general && (
                <div className="error-message" style={{ 
                  display: 'block', 
                  marginBottom: '20px', 
                  padding: '12px', 
                  background: '#fee', 
                  border: '1px solid #fcc', 
                  borderRadius: '8px',
                  color: '#c33'
                }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                  {errors.general}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="customerEmail">Email Address</label>
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  className={errors.customerEmail ? 'error' : ''}
                  placeholder="Enter your email"
                />
                {errors.customerEmail && <span className="error-message">{errors.customerEmail}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="customerPassword">Password</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="customerPassword"
                    name="customerPassword"
                    value={formData.customerPassword}
                    onChange={handleInputChange}
                    className={errors.customerPassword ? 'error' : ''}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePassword}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
                {errors.customerPassword && <span className="error-message">{errors.customerPassword}</span>}
              </div>

              <div className="form-options">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    id="rememberMe" 
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="#" className="forgot-password">Forgot Password?</a>
              </div>

              <button type="submit" className="btn-auth" disabled={isLoading}>
                <span className="btn-text">Sign In</span>
                <div className="btn-loader" style={{ display: isLoading ? 'block' : 'none' }}>
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="social-login">
              <button className="social-btn google-btn">
                <i className="fab fa-google"></i>
                Continue with Google
              </button>
              <button className="social-btn facebook-btn">
                <i className="fab fa-facebook-f"></i>
                Continue with Facebook
              </button>
            </div>

            <div className="auth-footer">
              <p>Don't have an account? <Link to="/customer-signup">Sign up as a customer</Link></p>
              <p>Are you a sitter? <Link to="/login">Sign in as a sitter</Link></p>
            </div>
          </div>

          <div className="auth-side">
            <div className="auth-side-content">
              <h2>Find Trusted Care</h2>
              <p>Connect with experienced sitters for your family's needs</p>
              <ul>
                <li>✓ Verified sitters</li>
                <li>✓ Flexible scheduling</li>
                <li>✓ Safe & secure</li>
                <li>✓ 24/7 support</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default CustomerLoginPage