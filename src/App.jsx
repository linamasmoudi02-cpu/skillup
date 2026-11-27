import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MobileNav, Sidebar } from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import ParticleField from './components/ParticleField.jsx'
import BootLoader from './components/BootLoader.jsx'
import Home from './pages/Home.jsx'
import Resources from './pages/Resources.jsx'
import Favorites from './pages/Favorites.jsx'
import Revisions from './pages/Revisions.jsx'
import ResourceDetails from './pages/ResourceDetails.jsx'
import Assistant from './pages/Assistant.jsx'
import NotFound from './pages/NotFound.jsx'

// Transition de page : flou + glissement + léger zoom
const pageMotion = {
  initial: { opacity: 0, y: 24, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, filter: 'blur(6px)', transition: { duration: 0.22, ease: [0.65, 0, 0.35, 1] } },
}

export default function App() {
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [booting, setBooting] = useState(() => !sessionStorage.getItem('skillup:booted'))

  const finishBoot = useCallback(() => {
    sessionStorage.setItem('skillup:booted', '1')
    setBooting(false)
  }, [])

  // Raccourci global Ctrl/⌘ + K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Retour en haut à chaque changement de page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <div className="backdrop__blob backdrop__blob--a" />
        <div className="backdrop__blob backdrop__blob--b" />
        <div className="backdrop__blob backdrop__blob--c" />
        <div className="backdrop__grid" />
        <div className="backdrop__noise" />
      </div>
      <ParticleField />

      <div className="shell">
        <Sidebar />
        <div className="shell__main">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} />
          <AnimatePresence mode="wait">
            <motion.main key={location.pathname} className="page" {...pageMotion}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/ressources" element={<Resources />} />
                <Route path="/favoris" element={<Favorites />} />
                <Route path="/ressources/:id" element={<ResourceDetails />} />
                <Route path="/revisions" element={<Revisions />} />
                {/* Ancienne adresse conservée : redirige vers /revisions */}
                <Route path="/planner" element={<Navigate to="/revisions" replace />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
      <MobileNav />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AnimatePresence>{booting && <BootLoader onDone={finishBoot} />}</AnimatePresence>
    </>
  )
}
