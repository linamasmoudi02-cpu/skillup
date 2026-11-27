// États d'interface réutilisables : chargement (spinner) et erreur (avec « Réessayer »).
import { AlertTriangle, RotateCcw } from 'lucide-react'

export function Loader({ label = 'Chargement…' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorNotice({ title = 'Une erreur est survenue', message, onRetry }) {
  return (
    <div className="error-notice" role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          <RotateCcw size={14} /> Réessayer
        </button>
      )}
    </div>
  )
}
