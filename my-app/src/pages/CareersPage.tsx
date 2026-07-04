import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import { buttonClasses } from '../components/ui/buttonClasses'
import SectionLabel from '../components/ui/SectionLabel'
import aboutCare from '../assets/images/about-care.jpg'
import './CareersPage.css'

const EXPECTATIONS = [
  'Reliable availability for booked sessions',
  'Comfort with children, pets, or both',
  'Clear communication with families',
  'Respect for household routines and privacy',
]

const STEPS = [
  { icon: FileText, title: 'Apply', body: 'Share your profile, service area, CV, and identity document.' },
  { icon: ClipboardCheck, title: 'Review', body: 'Our team checks the application and follows up for verification.' },
  { icon: UserCheck, title: 'Activate', body: 'Approved sitters can manage their profile and receive bookings.' },
]

const CareersPage: React.FC = () => {
  return (
    <div className="careers-page">
      <SubPageHeader />
      <main>
        <section className="careers-hero">
          <div className="careers-hero__media" aria-hidden="true">
            <img src={aboutCare} alt="" width={1200} height={900} />
          </div>
          <div className="careers-hero__content">
            <SectionLabel className="reveal" style={{ '--i': 0 } as React.CSSProperties}>
              CareConnect caregiver network
            </SectionLabel>
            <h1 className="reveal" style={{ '--i': 1 } as React.CSSProperties}>
              Care work with standards, trust, and support.
            </h1>
            <p className="reveal" style={{ '--i': 2 } as React.CSSProperties}>
              Join a vetted Lebanon-based network for babysitting and pet sitting. Apply
              once, get verified, and manage your sitter profile from a dedicated portal.
            </p>
            <div className="careers-hero__actions reveal" style={{ '--i': 3 } as React.CSSProperties}>
              <Link to="/careers/sitter/apply" className={buttonClasses('primary', 'lg')}>
                Apply as a sitter <ArrowRight size={18} />
              </Link>
              <Link to="/careers/sitter/login" className={buttonClasses('ghost', 'lg')}>
                Sitter login
              </Link>
            </div>
          </div>
        </section>

        <section className="careers-band">
          <div className="careers-band__inner">
            <div>
              <SectionLabel>Who this is for</SectionLabel>
              <h2>Built for serious caregivers</h2>
            </div>
            <p>
              CareConnect is for sitters who want a professional way to meet families
              while keeping verification, scheduling, and profile management organized.
            </p>
          </div>
        </section>

        <section className="careers-section">
          <div className="careers-section__header">
            <SectionLabel center>Application path</SectionLabel>
            <h2>From application to active sitter</h2>
          </div>
          <div className="careers-steps">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <article className="careers-step" key={title}>
                <span className="careers-step__icon">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="careers-split">
          <div className="careers-split__panel">
            <SectionLabel>What we value</SectionLabel>
            <h2>A trusted network starts before the first booking</h2>
            <p>
              Families see only active, verified sitters. The application process helps
              us understand your care style, experience, documents, and service area.
            </p>
            <ul className="careers-checklist">
              {EXPECTATIONS.map((item) => (
                <li key={item}>
                  <BadgeCheck size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="careers-metrics" aria-label="CareConnect caregiver standards">
            <div>
              <ShieldCheck size={24} />
              <strong>ID verification</strong>
              <span>Required before public visibility</span>
            </div>
            <div>
              <CalendarDays size={24} />
              <strong>Flexible schedule</strong>
              <span>Set availability around your week</span>
            </div>
            <div>
              <HeartHandshake size={24} />
              <strong>Family fit</strong>
              <span>Baby care, pet care, or both</span>
            </div>
            <div>
              <Sparkles size={24} />
              <strong>Profile support</strong>
              <span>Skills, experience, and service area</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default CareersPage
