// Palette de commandes (Ctrl/⌘ + K) : naviguer, chercher une ressource, agir.
// Navigation clavier complète : ↑ ↓ pour choisir, Entrée pour valider, Échap pour fermer.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, CornerDownLeft, MoonStar, Plus, Search, Timer } from 'lucide-react'
import { NAV } from '../data/nav.js'
import { getCategory } from '../services/openLibraryApi.js'
import { useStore } from '../context/StoreContext.jsx'

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { state, dispatch, getResource } = useStore()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const items = useMemo(() => {
    const q = normalize(query.trim())
    const pages = NAV.map((n) => ({ id: `page-${n.to}`, group: 'Pages', icon: n.icon, label: n.label, hint: n.index, run: () => navigate(n.to) }))
    const actions = [
      { id: 'a-task', group: 'Actions', icon: Plus, label: 'Nouvelle tâche', hint: 'Révisions', run: () => navigate('/revisions?new=1') },
      { id: 'a-focus', group: 'Actions', icon: Timer, label: 'Démarrer une session focus', hint: 'Accueil', run: () => navigate('/?focus=1') },
      {
        id: 'a-theme',
        group: 'Actions',
        icon: MoonStar,
        label: state.theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre',
        hint: 'Thème',
        run: () => dispatch({ type: 'theme/set', theme: state.theme === 'dark' ? 'light' : 'dark' }),
      },
    ]
    // Livres déjà enregistrés (favoris) : accès direct à leur page de détails
    const resources = state.favorites
      .map((f) => getResource(f.id))
      .filter(Boolean)
      .map((r) => ({
        id: `r-${r.id}`,
        group: 'Mes favoris',
        icon: BookOpen,
        label: r.title,
        hint: getCategory(r.categoryId)?.label ?? 'Livre',
        search: `${r.title} ${r.author}`,
        run: () => navigate(`/ressources/${r.id}`),
      }))
    // Recherche dans tout le catalogue Open Library
    const searchCatalog = {
      id: 'a-search',
      group: 'Catalogue',
      icon: Search,
      label: `Rechercher « ${query.trim()} » dans les ressources`,
      hint: 'Open Library',
      run: () => navigate(`/ressources?q=${encodeURIComponent(query.trim())}`),
    }
    const all = [...pages, ...actions, ...resources]
    if (!q) return [...pages, ...actions, ...resources.slice(0, 4)]
    return [...all.filter((i) => normalize(i.search ?? i.label).includes(q)), searchCatalog]
  }, [query, navigate, dispatch, state.theme, state.favorites, getResource])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (item) => {
    if (!item) return
    item.run()
    onClose()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % Math.max(1, items.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + items.length) % Math.max(1, items.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(items[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = null

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay overlay--top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Recherche rapide"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -20, scale: 0.97, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="palette__input">
              <Search size={18} />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Rechercher une page, une ressource, une action…"
                aria-label="Recherche"
              />
              <kbd className="mono">Échap</kbd>
            </div>
            <div className="palette__list" ref={listRef}>
              {items.length === 0 && <p className="palette__empty">Aucun résultat pour « {query} »</p>}
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null
                lastGroup = item.group
                const Icon = item.icon
                return (
                  <div key={item.id}>
                    {header && <div className="palette__group eyebrow">{header}</div>}
                    <button
                      data-index={i}
                      className={`palette__item ${i === active ? 'is-active' : ''}`}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(item)}
                    >
                      <span className="palette__icon">
                        <Icon size={16} />
                      </span>
                      <span className="palette__label">{item.label}</span>
                      <span className="palette__hint mono">{item.hint}</span>
                      {i === active ? <CornerDownLeft size={14} className="palette__enter" /> : <ArrowRight size={14} className="palette__enter" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
