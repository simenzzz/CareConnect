import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import ServicesDivision from '../components/ServicesDivision'
import WhyChooseUs from '../components/WhyChooseUs'
import FAQ from '../components/FAQ'
import './HomePage.css'

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <Header />
      <main>
        <Hero />
        <WhyChooseUs />
        <ServicesDivision />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}

export default HomePage
