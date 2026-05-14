import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { ProjectStoreProvider } from './data/projectStore.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectStoreProvider>
          <App />
        </ProjectStoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
