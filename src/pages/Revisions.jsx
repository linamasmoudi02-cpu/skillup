// Page 4 — Révisions (route /revisions) : tâches (CRUD), priorités, échéances,
// checklist interactive, progression et calendrier mensuel.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ListChecks, Plus, Search, X } from 'lucide-react'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { TaskItem, TaskModal } from '../components/Tasks.jsx'
import { Magnetic, ProgressRing } from '../components/Motion.jsx'
import { MONTHS, WEEKDAYS, formatShort, monthGrid, toKey, todayKey } from '../utils/date.js'

// Filtres demandés : Toutes / En cours / Terminées, + raccourcis par échéance
const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'open', label: 'En cours' },
  { id: 'done', label: 'Terminées' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'upcoming', label: 'À venir' },
  { id: 'overdue', label: 'En retard' },
]

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export default function Revisions() {
  const { state, dispatch, stats } = useStore()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState('all')
  const [priority, setPriority] = useState('')
  const [query, setQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [modal, setModal] = useState({ open: false, task: null })
  const today = todayKey()

  // ?new=1 (depuis la palette ou l'accueil) ouvre directement la modale
  useEffect(() => {
    if (params.get('new')) {
      setModal({ open: true, task: null })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const closeModal = useCallback(() => setModal({ open: false, task: null }), [])

  const counts = useMemo(() => {
    const open = state.tasks.filter((t) => !t.done)
    return {
      all: state.tasks.length,
      open: open.length,
      today: open.filter((t) => t.due === today).length,
      upcoming: open.filter((t) => t.due > today).length,
      overdue: open.filter((t) => t.due < today).length,
      done: state.tasks.length - open.length,
    }
  }, [state.tasks, today])

  const tasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.tasks
      .filter((t) => {
        if (selectedDay && t.due !== selectedDay) return false
        if (filter === 'open' && t.done) return false
        if (filter === 'today' && (t.done || t.due !== today)) return false
        if (filter === 'upcoming' && (t.done || t.due <= today)) return false
        if (filter === 'overdue' && (t.done || t.due >= today)) return false
        if (filter === 'done' && !t.done) return false
        if (priority && t.priority !== priority) return false
        if (q && !`${t.title} ${t.subject} ${t.notes}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  }, [state.tasks, filter, priority, query, selectedDay, today])

  const save = (task) => {
    if (modal.task) {
      dispatch({ type: 'task/update', id: task.id, patch: task })
      toast('Tâche modifiée')
    } else {
      dispatch({ type: 'task/add', task })
      toast('Tâche ajoutée au planning')
    }
    closeModal()
  }

  const remove = (task) => {
    dispatch({ type: 'task/delete', id: task.id })
    toast(`« ${task.title} » supprimée`, { action: { label: 'Annuler', onClick: () => dispatch({ type: 'task/restore', task }) } })
  }

  const toggle = (id) => {
    const t = state.tasks.find((x) => x.id === id)
    dispatch({ type: 'task/toggle', id })
    if (t && !t.done && stats.tasksOpen === 1) toast('Toutes vos tâches sont terminées 🎉')
  }

  const clearDone = () => {
    const done = state.tasks.filter((t) => t.done)
    done.forEach((t) => dispatch({ type: 'task/delete', id: t.id }))
    toast(`${done.length} tâche(s) terminée(s) archivée(s)`, {
      action: { label: 'Annuler', onClick: () => done.forEach((t) => dispatch({ type: 'task/restore', task: t })) },
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="04 — Organisation"
        title="Mes"
        accent="révisions."
        actions={
          <Magnetic className="btn btn--primary btn--lg" onClick={() => setModal({ open: true, task: null })}>
            <Plus size={18} /> Nouvelle tâche
          </Magnetic>
        }
      >
        Planifiez vos révisions, fixez des priorités et regardez votre progression grandir. Cliquez sur un jour du calendrier pour filtrer.
      </PageHeader>

      <div className="planner">
        <aside className="planner__side">
          <Calendar tasks={state.tasks} selected={selectedDay} onSelect={setSelectedDay} />

          <section className="glass panel planner__progress">
            <ProgressRing value={stats.taskRate} size={118} stroke={10} label="terminé" />
            <div className="planner__nums">
              <div>
                <strong className="mono">{stats.tasksDone}</strong>
                <span>terminées</span>
              </div>
              <div>
                <strong className="mono">{stats.tasksOpen}</strong>
                <span>en cours</span>
              </div>
              <div className={stats.overdue ? 'is-late' : ''}>
                <strong className="mono">{stats.overdue}</strong>
                <span>en retard</span>
              </div>
            </div>
          </section>
        </aside>

        <section className="glass panel planner__main">
          <div className="planner__tools">
            <div className="chips chips--tight" role="tablist" aria-label="Filtrer les tâches">
              {FILTERS.map((f) => (
                <button key={f.id} role="tab" aria-selected={filter === f.id} className={`chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
                  {filter === f.id && <motion.span layoutId="task-pill" className="chip__bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  <span>{f.label}</span>
                  <span className="chip__count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <div className="planner__row">
              <div className="search search--sm">
                <Search size={16} className="search__icon" />
                <input className="search__input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une tâche…" aria-label="Rechercher une tâche" />
              </div>
              <select className="select planner__prio" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filtrer par priorité">
                <option value="">Toutes priorités</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <AnimatePresence>
              {selectedDay && (
                <motion.div className="day-filter" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <span className="tag tag--accent">
                    Jour : {formatShort(selectedDay)}
                    <button onClick={() => setSelectedDay(null)} aria-label="Retirer le filtre de jour">
                      <X size={12} />
                    </button>
                  </span>
                  <button className="link-btn" onClick={() => setModal({ open: true, task: null })}>
                    <Plus size={14} /> Ajouter ce jour-là
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {tasks.length ? (
            <ul className="tasks">
              <AnimatePresence initial={false} mode="popLayout">
                {tasks.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={toggle} onEdit={(task) => setModal({ open: true, task })} onDelete={remove} />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <div className="empty">
              <div className="empty__icon">
                <ListChecks size={28} />
              </div>
              <h3>Rien à afficher</h3>
              <p>{state.tasks.length ? 'Aucune tâche ne correspond à ces filtres.' : 'Ajoutez votre première tâche pour commencer à planifier.'}</p>
              <button className="btn btn--primary" onClick={() => setModal({ open: true, task: null })}>
                <Plus size={16} /> Nouvelle tâche
              </button>
            </div>
          )}

          {counts.done > 0 && (
            <div className="planner__foot">
              <button className="link-btn" onClick={clearDone}>
                Archiver les {counts.done} tâche(s) terminée(s)
              </button>
            </div>
          )}
        </section>
      </div>

      <TaskModal open={modal.open} task={modal.task} defaultDue={selectedDay} onClose={closeModal} onSave={save} />
    </>
  )
}

function Calendar({ tasks, selected, onSelect }) {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [dir, setDir] = useState(0)
  const days = monthGrid(view.y, view.m)
  const today = todayKey()

  const byDay = useMemo(() => {
    // Regroupe les tâches par date, sans muter de tableau existant
    return tasks.reduce((map, t) => ({ ...map, [t.due]: [...(map[t.due] ?? []), t] }), {})
  }, [tasks])

  const shift = (n) => {
    setDir(n)
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  return (
    <section className="glass panel calendar">
      <div className="calendar__head">
        <div>
          <span className="eyebrow">Calendrier</span>
          <h2 className="calendar__month">
            <span className="serif">{MONTHS[view.m]}</span> <span className="mono">{view.y}</span>
          </h2>
        </div>
        <div className="row">
          <button className="icon-btn icon-btn--sm" onClick={() => shift(-1)} aria-label="Mois précédent">
            <ChevronLeft size={16} />
          </button>
          <button
            className="btn btn--sm"
            onClick={() => {
              setView({ y: now.getFullYear(), m: now.getMonth() })
              onSelect(today)
            }}
          >
            Auj.
          </button>
          <button className="icon-btn icon-btn--sm" onClick={() => shift(1)} aria-label="Mois suivant">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar__weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${view.y}-${view.m}`}
          className="calendar__grid"
          initial={{ opacity: 0, x: dir * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -30 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {days.map((d) => {
            const key = toKey(d)
            const list = byDay[key] ?? []
            const open = list.filter((t) => !t.done)
            const outside = d.getMonth() !== view.m
            const isSel = selected === key
            return (
              <button
                key={key}
                className={`cal-day ${outside ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${isSel ? 'is-selected' : ''}`}
                onClick={() => onSelect(isSel ? null : key)}
                aria-pressed={isSel}
                aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]} : ${list.length} tâche(s)`}
              >
                {isSel && <motion.span layoutId="cal-sel" className="cal-day__sel" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                <span className="cal-day__n">{d.getDate()}</span>
                {list.length > 0 && (
                  <span className="cal-day__dots">
                    {list.slice(0, 3).map((t) => (
                      <i key={t.id} className={`dot dot--${t.done ? 'done' : t.priority}`} />
                    ))}
                  </span>
                )}
                {open.length > 0 && key < today && <span className="cal-day__late" />}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <div className="calendar__legend">
        <span>
          <i className="dot dot--high" /> Haute
        </span>
        <span>
          <i className="dot dot--medium" /> Moyenne
        </span>
        <span>
          <i className="dot dot--low" /> Basse
        </span>
        <span>
          <i className="dot dot--done" /> Faite
        </span>
      </div>
    </section>
  )
}
