// Page de détails — route dédiée /ressources/:id (Module 1, obligatoire en binôme).
// Charge l'œuvre depuis Open Library, affiche description et sujets,
// permet d'ajouter aux favoris et de suivre sa progression de lecture.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, Check, ExternalLink, Heart, UserRound } from 'lucide-react'
import { getBookDetails, getCategory, getOpenLibraryUrl, toErrorMessage } from '../services/openLibraryApi.js'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import useFavorites from '../hooks/useFavorites.js'
import { Cover } from '../components/ResourceCard.jsx'
import { ErrorNotice, Loader } from '../components/Feedback.jsx'
import { ProgressRing } from '../components/Motion.jsx'

const STEPS = [0, 25, 50, 75, 100]

export default function ResourceDetails() {
  const { id } = useParams() // ":id" de l'URL /ressources/:id
  const navigate = useNavigate()
  const { state, dispatch, getResource } = useStore()
  const { isFavorite, toggleFavorite } = useFavorites()
  const toast = useToast()

  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Recharge les détails à chaque changement d'id dans l'URL
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getBookDetails(id, controller.signal)
      .then((data) => setBook(data))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(toErrorMessage(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id, reloadKey])

  const back = (
    <button type="button" className="back-link" onClick={() => navigate(-1)}>
      <ArrowLeft size={16} /> Retour
    </button>
  )

  if (loading) {
    return (
      <div className="details-page">
        {back}
        <Loader label="Chargement de la ressource…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="details-page">
        {back}
        <ErrorNotice title="Ressource indisponible" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    )
  }

  // Ressource « résumée » (celle qu'on stocke en favori), complétée par le cache local
  const cached = getResource(id)
  const resource = {
    id,
    title: book.title,
    author: book.author,
    coverId: book.coverId ?? cached?.coverId ?? null,
    year: book.year ?? cached?.year ?? null,
    categoryId: cached?.categoryId ?? null,
  }
  const favorite = isFavorite(id)
  const progress = state.progress[id] ?? 0
  const category = getCategory(resource.categoryId)

  const setProgress = (value) => {
    dispatch({ type: 'progress/set', resource, value })
    if (value === 100) toast('Bravo ! Lecture terminée 🎉')
  }

  return (
    <motion.article className="details-page" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
      {back}

      <div className="details">
        <motion.div className="details__cover" variants={item}>
          <Cover resource={resource} large />
        </motion.div>

        <div className="details__info">
          <motion.span className="eyebrow" variants={item}>
            {category ? category.label : 'Open Library'} · {id}
          </motion.span>
          <motion.h1 className="details__title display" variants={item}>
            {book.title}
          </motion.h1>

          <motion.div className="drawer__facts" variants={item}>
            <span>
              <UserRound size={15} /> {book.author}
            </span>
            {resource.year && (
              <span>
                <CalendarDays size={15} /> {resource.year}
              </span>
            )}
          </motion.div>

          <motion.div className="row details__actions" variants={item}>
            <button type="button" className={`btn ${favorite ? 'btn--danger' : 'btn--primary'}`} onClick={() => toggleFavorite(resource)} aria-pressed={favorite}>
              <Heart size={16} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>
            <a className="btn" href={getOpenLibraryUrl(id)} target="_blank" rel="noreferrer noopener">
              Voir sur Open Library <ExternalLink size={15} />
            </a>
          </motion.div>

          <motion.section className="drawer__progress glass" variants={item}>
            <ProgressRing value={progress} size={96} stroke={8} label="lu" />
            <div className="drawer__progress-ctrl">
              <label className="field__label" htmlFor="progress-range">
                Ma progression de lecture
              </label>
              <input
                id="progress-range"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="range"
                style={{ '--p': `${progress}%` }}
              />
              <div className="row">
                {STEPS.map((v) => (
                  <button key={v} type="button" className={`btn btn--sm ${progress === v ? 'btn--primary' : ''}`} onClick={() => setProgress(v)}>
                    {v === 100 ? (
                      <>
                        <Check size={13} /> Terminé
                      </>
                    ) : (
                      `${v} %`
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section variants={item}>
            <h2 className="drawer__h3">Description</h2>
            <p className="details__desc">{book.description ?? 'Aucune description n’est disponible pour cet ouvrage sur Open Library.'}</p>
          </motion.section>

          {book.subjects.length > 0 && (
            <motion.section variants={item}>
              <h2 className="drawer__h3">Sujets</h2>
              <div className="row">
                {book.subjects.map((s) => (
                  <span key={s} className="tag tag--accent">
                    {s}
                  </span>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </motion.article>
  )
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
