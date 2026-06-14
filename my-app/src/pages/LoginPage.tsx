import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, UserRound, Eye, EyeOff, CircleAlert, Check } from 'lucide-react'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import Button from '../components/ui/Button'
import { GoogleIcon, FacebookIcon } from '../components/ui/icons'
import authService from '../services/authService'
import './AuthPage.css'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
    setErrors({}) // Clear any previous errors

    try {
      // Call the login API
      const result = await authService.login({
        email: formData.email,
        password: formData.password,
        expectedUserType: 'sitter',
        rememberMe: formData.rememberMe
      })

      if (result.success) {
        // Send sitters to their dashboard.
        navigate('/sitter-portal')
      } else {
        setErrors({ general: result.error || 'Login failed. Please try again.' })
      }
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.' })
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
              <Link to="/customer-login" className="tab-link">
                <Home size={16} />
                Customer
              </Link>
              <Link to="/login" className="tab-link active">
                <UserRound size={16} />
                Sitter
              </Link>
            </div>

            <div className="auth-header">
              <h1>Welcome back</h1>
              <p>Sign in to your sitter account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {errors.general && (
                <div className="general-error">
                  <CircleAlert size={18} />
                  <span>{errors.general}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email address</label>
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
                    type={showPassword ? 'text' : 'password'}
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
                    onClick={togglePassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  Remember me
                </label>
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>

              <Button type="submit" loading={isLoading} fullWidth>
                Sign in
              </Button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="social-login">
              <button type="button" className="social-btn google-btn">
                <GoogleIcon size={18} />
                Continue with Google
              </button>
              <button type="button" className="social-btn facebook-btn">
                <FacebookIcon size={18} />
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
              <h2>Join our community</h2>
              <p>Connect with families across Lebanon who need your care.</p>
              <ul>
                <li><Check size={18} /> Flexible scheduling</li>
                <li><Check size={18} /> Competitive rates</li>
                <li><Check size={18} /> A safe, vetted environment</li>
                <li><Check size={18} /> A support team behind you</li>
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
