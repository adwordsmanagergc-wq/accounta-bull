import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter-tight'
import './styles/tokens.css'
import './index.css'

// HashRouter (URLs like /accountabull-web/#/today) means GitHub Pages never
// 404s on a refresh or deep link, the server only ever serves index.html.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
