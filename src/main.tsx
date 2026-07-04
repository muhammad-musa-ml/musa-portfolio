import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installResizeObserverFallback } from './lib/resizeObserverFix'
import App from './App'
import './styles/global.css'
import './styles/sections.css'

// must run before React/R3F mount so the 3D canvas always gets a size
installResizeObserverFallback()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
