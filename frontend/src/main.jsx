import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './Tailwind.css'
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider><App /></LanguageProvider>
  </StrictMode>,
)
