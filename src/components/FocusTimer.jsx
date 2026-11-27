// Minuteur Focus (Pomodoro) : chaque session terminée est enregistrée
// et alimente les statistiques de l'accueil et l'objectif hebdomadaire.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, RotateCcw, Square } from 'lucide-react'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const PRESETS = [15, 25, 50]

export default function FocusTimer({ autoStart = false }) {
  const { dispatch } = useStore()
  const toast = useToast()
  const [minutes, setMinutes] = useState(25)
  const [left, setLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const endAt = useRef(null)

  useEffect(() => {
    if (autoStart) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        setRunning(false)
        dispatch({ type: 'focus/log', minutes })
        toast(`Session de ${minutes} min terminée — bravo !`)
        setLeft(minutes * 60)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, minutes, dispatch, toast])

  // Titre de l'onglet = compte à rebours pendant la session
  useEffect(() => {
    if (!running) return
    const prev = document.title
    document.title = `${fmt(left)} · Focus — SkillUp`
    return () => {
      document.title = prev
    }
  }, [running, left])

  function start() {
    endAt.current = Date.now() + left * 1000
    setRunning(true)
  }

  const pause = () => setRunning(false)

  const reset = () => {
    setRunning(false)
    setLeft(minutes * 60)
  }

  const finishEarly = () => {
    const elapsed = Math.floor((minutes * 60 - left) / 60)
    setRunning(false)
    setLeft(minutes * 60)
    if (elapsed >= 1) {
      dispatch({ type: 'focus/log', minutes: elapsed })
      toast(`${elapsed} min de focus enregistrées`)
    } else {
      toast('Session trop courte pour être comptée (< 1 min)', { tone: 'info' })
    }
  }

  const choose = (m) => {
    setMinutes(m)
    setLeft(m * 60)
    setRunning(false)
  }

  const total = minutes * 60
  const pct = 1 - left / total
  const size = 188
  const r = 80
  const c = 2 * Math.PI * r
  const started = left < total

  return (
    <div className={`focus ${running ? 'is-running' : ''}`}>
      <div className="focus__dial">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="focus-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--electric)" />
              <stop offset="1" stopColor="var(--cyan)" />
            </linearGradient>
          </defs>
          {Array.from({ length: 60 }, (_, i) => (
            <line
              key={i}
              x1={size / 2}
              y1={8}
              x2={size / 2}
              y2={i % 5 === 0 ? 16 : 12}
              transform={`rotate(${i * 6} ${size / 2} ${size / 2})`}
              className={`focus__tick ${i / 60 < pct ? 'is-on' : ''}`}
            />
          ))}
          <circle cx={size / 2} cy={size / 2} r={r} className="focus__track" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            className="focus__bar"
            stroke="url(#focus-g)"
            strokeDasharray={c}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 0.3, ease: 'linear' }}
            style={{ rotate: -90, transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="focus__time">
          <strong className="mono">{fmt(left)}</strong>
          <span>{running ? 'concentration' : started ? 'en pause' : 'prêt'}</span>
        </div>
      </div>

      <div className="focus__presets" role="radiogroup" aria-label="Durée">
        {PRESETS.map((m) => (
          <button key={m} role="radio" aria-checked={minutes === m} className={`seg__btn ${minutes === m ? 'is-active' : ''}`} onClick={() => choose(m)} disabled={running}>
            {minutes === m && <motion.span layoutId="focus-preset" className="seg__bg" />}
            <span>{m} min</span>
          </button>
        ))}
      </div>

      <div className="focus__ctrl">
        <button className="icon-btn" onClick={reset} disabled={!started} aria-label="Réinitialiser">
          <RotateCcw size={17} />
        </button>
        {running ? (
          <button className="btn btn--primary focus__main" onClick={pause}>
            <Pause size={17} /> Pause
          </button>
        ) : (
          <button className="btn btn--primary focus__main" onClick={start}>
            <Play size={17} /> {started ? 'Reprendre' : 'Démarrer'}
          </button>
        )}
        <button className="icon-btn" onClick={finishEarly} disabled={!started} aria-label="Terminer et enregistrer" title="Terminer et enregistrer">
          <Square size={15} />
        </button>
      </div>
    </div>
  )
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
