import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import CustomerSignupPage from './pages/CustomerSignupPage'
import CareersPage from './pages/CareersPage'
import NotFoundPage from './pages/NotFoundPage'
import SittersPage from './pages/SittersPage'
import SmartMatchPage from './pages/SmartMatchPage'
import UserPortalPage from './pages/UserPortalPage'
import SitterPortalPage from './pages/SitterPortalPage'
import './App.css'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/customer-login" element={<Navigate to="/login" replace />} />
      <Route path="/customer-signup" element={<CustomerSignupPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/careers/sitter/login" element={<Navigate to="/login" replace />} />
      <Route path="/careers/sitter/apply" element={<SignupPage />} />
      <Route path="/sitters" element={<SittersPage />} />
      <Route
        path="/smart-match"
        element={
          <ProtectedRoute requiredRole="customer">
            <SmartMatchPage />
          </ProtectedRoute>
        }
      />
      <Route path="/portal" element={<Navigate to="/customer-signup" replace />} />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
