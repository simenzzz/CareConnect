import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface ScrollLinkProps {
  to: string
  children: React.ReactNode
  className?: string
  onNavigate?: () => void
}

const ScrollLink: React.FC<ScrollLinkProps> = ({ to, children, className, onNavigate }) => {
  const navigate = useNavigate()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()

    // Check if the link has a hash (like /#about)
    if (to.includes('#')) {
      const [path, hash] = to.split('#')

      // If we're already on the target page, just scroll
      if (path === '/' && window.location.pathname === '/') {
        const element = document.querySelector(`#${hash}`)
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      } else {
        // Navigate to the page and let the hook handle scrolling
        navigate(to)
      }
    } else {
      // Regular navigation
      navigate(to)
    }

    onNavigate?.()
  }

  return (
    <Link to={to} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}

export default ScrollLink
