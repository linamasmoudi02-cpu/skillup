/* eslint-disable react-refresh/only-export-components */
// Primitives d'animation réutilisables : apparition au scroll, carte 3D tilt,
// bouton magnétique, compteur animé et anneau de progression.
import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'

export const EASE = [0.16, 1, 0.3, 1]

/** Lien du routeur animable (pour Magnetic as={MotionLink}). */
export const MotionLink = motion.create(Link)

/** Conteneur dont les enfants <Reveal> apparaissent en cascade. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
export const rise = {
  hidden: { opacity: 0, y: 26, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
}

/** Apparition déclenchée au défilement. */
export function Reveal({ as = 'div', children, delay = 0, y = 26, className, ...rest }) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.85, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/** Carte qui s'incline en 3D vers le curseur, avec reflet lumineux. */
export const TiltCard = forwardRef(function TiltCard({ children, className = '', max = 9, glare = true, style, ...rest }, outerRef) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 220, damping: 20 })
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 220, damping: 20 })
  const gx = useTransform(mx, (v) => `${v * 100}%`)
  const gy = useTransform(my, (v) => `${v * 100}%`)
  const background = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, var(--glow), transparent 45%)`

  const onMove = (e) => {
    if (e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <motion.div
      ref={outerRef}
      className={`tilt ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, ...style }}
      {...rest}
    >
      {glare && <motion.div className="tilt__glare" style={{ background }} aria-hidden="true" />}
      {children}
    </motion.div>
  )
})

/** Bouton attiré par le curseur (effet magnétique). */
export const Magnetic = forwardRef(function Magnetic({ as = 'button', strength = 0.35, className = '', children, ...rest }, ref) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 })
  const Comp = typeof as === 'string' ? motion[as] : as

  return (
    <Comp
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
      whileTap={{ scale: 0.95 }}
      {...rest}
    >
      {children}
    </Comp>
  )
})

/** Nombre qui compte jusqu'à sa valeur quand il devient visible. */
export function Counter({ value, duration = 1.4, suffix = '', decimals = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    })
    from.current = value
    return () => controls.stop()
  }, [inView, value, duration])

  return (
    <span ref={ref} className="counter">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}

/** Anneau de progression SVG animé. */
export function ProgressRing({ value = 0, size = 120, stroke = 9, label, sublabel, tone = 'accent', children }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const id = `ring${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div ref={ref} className={`ring ring--${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ring-a)" />
            <stop offset="100%" stopColor="var(--ring-b)" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <motion.circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={`url(#${id})`}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: inView ? c - (c * Math.min(100, value)) / 100 : c }}
          transition={{ duration: 1.6, ease: EASE }}
        />
      </svg>
      <div className="ring__center">
        {children ?? (
          <>
            <strong className="ring__value">
              <Counter value={value} suffix="%" />
            </strong>
            {label && <span className="ring__label">{label}</span>}
            {sublabel && <span className="ring__sub">{sublabel}</span>}
          </>
        )}
      </div>
    </div>
  )
}
