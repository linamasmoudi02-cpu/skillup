// Bascule clair / sombre avec révélation circulaire depuis le bouton
// (View Transitions API quand le navigateur la supporte).
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { useStore } from '../context/StoreContext.jsx'

export default function ThemeToggle({ className = '' }) {
  const { state, dispatch } = useStore()
  const next = state.theme === 'dark' ? 'light' : 'dark'

  const toggle = (e) => {
    const apply = () => {
      flushSync(() => dispatch({ type: 'theme/set', theme: next }))
      document.documentElement.dataset.theme = next
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce) return apply()

    const x = e.clientX || window.innerWidth - 40
    const y = e.clientY || 40
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const transition = document.startViewTransition(apply)
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  return (
    <button
      className={`icon-btn theme-toggle ${className}`}
      onClick={toggle}
      aria-label={`Passer en mode ${next === 'dark' ? 'sombre' : 'clair'}`}
      title={`Mode ${next === 'dark' ? 'sombre' : 'clair'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state.theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'grid' }}
        >
          {state.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
