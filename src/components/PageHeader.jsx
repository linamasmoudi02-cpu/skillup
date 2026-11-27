/* eslint-disable react-refresh/only-export-components */
// En-tête éditorial commun à toutes les pages.
import { motion } from 'framer-motion'
import { EASE } from './Motion.jsx'

export default function PageHeader({ eyebrow, title, accent, children, actions }) {
  return (
    <header className="page-head">
      <div>
        <motion.span className="eyebrow" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          {eyebrow}
        </motion.span>
        <h1 className="page-head__title display">
          <SplitWords text={title} />{' '}
          {accent && (
            <motion.span className="serif gradient-text" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.9, ease: EASE }}>
              {accent}
            </motion.span>
          )}
        </h1>
        {children && (
          <motion.p className="page-head__lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.8 }}>
            {children}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div className="page-head__actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
          {actions}
        </motion.div>
      )}
    </header>
  )
}

/** Révèle un titre mot par mot (masque + glissement). */
export function SplitWords({ text, delay = 0 }) {
  return text.split(' ').map((w, i) => (
    <span className="split" key={`${w}-${i}`}>
      <motion.span
        className="split__inner"
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ delay: delay + i * 0.06, duration: 0.9, ease: EASE }}
      >
        {w}
      </motion.span>
      {i < text.split(' ').length - 1 ? ' ' : ''}
    </span>
  ))
}
