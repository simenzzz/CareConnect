import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import CustomerLoginPage from './pages/CustomerLoginPage'
import SignupPage from './pages/SignupPage'
import CustomerSignupPage from './pages/CustomerSignupPage'
import SittersPage from './pages/SittersPage'
import PortalPage from './pages/PortalPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/customer-login" element={<CustomerLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/customer-signup" element={<CustomerSignupPage />} />
          <Route path="/sitters" element={<SittersPage />} />
          <Route path="/portal" element={<PortalPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
