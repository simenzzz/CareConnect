import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (no runtime CDN). Fraunces opsz axis powers the soft display serif.
import '@fontsource-variable/fraunces/index.css'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/hanken-grotesk/index.css'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
