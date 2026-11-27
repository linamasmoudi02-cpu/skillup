// Écran de chargement d'ouverture : le logo se dessine, un compteur monte à 100.
// Affiché une seule fois par session d'onglet.
import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { LogoMark } from './Logo.jsx'

export default function BootLoader({ onDone }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const controls = animate(0, 100, {
      duration: 1.5,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setPct(Math.round(v)),
      onComplete: () => setTimeout(onDone, 180),
    })
    return () => controls.stop()
  }, [onDone])

  return (
    <motion.div
      className="boot"
      exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] } }}
      initial={{ clipPath: 'inset(0 0 0% 0)' }}
    >
      <div className="boot__center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
          <LogoMark size={72} animated />
        </motion.div>
        <motion.p className="boot__word" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
          Skill<span className="serif">up</span>
        </motion.p>
        <div className="boot__bar">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <p className="boot__pct mono">
          {String(pct).padStart(3, '0')} <span className="muted">/ initialisation de votre espace</span>
        </p>
      </div>
    </motion.div>
  )
}
