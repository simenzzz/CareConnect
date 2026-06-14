import React from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Baby, ShieldCheck, ArrowRight } from 'lucide-react'
import { buttonClasses } from './ui/buttonClasses'
import SectionLabel from './ui/SectionLabel'
import './Hero.css'

const Hero: React.FC = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <SectionLabel className="reveal" style={{ '--i': 0 } as React.CSSProperties}>
            Beirut · Vetted care
          </SectionLabel>
          <h1 className="reveal" style={{ '--i': 1 } as React.CSSProperties}>
            Care worth <span className="hero-underline">trusting</span>, close to home.
          </h1>
          <p className="reveal" style={{ '--i': 2 } as React.CSSProperties}>
            Compassionate, background-checked sitters for the little ones who matter
            most — children and pets alike. Found, vetted and booked across Lebanon.
          </p>
          <div
            className="hero-buttons reveal"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <Link to="/sitters" className={buttonClasses('primary', 'lg')}>
              Find a sitter <ArrowRight size={18} />
            </Link>
            <Link to="/#about" className={buttonClasses('ghost', 'lg')}>
              How it works
            </Link>
          </div>
          <div
            className="hero-trust reveal"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            <ShieldCheck size={18} />
            <span>Every sitter is ID-verified &amp; reference-checked</span>
          </div>
        </div>

        <div className="hero-image">
          <article
            className="hero-card hero-card--pet reveal"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <span className="hero-card__icon">
              <PawPrint size={26} />
            </span>
            <h3>Pet care</h3>
            <p>Walks, feeds &amp; overnight stays from sitters who adore animals.</p>
          </article>
          <article
            className="hero-card hero-card--baby reveal"
            style={{ '--i': 5 } as React.CSSProperties}
          >
            <span className="hero-card__icon">
              <Baby size={26} />
            </span>
            <h3>Baby care</h3>
            <p>Experienced, nurturing childminders for date nights and beyond.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Hero
