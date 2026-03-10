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
import PlayerProfilePage from './pages/PlayerProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import DemoLeaguePage from './pages/DemoLeaguePage'
import FeaturesPage from './pages/FeaturesPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/league/:code" element={<ProtectedRoute><LeaguePage /></ProtectedRoute>} />
          <Route path="/league/:code/game/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="/game/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="/profile/setup" element={<ProtectedRoute><PlayerProfilePage /></ProtectedRoute>} />
          <Route path="/demo" element={<DemoLeaguePage />} />
          <Route path="/features" element={<FeaturesPage />} />
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
