import React from 'react'
import { ShieldCheck, Clock, Star, Smartphone, Heart, DollarSign } from 'lucide-react'
import SectionLabel from './ui/SectionLabel'
import './WhyChooseUs.css'

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: 'Insured & background-checked',
    body: 'Every caregiver clears ID verification and reference checks before they can be booked.',
  },
  {
    Icon: Clock,
    title: 'Available around the clock',
    body: "Early mornings, late nights, last-minute plans — there's a sitter for when you need one.",
  },
  {
    Icon: Star,
    title: 'Genuinely experienced',
    body: 'Sitters with real track records in childcare and animal care, rated by families like yours.',
  },
  {
    Icon: Smartphone,
    title: 'Updates as they happen',
    body: 'Photo check-ins and messages throughout the visit, so you always know how things are going.',
  },
  {
    Icon: Heart,
    title: 'Care made personal',
    body: "Plans shaped around your child's or pet's routine, quirks and comforts.",
  },
  {
    Icon: DollarSign,
    title: 'Honest, clear pricing',
    body: 'Transparent USD rates with no hidden fees — pay by Whish Money or cash.',
  },
]

const WhyChooseUs: React.FC = () => {
  return (
    <section id="about" className="why-choose-us">
      <div className="container">
        <div className="section-header">
          <SectionLabel center>Why families choose us</SectionLabel>
          <h2>The care you'd give yourself</h2>
          <p>
            We obsess over trust so you don't have to — for the family members who
            matter most.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map(({ Icon, title, body }) => (
            <article key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={24} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyChooseUs
