// Page 3 — Favoris : collection personnelle, collections, notes,
// réorganisation par glisser-déposer (ou flèches), suppression avec annulation.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion'
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Heart, Library, NotebookPen, Trash2 } from 'lucide-react'
import { getCategory, getOpenLibraryUrl } from '../services/openLibraryApi.js'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { Cover } from '../components/ResourceCard.jsx'
import { Counter, MotionLink, Magnetic } from '../components/Motion.jsx'
import { timeAgo } from '../utils/date.js'

const COLLECTIONS = ['À voir', 'En cours', 'Terminé']

const SORTS = {
  manual: 'Ordre personnalisé',
  recent: 'Ajout récent',
  title: 'Titre A → Z',
  progress: 'Progression',
}

export default function Favorites() {
  const { state, dispatch, getResource } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const open = (id) => navigate(`/ressources/${id}`)
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('manual')

  const favorites = state.favorites.filter((f) => getResource(f.id))
  const canReorder = tab === 'all' && sort === 'manual'

  const list = useMemo(() => {
    let l = tab === 'all' ? favorites : favorites.filter((f) => f.collection === tab)
    if (sort === 'recent') l = [...l].sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    if (sort === 'title') l = [...l].sort((a, b) => getResource(a.id).title.localeCompare(getResource(b.id).title, 'fr'))
    if (sort === 'progress') l = [...l].sort((a, b) => (state.progress[b.id] ?? 0) - (state.progress[a.id] ?? 0))
    return l
  }, [favorites, tab, sort, state.progress, getResource])

  const finished = favorites.filter((f) => (state.progress[f.id] ?? 0) >= 100).length
  const avg = favorites.length ? Math.round(favorites.reduce((a, f) => a + (state.progress[f.id] ?? 0), 0) / favorites.length) : 0

  const remove = (fav) => {
    const index = state.favorites.findIndex((f) => f.id === fav.id)
    dispatch({ type: 'fav/toggle', resource: getResource(fav.id) })
    toast(`« ${getResource(fav.id).title} » retiré`, {
      action: { label: 'Annuler', onClick: () => dispatch({ type: 'fav/restore', item: fav, index }) },
    })
  }

  // Échange immuable de deux éléments voisins (aucune mutation du tableau existant)
  const move = (id, dir) => {
    const list = state.favorites
    const i = list.findIndex((f) => f.id === id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    dispatch({ type: 'fav/reorder', list: list.map((f, k) => (k === i ? list[j] : k === j ? list[i] : f)) })
  }

  return (
    <>
      <PageHeader eyebrow="03 — Collection" title="Vos" accent="favoris.">
        Votre bibliothèque personnelle. Classez chaque ressource dans une collection, ajoutez vos notes et réorganisez l'ordre par glisser-déposer.
      </PageHeader>

      {favorites.length === 0 ? (
        <div className="empty glass">
          <div className="empty__icon">
            <Heart size={28} />
          </div>
          <h3>Aucun favori pour l'instant</h3>
          <p>Touchez le cœur d'une ressource pour la retrouver ici, organisée comme vous le souhaitez.</p>
          <Magnetic as={MotionLink} to="/ressources" className="btn btn--primary">
            <Library size={16} /> Explorer les ressources
          </Magnetic>
        </div>
      ) : (
        <>
          <section className="fav-stats">
            <div className="fav-stat glass">
              <span className="eyebrow">Favoris</span>
              <strong>
                <Counter value={favorites.length} />
              </strong>
            </div>
            <div className="fav-stat glass">
              <span className="eyebrow">Lectures terminées</span>
              <strong>
                <Counter value={finished} />
              </strong>
            </div>
            <div className="fav-stat glass">
              <span className="eyebrow">Progression moyenne</span>
              <strong>
                <Counter value={avg} suffix=" %" />
              </strong>
            </div>
          </section>

          <div className="fav-controls">
            <div className="chips" role="tablist" aria-label="Collections">
              {['all', ...COLLECTIONS].map((c) => {
                const count = c === 'all' ? favorites.length : favorites.filter((f) => f.collection === c).length
                return (
                  <button key={c} role="tab" aria-selected={tab === c} className={`chip ${tab === c ? 'is-active' : ''}`} onClick={() => setTab(c)}>
                    {tab === c && <motion.span layoutId="fav-pill" className="chip__bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span>{c === 'all' ? 'Toutes' : c}</span>
                    <span className="chip__count">{count}</span>
                  </button>
                )
              })}
            </div>
            <label className="fav-sort">
              <span className="sr-only">Trier</span>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!canReorder && <p className="hint mono">Astuce : choisissez « Toutes » + « Ordre personnalisé » pour réorganiser par glisser-déposer.</p>}

          {list.length === 0 ? (
            <div className="empty glass">
              <h3>Collection vide</h3>
              <p>Aucune ressource dans « {tab} ». Changez la collection d'un favori depuis l'onglet « Toutes ».</p>
            </div>
          ) : canReorder ? (
            <Reorder.Group axis="y" values={state.favorites} onReorder={(l) => dispatch({ type: 'fav/reorder', list: l })} className="fav-list">
              <AnimatePresence initial={false}>
                {state.favorites.map((fav, i) => (
                  <FavoriteRow key={fav.id} fav={fav} resource={getResource(fav.id)} progress={state.progress[fav.id] ?? 0} index={i} total={state.favorites.length} reorderable onOpen={open} onRemove={remove} onMove={move} />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            <motion.ul layout className="fav-list">
              <AnimatePresence initial={false}>
                {list.map((fav, i) => (
                  <FavoriteRow key={fav.id} fav={fav} resource={getResource(fav.id)} progress={state.progress[fav.id] ?? 0} index={i} total={list.length} onOpen={open} onRemove={remove} />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </>
      )}

    </>
  )
}

// Une ligne de favori : les données (fav, resource, progress) et les actions arrivent par props
function FavoriteRow({ fav, resource: r, progress, index, total, reorderable = false, onOpen, onRemove, onMove }) {
  const { dispatch } = useStore()
  const controls = useDragControls()
  const [note, setNote] = useState(fav.note)
  const [editing, setEditing] = useState(false)

  const anim = {
    layout: 'position',
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -60, height: 0, marginBottom: 0, transition: { duration: 0.3 } },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  }

  const body = (
    <div className="fav glass glow-border">
      {reorderable && (
        <div className="fav__handle">
          <button className="fav__grip" onPointerDown={(e) => controls.start(e)} aria-label="Glisser pour réorganiser" title="Glisser pour réorganiser">
            <GripVertical size={18} />
          </button>
          <button className="icon-btn icon-btn--sm" onClick={() => onMove(fav.id, -1)} disabled={index === 0} aria-label="Monter">
            <ArrowUp size={14} />
          </button>
          <button className="icon-btn icon-btn--sm" onClick={() => onMove(fav.id, 1)} disabled={index === total - 1} aria-label="Descendre">
            <ArrowDown size={14} />
          </button>
        </div>
      )}

      <button className="fav__cover" onClick={() => onOpen(fav.id)} aria-label={`Détails : ${r.title}`}>
        <Cover resource={r} />
      </button>

      <div className="fav__main">
        <div className="fav__top">
          <span className="eyebrow">{getCategory(r.categoryId)?.label ?? 'Livre'}</span>
          <span className="mono muted fav__added">ajouté {timeAgo(fav.addedAt)}</span>
        </div>
        <button className="fav__title" onClick={() => onOpen(fav.id)}>
          {r.title}
        </button>
        <p className="muted fav__provider">
          {r.author}
          {r.year ? ` · ${r.year}` : ''}
        </p>

        <div className="fav__progress">
          <span className="bar">
            <motion.span initial={false} animate={{ scaleX: progress / 100 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
          </span>
          <span className="mono">{progress}%</span>
        </div>

        {editing ? (
          <textarea
            className="textarea fav__note-input"
            value={note}
            autoFocus
            maxLength={240}
            placeholder="Votre note personnelle…"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              dispatch({ type: 'fav/update', id: fav.id, patch: { note: note.trim() } })
              setEditing(false)
            }}
            onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          />
        ) : (
          <button className={`fav__note ${fav.note ? '' : 'is-empty'}`} onClick={() => setEditing(true)}>
            <NotebookPen size={14} /> {fav.note || 'Ajouter une note'}
          </button>
        )}
      </div>

      <div className="fav__side">
        <div className="seg" role="radiogroup" aria-label="Collection">
          {COLLECTIONS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={fav.collection === c}
              className={`seg__btn ${fav.collection === c ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'fav/update', id: fav.id, patch: { collection: c } })}
            >
              {fav.collection === c && <motion.span layoutId={`seg-${fav.id}`} className="seg__bg" />}
              <span>{c}</span>
            </button>
          ))}
        </div>
        <div className="row fav__actions">
          <a className="icon-btn icon-btn--sm" href={getOpenLibraryUrl(r.id)} target="_blank" rel="noreferrer noopener" aria-label="Voir sur Open Library" title="Voir sur Open Library">
            <ExternalLink size={15} />
          </a>
          <button className="icon-btn icon-btn--sm fav__remove" onClick={() => onRemove(fav)} aria-label="Retirer des favoris" title="Retirer des favoris">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return reorderable ? (
    <Reorder.Item value={fav} dragListener={false} dragControls={controls} className="fav-item" {...anim} whileDrag={{ scale: 1.01, zIndex: 5, boxShadow: '0 24px 50px -24px rgba(38,51,45,.35)' }}>
      {body}
    </Reorder.Item>
  ) : (
    <motion.li className="fav-item" {...anim}>
      {body}
    </motion.li>
  )
}

