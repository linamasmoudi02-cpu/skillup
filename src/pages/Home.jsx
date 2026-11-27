// Page 1 — Accueil : hero personnalisé + orbe 3D, statistiques animées,
// minuteur focus, progression hebdo, recommandations et activité récente.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BookCheck, CalendarClock, CheckCircle2, Flame, Heart, ListChecks, Sparkles, Timer, TrendingUp } from 'lucide-react'
import { getCategory, searchBooks, toErrorMessage } from '../services/openLibraryApi.js'
import { useStore } from '../context/StoreContext.jsx'
import useFavorites from '../hooks/useFavorites.js'
import HoloOrb from '../components/HoloOrb.jsx'
import FocusTimer from '../components/FocusTimer.jsx'
import ResourceCard from '../components/ResourceCard.jsx'
import { ErrorNotice, Loader } from '../components/Feedback.jsx'
import { TaskItem } from '../components/Tasks.jsx'
import { SplitWords } from '../components/PageHeader.jsx'
import { Counter, EASE, Magnetic, MotionLink, ProgressRing, Reveal, TiltCard, rise, stagger } from '../components/Motion.jsx'
import { greeting, timeAgo, todayKey } from '../utils/date.js'

const ACTIVITY_ICON = { task: CheckCircle2, favorite: Heart, progress: TrendingUp, focus: Timer }

export default function Home() {
  const { state, stats, dispatch, getResource } = useStore()
  const { isFavorite, toggleFavorite } = useFavorites()
  const navigate = useNavigate()
  const open = (id) => navigate(`/ressources/${id}`)
  const [params] = useSearchParams()
  const autoFocus = params.get('focus') === '1'
  const today = todayKey()

  // Ressource à reprendre : celle en cours la plus avancée
  const resume = useMemo(() => {
    const entries = Object.entries(state.progress).filter(([id, v]) => v > 0 && v < 100 && getResource(id))
    entries.sort((a, b) => b[1] - a[1])
    return entries[0] ? { r: getResource(entries[0][0]), v: entries[0][1] } : null
  }, [state.progress, getResource])

  // Catégorie préférée : celle qui revient le plus dans les favoris
  const favoriteCategory = useMemo(() => {
    const counts = state.favorites.reduce((acc, f) => {
      const c = getResource(f.id)?.categoryId
      return c ? { ...acc, [c]: (acc[c] ?? 0) + 1 } : acc
    }, {})
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'programming'
  }, [state.favorites, getResource])

  // Recommandations chargées depuis Open Library (hors livres déjà commencés)
  const [recommended, setRecommended] = useState([])
  const [recoLoading, setRecoLoading] = useState(true)
  const [recoError, setRecoError] = useState(null)
  const [recoReload, setRecoReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setRecoLoading(true)
    setRecoError(null)
    searchBooks('', favoriteCategory, controller.signal)
      .then((list) => setRecommended(list.filter((r) => r.coverId && !(r.id in state.progress)).slice(0, 3)))
      .catch((e) => {
        if (e.name !== 'AbortError') setRecoError(toErrorMessage(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecoLoading(false)
      })
    return () => controller.abort()
    // state.progress volontairement absent : on ne recharge pas à chaque changement de progression
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteCategory, recoReload])

  const upcoming = state.tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4)

  const maxDay = Math.max(60, ...stats.week.map((d) => d.minutes))
  // Les barres démarrent à scaleY(0) : on observe le conteneur (une barre de hauteur nulle n'est jamais « visible »)
  const weekRef = useRef(null)
  const weekInView = useInView(weekRef, { once: true, margin: '-40px' })

  const summary =
    stats.overdue > 0
      ? `${stats.overdue} tâche${stats.overdue > 1 ? 's' : ''} en retard et ${stats.dueToday} pour aujourd'hui. On s'y met ?`
      : stats.dueToday > 0
        ? `${stats.dueToday} tâche${stats.dueToday > 1 ? 's' : ''} prévue${stats.dueToday > 1 ? 's' : ''} aujourd'hui. Votre série est de ${stats.streak} jour${stats.streak > 1 ? 's' : ''} — gardez le rythme.`
        : `Rien d'urgent aujourd'hui. C'est le moment idéal pour avancer une ressource.`

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="hero__text">
          <motion.span className="eyebrow" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            01 — Votre espace d'apprentissage
          </motion.span>
          <h1 className="hero__title display">
            <SplitWords text={`${greeting()},`} />
            <br />
            <motion.span className="serif gradient-text hero__name" initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.3, duration: 1, ease: EASE }}>
              {state.user.name}.
            </motion.span>
          </h1>
          <motion.p className="hero__lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
            {summary}
          </motion.p>
          <motion.div className="hero__cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7, ease: EASE }}>
            {resume ? (
              <Magnetic className="btn btn--primary btn--lg" onClick={() => open(resume.r.id)}>
                Reprendre « {resume.r.title.length > 22 ? `${resume.r.title.slice(0, 22)}…` : resume.r.title} » <ArrowRight size={17} />
              </Magnetic>
            ) : (
              <Magnetic as={MotionLink} to="/ressources" className="btn btn--primary btn--lg">
                Explorer les ressources <ArrowRight size={17} />
              </Magnetic>
            )}
            <Magnetic as={MotionLink} to="/revisions?new=1" className="btn btn--lg">
              <CalendarClock size={17} /> Planifier
            </Magnetic>
          </motion.div>
        </div>

        <motion.div className="hero__visual" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 1.2, ease: EASE }}>
          <HoloOrb size={340} />
          <FloatChip className="hero__chip hero__chip--a" delay={0.9} icon={Flame} label="Série" value={`${stats.streak} j`} />
          <FloatChip className="hero__chip hero__chip--b" delay={1.05} icon={TrendingUp} label="Progression" value={`${stats.avgProgress} %`} />
          <FloatChip className="hero__chip hero__chip--c" delay={1.2} icon={Timer} label="Cette semaine" value={`${stats.weekMinutes} min`} />
        </motion.div>
      </section>

      {/* ---------- STATISTIQUES ---------- */}
      <motion.section className="stats" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
        <StatCard icon={Flame} label="Jours de série" value={stats.streak} foot="Continuez demain pour l'agrandir" tone="rose" />
        <StatCard icon={Timer} label="Minutes de focus" value={stats.weekMinutes} foot={`Objectif : ${state.user.weeklyGoal} min / semaine`} />
        <StatCard icon={ListChecks} label="Tâches terminées" value={stats.tasksDone} total={stats.tasksTotal} foot={`${stats.tasksOpen} encore ouvertes`} />
        <StatCard icon={BookCheck} label="Ressources terminées" value={stats.completed} foot={`${stats.started} en cours d'apprentissage`} tone="mint" />
      </motion.section>

      {/* ---------- PROGRESSION + FOCUS ---------- */}
      <div className="home-grid">
        <Reveal className="glass panel glow-border progress-panel">
          <div className="panel__head">
            <div>
              <span className="eyebrow">Suivi</span>
              <h2 className="panel__title">Votre progression</h2>
            </div>
            <Link to="/revisions" className="link-btn">
              Planner <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="rings">
            <div className="rings__item">
              <ProgressRing value={stats.goalRate} size={112} stroke={9} label="objectif" />
              <span>Objectif hebdo</span>
            </div>
            <div className="rings__item">
              <ProgressRing value={stats.taskRate} size={112} stroke={9} label="tâches" tone="rose" />
              <span>Tâches faites</span>
            </div>
            <div className="rings__item">
              <ProgressRing value={stats.avgProgress} size={112} stroke={9} label="ressources" tone="mint" />
              <span>Ressources suivies</span>
            </div>
          </div>

          <div className="week">
            <div className="week__head">
              <span className="eyebrow">Focus · 7 derniers jours</span>
              <span className="mono muted">{stats.weekMinutes} min</span>
            </div>
            <div className="week__bars" ref={weekRef}>
              {stats.week.map((d, i) => (
                <div key={d.key} className={`week__col ${d.key === today ? 'is-today' : ''}`} title={`${d.minutes} min`}>
                  <span className="week__val mono">{d.minutes || ''}</span>
                  <div className="week__track">
                    <motion.span
                      className="week__bar"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: weekInView ? d.minutes / maxDay : 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.9, ease: EASE }}
                    />
                  </div>
                  <span className="week__day mono">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="glass panel glow-border focus-panel" delay={0.1}>
          <div className="panel__head">
            <div>
              <span className="eyebrow">Concentration</span>
              <h2 className="panel__title">Session focus</h2>
            </div>
            <span className="tag tag--accent">
              <Sparkles size={12} /> Pomodoro
            </span>
          </div>
          <FocusTimer autoStart={autoFocus} />
        </Reveal>
      </div>

      {/* ---------- RECOMMANDATIONS ---------- */}
      <section className="section">
        <Reveal className="section__head">
          <div>
            <span className="eyebrow">Sélection pour vous · {getCategory(favoriteCategory)?.label}</span>
            <h2 className="section__title display">
              Recommandé <span className="serif gradient-text">aujourd'hui</span>
            </h2>
          </div>
          <Link to="/ressources" className="link-btn">
            Toute la bibliothèque <ArrowUpRight size={14} />
          </Link>
        </Reveal>
        {recoLoading ? (
          <Loader label="Recherche de recommandations sur Open Library…" />
        ) : recoError ? (
          <ErrorNotice title="Recommandations indisponibles" message={recoError} onRetry={() => setRecoReload((k) => k + 1)} />
        ) : (
          <div className="rgrid rgrid--3">
            {recommended.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.08}>
                <ResourceCard resource={r} progress={state.progress[r.id] ?? 0} isFavorite={isFavorite(r.id)} onToggleFavorite={toggleFavorite} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ---------- TÂCHES + ACTIVITÉ ---------- */}
      <div className="home-grid home-grid--even">
        <Reveal className="glass panel glow-border">
          <div className="panel__head">
            <div>
              <span className="eyebrow">À venir</span>
              <h2 className="panel__title">Prochaines tâches</h2>
            </div>
            <Link to="/revisions" className="link-btn">
              Tout voir <ArrowUpRight size={14} />
            </Link>
          </div>
          {upcoming.length ? (
            <ul className="tasks">
              {upcoming.map((t) => (
                <TaskItem key={t.id} task={t} compact onToggle={(id) => dispatch({ type: 'task/toggle', id })} />
              ))}
            </ul>
          ) : (
            <p className="muted">Aucune tâche ouverte. 🎉</p>
          )}
        </Reveal>

        <Reveal className="glass panel glow-border" delay={0.1}>
          <div className="panel__head">
            <div>
              <span className="eyebrow">Journal</span>
              <h2 className="panel__title">Activité récente</h2>
            </div>
          </div>
          <ol className="timeline">
            {state.activity.slice(0, 6).map((a, i) => {
              const Icon = ACTIVITY_ICON[a.type] ?? Sparkles
              return (
                <motion.li
                  key={a.id}
                  className={`timeline__item timeline__item--${a.type}`}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                >
                  <span className="timeline__icon">
                    <Icon size={14} />
                  </span>
                  <div>
                    <p>{a.text}</p>
                    <span className="mono muted">{timeAgo(a.at)}</span>
                  </div>
                </motion.li>
              )
            })}
            {state.activity.length === 0 && <p className="muted">Votre activité apparaîtra ici.</p>}
          </ol>
        </Reveal>
      </div>

    </>
  )
}

function FloatChip({ icon: Icon, label, value, className, delay }) {
  return (
    <motion.div className={`float-chip glass ${className}`} initial={{ opacity: 0, scale: 0.6, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay, duration: 0.8, ease: EASE }}>
      <span className="float-chip__icon">
        <Icon size={15} />
      </span>
      <span>
        <span className="float-chip__label">{label}</span>
        <strong className="mono">{value}</strong>
      </span>
    </motion.div>
  )
}

function StatCard({ icon: Icon, label, value, total, foot, tone = 'accent' }) {
  return (
    <motion.div variants={rise}>
      <TiltCard className={`stat glass glow-border stat--${tone}`} max={8}>
        <div className="stat__top">
          <span className="stat__icon">
            <Icon size={18} />
          </span>
          <span className="eyebrow">{label}</span>
        </div>
        <strong className="stat__value">
          <Counter value={value} />
          {total != null && <span className="stat__total">/{total}</span>}
        </strong>
        <p className="stat__foot">{foot}</p>
      </TiltCard>
    </motion.div>
  )
}
