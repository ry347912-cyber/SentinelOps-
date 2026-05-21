import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0a1220',
            color: '#e2e8f0',
            border: '1px solid rgba(0,212,255,0.2)',
            fontFamily: '"DM Sans", sans-serif',
          },
          success: {
            iconTheme: { primary: '#00e676', secondary: '#0a1220' },
          },
          error: {
            iconTheme: { primary: '#ff6b6b', secondary: '#0a1220' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
