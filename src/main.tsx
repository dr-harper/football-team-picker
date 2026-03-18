import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import HomePage from './pages/HomePage'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import LeaguePage from './pages/LeaguePage'
import GamePage from './pages/GamePage'
import GameRedirect from './pages/GameRedirect'
import JoinPage from './pages/JoinPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import SetNameModal from './components/SetNameModal'
import PlayerProfilePage from './pages/PlayerProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import DemoLeaguePage from './pages/DemoLeaguePage'
import FeaturesPage from './pages/FeaturesPage'
import LeagueLayout from './components/LeagueLayout'
import { useAndroidBackButton } from './hooks/useAndroidBackButton'
import { initialiseNativeApp } from './utils/nativeSetup'

initialiseNativeApp();

function AndroidBackHandler({ children }: { children: React.ReactNode }) {
  useAndroidBackButton()
  return <>{children}</>
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/pick-teams" element={<App showBanner={false} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/league/:code" element={<ProtectedRoute><LeagueLayout /></ProtectedRoute>}>
            <Route index element={<LeaguePage />} />
            <Route path="game/:id" element={<GamePage />} />
          </Route>
          <Route path="/game/:id" element={<ProtectedRoute><GameRedirect /></ProtectedRoute>} />
          <Route path="/profile/setup" element={<ProtectedRoute><PlayerProfilePage /></ProtectedRoute>} />
          <Route path="/demo" element={<DemoLeaguePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AndroidBackHandler>
        <AnimatedRoutes />
        <SetNameModal />
      </AndroidBackHandler>
      </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
