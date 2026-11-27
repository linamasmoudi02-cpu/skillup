// Page 2 — Ressources : catalogue chargé depuis l'API Open Library.
// Recherche par mot-clé (formulaire contrôlé), filtre par catégorie, tri, statut,
// états de chargement / erreur / résultat vide.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { CATEGORIES, searchBooks, toErrorMessage } from '../services/openLibraryApi.js'
import { useStore } from '../context/StoreContext.jsx'
import useFavorites from '../hooks/useFavorites.js'
import PageHeader from '../components/PageHeader.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import { ErrorNotice, Loader } from '../components/Feedback.jsx'

const SORTS = {
  relevance: 'Pertinence',
  recent: 'Plus récents',
  oldest: 'Plus anciens',
  editions: 'Les plus édités',
  title: 'Titre A → Z',
}

export default function Resources() {
  const { state } = useStore()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [params] = useSearchParams()

  // Formulaire contrôlé : "query" suit la saisie, "searchTerm" déclenche l'appel réseau
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [searchTerm, setSearchTerm] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('relevance')
  const [status, setStatus] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // État de la requête
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Recherche « au fil de la frappe » : on attend 450 ms après la dernière touche
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(query), 450)
    return () => clearTimeout(id)
  }, [query])

  // Appel à l'API à chaque changement de mot-clé ou de catégorie
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    searchBooks(searchTerm, category, controller.signal)
      .then((list) => setBooks(list))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(toErrorMessage(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    // Annule la requête précédente si l'utilisateur change de critère entre-temps
    return () => controller.abort()
  }, [searchTerm, category, reloadKey])

  // Filtres et tri appliqués côté client sur les résultats reçus
  const results = useMemo(() => {
    const filtered = books.filter((r) => {
      const p = state.progress[r.id] ?? 0
      if (onlyFav && !isFavorite(r.id)) return false
      if (status === 'todo' && p > 0) return false
      if (status === 'doing' && !(p > 0 && p < 100)) return false
      if (status === 'done' && p < 100) return false
      return true
    })
    const sorters = {
      relevance: () => 0,
      recent: (a, b) => (b.year ?? 0) - (a.year ?? 0),
      oldest: (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
      editions: (a, b) => (b.editions ?? 0) - (a.editions ?? 0),
      title: (a, b) => a.title.localeCompare(b.title, 'fr'),
    }
    return [...filtered].sort(sorters[sort])
  }, [books, sort, status, onlyFav, state.progress, isFavorite])

  const activeFilters = [status, onlyFav, category, searchTerm].filter(Boolean).length + (sort !== 'relevance' ? 1 : 0)

  const submit = (e) => {
    e.preventDefault()
    setSearchTerm(query) // recherche immédiate avec la touche Entrée
  }

  const reset = () => {
    setQuery('')
    setSearchTerm('')
    setCategory('')
    setStatus('')
    setOnlyFav(false)
    setSort('relevance')
  }

  return (
    <>
      <PageHeader eyebrow="02 — Bibliothèque" title="Ressources" accent="choisies.">
        Des milliers de livres d'informatique et de sciences issus de la bibliothèque ouverte Open Library. Recherchez, filtrez et suivez votre lecture.
      </PageHeader>

      <form className="toolbar glass" onSubmit={submit} role="search">
        <div className="search">
          <Search size={18} className="search__icon" />
          <input
            className="search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : React, SQL, algèbre, Python…"
            aria-label="Rechercher une ressource"
          />
          {query && (
            <button type="button" className="search__clear" onClick={() => setQuery('')} aria-label="Effacer la recherche">
              <X size={16} />
            </button>
          )}
        </div>
        <button type="button" className={`btn toolbar__toggle ${showFilters ? 'is-open' : ''}`} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal size={16} /> Filtres {activeFilters > 0 && <span className="mono toolbar__count">{activeFilters}</span>}
        </button>

        <div className={`toolbar__filters ${showFilters ? 'is-open' : ''}`}>
          <label className="field">
            <span className="field__label">Catégorie</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Ma lecture</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous</option>
              <option value="todo">Pas commencé</option>
              <option value="doing">En cours</option>
              <option value="done">Terminé</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Trier par</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={`btn toolbar__fav ${onlyFav ? 'is-on' : ''}`} onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}>
            <Heart size={15} fill={onlyFav ? 'currentColor' : 'none'} /> Favoris
          </button>
        </div>
      </form>

      <div className="chips" role="tablist" aria-label="Catégories">
        {[{ id: '', label: 'Tout' }, ...CATEGORIES].map((c) => (
          <button key={c.id || 'all'} type="button" role="tab" aria-selected={category === c.id} className={`chip ${category === c.id ? 'is-active' : ''}`} onClick={() => setCategory(c.id)}>
            {category === c.id && <motion.span layoutId="cat-pill" className="chip__bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="results-bar">
        <p className="mono muted">
          {loading ? 'Recherche en cours…' : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
          {!loading && searchTerm && <> pour « {searchTerm} »</>}
        </p>
        {activeFilters > 0 && (
          <button type="button" className="link-btn" onClick={reset}>
            <RotateCcw size={14} /> Réinitialiser les filtres
          </button>
        )}
      </div>

      {loading ? (
        <Loader label="Chargement des ressources depuis Open Library…" />
      ) : error ? (
        <ErrorNotice title="Impossible de charger les ressources" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : results.length === 0 ? (
        <div className="empty glass">
          <div className="empty__icon">
            <Search size={28} />
          </div>
          <h3>Aucune ressource trouvée</h3>
          <p>Aucun résultat ne correspond à vos critères. Essayez un autre mot-clé ou retirez quelques filtres.</p>
          <button type="button" className="btn btn--primary" onClick={reset}>
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        <motion.div layout className="rgrid">
          <AnimatePresence mode="popLayout">
            {results.map((r, i) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <ResourceCard resource={r} progress={state.progress[r.id] ?? 0} isFavorite={isFavorite(r.id)} onToggleFavorite={toggleFavorite} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  )
}
