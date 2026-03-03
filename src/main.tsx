import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import LeaguePage from './pages/LeaguePage'
import GamePage from './pages/GamePage'
import JoinPage from './pages/JoinPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import SetNameModal from './components/SetNameModal'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/league/:code" element={<LeaguePage />} />
          <Route path="/league/:code/game/:id" element={<GamePage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
        <SetNameModal />
      </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
