import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './ThemeContext.tsx'
import { installGlobalErrorHandlers } from './logging.ts'
import './styles/calendar.css'
import './styles/app.css'

// Install frontend logging (global error capture)
installGlobalErrorHandlers()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
