import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { ErrorBoundary } from './App.jsx'
import './index.css'
import { AppProvider } from './context/AppContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
