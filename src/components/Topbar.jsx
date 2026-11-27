// Barre supérieure : titre de page, recherche (palette ⌘K), thème et menu profil.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Command, RotateCcw, Search, Target, UserRound } from 'lucide-react'
import { navFor } from '../data/nav.js'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { LogoMark } from './Logo.jsx'
import { MONTHS } from '../utils/date.js'

export default function Topbar({ onOpenPalette }) {
  const { pathname } = useLocation()
  const page = navFor(pathname)
  const now = new Date()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="topbar">
      <span className="topbar__mobile-logo">
        <LogoMark size={32} />
      </span>
      <div className="topbar__title">
        <AnimatePresence mode="wait">
          <motion.div
            key={page.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <span className="eyebrow">
              {page.index} — {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
            </span>
            <strong className="topbar__page">{page.title}</strong>
          </motion.div>
        </AnimatePresence>
      </div>

      <button className="topbar__search" onClick={onOpenPalette} aria-label="Ouvrir la recherche rapide">
        <Search size={16} />
        <span>Rechercher, naviguer, agir…</span>
        <kbd className="mono">
          {isMac ? <Command size={11} /> : 'Ctrl'} K
        </kbd>
      </button>
      <button className="icon-btn topbar__search-icon" onClick={onOpenPalette} aria-label="Ouvrir la recherche rapide">
        <Search size={18} />
      </button>

      <ThemeToggle />
      <ProfileMenu />
      <RouteProgress key={pathname} />
    </header>
  )
}

/** Fine ligne lumineuse qui balaie la barre à chaque changement de page. */
function RouteProgress() {
  return (
    <motion.span
      className="route-progress"
      initial={{ scaleX: 0, opacity: 1 }}
      animate={{ scaleX: 1, opacity: 0 }}
      transition={{ scaleX: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }, opacity: { delay: 0.5, duration: 0.4 } }}
    />
  )
}

function ProfileMenu() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(state.user.name)
  const [goal, setGoal] = useState(state.user.weeklyGoal)
  const [confirmReset, setConfirmReset] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const openMenu = () => {
    setName(state.user.name)
    setGoal(state.user.weeklyGoal)
    setConfirmReset(false)
    setOpen((o) => !o)
  }

  const save = (e) => {
    e.preventDefault()
    const clean = name.trim() || 'Étudiant·e'
    dispatch({ type: 'user/update', patch: { name: clean, weeklyGoal: Math.max(30, Math.min(3000, Number(goal) || 300)) } })
    toast('Profil mis à jour')
    setOpen(false)
  }

  return (
    <div className="profile" ref={ref}>
      <button className="profile__btn" onClick={openMenu} aria-expanded={open} aria-label="Ouvrir le profil">
        <span className="profile__avatar">{state.user.name.charAt(0).toUpperCase()}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.form
            className="popover profile__menu"
            onSubmit={save}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <span className="eyebrow">Votre profil</span>
            <label className="field">
              <span className="field__label">
                <UserRound size={14} /> Prénom
              </span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
            </label>
            <label className="field">
              <span className="field__label">
                <Target size={14} /> Objectif hebdomadaire (minutes)
              </span>
              <input className="input" type="number" min={30} max={3000} step={10} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <button className="btn btn--primary btn--block" type="submit">
              Enregistrer
            </button>
            <div className="profile__danger">
              {confirmReset ? (
                <>
                  <span className="muted">Effacer toutes vos données locales ?</span>
                  <div className="row">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(false)}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => {
                        dispatch({ type: 'reset' })
                        toast('Données réinitialisées (démo restaurée)', { tone: 'info' })
                        setOpen(false)
                      }}
                    >
                      Réinitialiser
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="link-btn" onClick={() => setConfirmReset(true)}>
                  <RotateCcw size={14} /> Réinitialiser les données
                </button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
