import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import './AuthPage.css'

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isLoading, setIsLoading] = useState(false)

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
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // Handle successful login
      console.log('Login successful:', formData)
    }, 2000)
  }

  const togglePassword = (fieldName: string) => {
    const input = document.getElementById(fieldName) as HTMLInputElement
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password'
    }
  }

  return (
    <div className="auth-page">
      <SubPageHeader />
      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-form-container">
            <div className="auth-header">
              <h1>Welcome Back</h1>
              <p>Sign in to your sitter account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter your email"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'error' : ''}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePassword('password')}
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
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
              <p>Don't have an account? <Link to="/signup">Sign up as a sitter</Link></p>
              <p>Are you a customer? <Link to="/customer-login">Sign in as a customer</Link></p>
            </div>
          </div>

          <div className="auth-side">
            <div className="auth-side-content">
              <h2>Join Our Community</h2>
              <p>Connect with families who need your care services</p>
              <ul>
                <li>✓ Flexible scheduling</li>
                <li>✓ Competitive rates</li>
                <li>✓ Safe environment</li>
                <li>✓ Support team</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default LoginPage