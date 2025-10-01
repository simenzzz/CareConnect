import React from 'react'
import { Link } from 'react-router-dom'
import './Hero.css'

const Hero: React.FC = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1>Trusted Care for Your Loved Ones</h1>
          <p>Professional pet sitting and baby sitting services you can rely on. We provide compassionate, experienced care for your pets and children when you need it most.</p>
          <div className="hero-buttons">
            <Link to="#services" className="btn-primary">Get Started</Link>
            <Link to="#about" className="btn-secondary">Learn More</Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-card">
            <i className="fas fa-paw"></i>
            <h3>Pet Care</h3>
            <p>Expert pet sitting services</p>
          </div>
          <div className="hero-card">
            <i className="fas fa-baby"></i>
            <h3>Baby Care</h3>
            <p>Professional childcare services</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
