// Logo SkillUp : un signal ascendant qui se termine par un nœud lumineux.
import { useId } from 'react'
import { motion } from 'framer-motion'

export function LogoMark({ size = 36, animated = false }) {
  const gid = `logo-g${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const draw = animated
    ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 1.2, ease: [0.65, 0, 0.35, 1] } }
    : {}
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="logo-mark" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--electric)" />
          <stop offset="1" stopColor="var(--cyan)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="12" className="logo-mark__bg" />
      <motion.path
        d="M9 27 L17 18 L23 23 L31 12"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw}
      />
      <circle cx="31" cy="12" r="3.4" fill="var(--cyan)" className="logo-mark__node" />
    </svg>
  )
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo__word">
        Skill<span className="serif">up</span>
      </span>
    </span>
  )
}
