import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SubPageHeader from '../components/SubPageHeader'
import Footer from '../components/Footer'
import { buttonClasses } from '../components/ui/buttonClasses'
import './NotFoundPage.css'

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <SubPageHeader />
      <main className="not-found-main">
        <div className="not-found-panel">
          <p className="not-found-kicker">404</p>
          <h1>Page not found</h1>
          <p>
            This page is not available. Use the main navigation to continue, or return
            to the CareConnect home page.
          </p>
          <Link to="/" className={buttonClasses('primary', 'md')}>
            <ArrowLeft size={18} />
            Back home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFoundPage
