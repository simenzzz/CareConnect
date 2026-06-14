import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import CustomerLoginPage from './pages/CustomerLoginPage'
import SignupPage from './pages/SignupPage'
import CustomerSignupPage from './pages/CustomerSignupPage'
import SittersPage from './pages/SittersPage'
import SmartMatchPage from './pages/SmartMatchPage'
import PortalPage from './pages/PortalPage'
import UserPortalPage from './pages/UserPortalPage'
import SitterPortalPage from './pages/SitterPortalPage'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/customer-login" element={<CustomerLoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/customer-signup" element={<CustomerSignupPage />} />
            <Route path="/sitters" element={<SittersPage />} />
            <Route
              path="/smart-match"
              element={
                <ProtectedRoute requiredRole="customer">
                  <SmartMatchPage />
                </ProtectedRoute>
              }
            />
            <Route path="/portal" element={<PortalPage />} />
            <Route
              path="/user-portal"
              element={
                <ProtectedRoute requiredRole="customer">
                  <UserPortalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sitter-portal"
              element={
                <ProtectedRoute requiredRole="sitter">
                  <SitterPortalPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
