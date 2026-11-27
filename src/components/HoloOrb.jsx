// Orbe holographique 3D (CSS 3D + Framer Motion).
// Trois anneaux en gyroscope tournent autour d'un noyau lumineux ;
// la scène s'incline vers le curseur. Réutilisé pour l'accueil et l'assistant.
import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

export default function HoloOrb({ size = 340, state = 'idle', interactive = true, children, className = '' }) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 16 })
  const sy = useSpring(py, { stiffness: 60, damping: 16 })
  const rotateY = useTransform(sx, [-1, 1], [-22, 22])
  const rotateX = useTransform(sy, [-1, 1], [18, -18])

  useEffect(() => {
    if (!interactive) return
    const onMove = (e) => {
      px.set((e.clientX / window.innerWidth) * 2 - 1)
      py.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [interactive, px, py])

  return (
    <div className={`orb orb--${state} ${className}`} style={{ '--size': `${size}px` }} aria-hidden={!children}>
      <div className="orb__halo" />
      <motion.div className="orb__scene" style={{ rotateX, rotateY }}>
        <div className="orb__ring orb__ring--1">
          <span className="orb__node" style={{ '--a': '0deg' }} />
          <span className="orb__node orb__node--sm" style={{ '--a': '140deg' }} />
        </div>
        <div className="orb__ring orb__ring--2">
          <span className="orb__node orb__node--cyan" style={{ '--a': '60deg' }} />
        </div>
        <div className="orb__ring orb__ring--3">
          <span className="orb__node orb__node--sm" style={{ '--a': '220deg' }} />
          <span className="orb__node orb__node--cyan" style={{ '--a': '300deg' }} />
        </div>
        <div className="orb__ring orb__ring--dash" />
      </motion.div>
      <div className="orb__core">
        <div className="orb__shine" />
        <div className="orb__scan" />
      </div>
      {children && <div className="orb__content">{children}</div>}
    </div>
  )
}
