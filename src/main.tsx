import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import LeaguePage from './pages/LeaguePage'
import GamePage from './pages/GamePage'
import JoinPage from './pages/JoinPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/league/:id" element={<LeaguePage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/join/:code" element={<JoinPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
