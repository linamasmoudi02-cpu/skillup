// Rail de navigation vitré (bureau / tablette) + barre d'onglets (mobile).
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NAV } from '../data/nav.js'
import { useStore } from '../context/StoreContext.jsx'
import Logo, { LogoMark } from './Logo.jsx'
import { ProgressRing } from './Motion.jsx'

function useBadges() {
  const { state, stats } = useStore()
  return {
    '/favoris': state.favorites.length,
    '/revisions': stats.overdue + stats.dueToday,
  }
}

export function Sidebar() {
  const { state, stats } = useStore()
  const badges = useBadges()

  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <NavLink to="/" className="sidebar__brand" aria-label="SkillUp — accueil">
        <span className="sidebar__logo-full">
          <Logo />
        </span>
        <span className="sidebar__logo-mark">
          <LogoMark />
        </span>
      </NavLink>

      <nav className="sidebar__nav">
        {NAV.map(({ to, label, icon: Icon, index }) => (
          <NavLink key={to} to={to} end={to === '/'} className="sidebar__link" title={label}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="sidebar__active"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="sidebar__icon">
                  <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span className="sidebar__label">{label}</span>
                <span className="sidebar__index mono">{index}</span>
                {badges[to] > 0 && <span className="sidebar__badge mono">{badges[to]}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__goal">
        <ProgressRing value={stats.goalRate} size={64} stroke={6}>
          <span className="mono sidebar__goal-pct">{stats.goalRate}%</span>
        </ProgressRing>
        <div className="sidebar__goal-text">
          <span className="eyebrow">Objectif hebdo</span>
          <strong>
            {stats.weekMinutes} / {state.user.weeklyGoal} min
          </strong>
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const badges = useBadges()
  return (
    <nav className="mobile-nav" aria-label="Navigation mobile">
      {NAV.map(({ to, short, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="mobile-nav__link">
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span layoutId="mobile-active" className="mobile-nav__active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <span className="mobile-nav__icon">
                <Icon size={20} />
                {badges[to] > 0 && <span className="mobile-nav__dot" />}
              </span>
              <span className="mobile-nav__label">{short}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
