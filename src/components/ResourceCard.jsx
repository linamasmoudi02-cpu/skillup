/* eslint-disable react-refresh/only-export-components */
// Carte de ressource (composant de présentation) : tout arrive par les props.
//   resource        { id, title, author, categoryId, coverId, year, editions }
//   progress        pourcentage de lecture (0–100)
//   isFavorite      la ressource est-elle dans les favoris ?
//   onToggleFavorite(resource)  callback fourni par la page parente
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, CalendarDays, Heart, Layers } from 'lucide-react'
import { getCategory, getCoverUrl } from '../services/openLibraryApi.js'
import { TiltCard } from './Motion.jsx'

/** Couverture : l'image Open Library, ou une reliure dessinée si elle est absente. */
export function Cover({ resource, large = false }) {
  const [failed, setFailed] = useState(false)
  const cat = getCategory(resource.categoryId)
  const src = getCoverUrl(resource.coverId, large ? 'L' : 'M')
  const seed = [...resource.id].reduce((a, c) => a + c.charCodeAt(0), 0)
  const hue = cat?.hue ?? 175 + (seed % 90)
  const showImage = src && !failed

  return (
    <div className={`cover ${large ? 'cover--large' : ''} ${showImage ? 'has-image' : ''}`} style={{ '--h': hue }}>
      <div className="cover__mesh" />
      {showImage ? (
        <img className="cover__img" src={src} alt={`Couverture de ${resource.title}`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <>
          <div className="cover__rings">
            <span />
            <span />
            <span />
          </div>
          <span className="cover__index serif">{resource.title.charAt(0)}</span>
          <span className="cover__format">
            <BookOpen size={14} /> Livre
          </span>
        </>
      )}
      {cat && <span className="cover__cat mono">{cat.label}</span>}
    </div>
  )
}

/** Bouton cœur : contrôlé par le parent (active + onToggle). */
export function FavoriteButton({ active, onToggle, size = 'md' }) {
  return (
    <motion.button
      type="button"
      className={`icon-btn fav-btn ${size === 'sm' ? 'icon-btn--sm' : ''} ${active ? 'is-on' : ''}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      whileTap={{ scale: 0.85 }}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <motion.span key={String(active)} initial={{ scale: active ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} style={{ display: 'grid' }}>
        <Heart size={size === 'sm' ? 15 : 17} fill={active ? 'currentColor' : 'none'} />
      </motion.span>
      {active && <span className="fav-btn__burst" />}
    </motion.button>
  )
}

export default function ResourceCard({ resource, progress = 0, isFavorite, onToggleFavorite }) {
  return (
    <TiltCard className="rcard glass glow-border" max={7}>
      <Link to={`/ressources/${resource.id}`} className="rcard__inner" aria-label={`Voir les détails : ${resource.title}`}>
        <Cover resource={resource} />
        <div className="rcard__body">
          <div className="rcard__meta">
            <span className="tag">{getCategory(resource.categoryId)?.label ?? 'Livre'}</span>
            {resource.year && (
              <span className="rcard__rating mono">
                <CalendarDays size={12} /> {resource.year}
              </span>
            )}
          </div>
          <h3 className="rcard__title">{resource.title}</h3>
          <p className="rcard__provider">{resource.author}</p>
          <div className="rcard__foot">
            {resource.editions ? (
              <span className="rcard__hours mono">
                <Layers size={13} /> {resource.editions} édition{resource.editions > 1 ? 's' : ''}
              </span>
            ) : (
              <span />
            )}
            {progress > 0 && (
              <span className="rcard__progress">
                <span className="bar">
                  <span style={{ transform: `scaleX(${progress / 100})` }} />
                </span>
                <span className="mono">{progress}%</span>
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="rcard__fav">
        <FavoriteButton active={isFavorite} onToggle={() => onToggleFavorite(resource)} size="sm" />
      </div>
    </TiltCard>
  )
}
