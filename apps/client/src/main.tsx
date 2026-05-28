import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import NetworkBootstrap from './components/NetworkBootstrap.tsx'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NetworkBootstrap>
      <App />
    </NetworkBootstrap>
  </React.StrictMode>,
)
