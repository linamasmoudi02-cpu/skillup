// Composants de tâches : case à cocher animée, ligne de tâche, modale d'édition.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Pencil, Trash2, X } from 'lucide-react'
import { relativeDue, todayKey } from '../utils/date.js'
import { uid } from '../context/StoreContext.jsx'
import Portal from './Portal.jsx'

export const PRIORITIES = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
}

/** Case à cocher dont la coche se dessine + petite explosion de particules. */
export function CheckBox({ checked, onChange, label }) {
  return (
    <motion.button
      className={`check ${checked ? 'is-checked' : ''}`}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      whileTap={{ scale: 0.82 }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <motion.path
          d="M5 12.5 L10 17 L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <AnimatePresence>
        {checked && (
          <motion.span className="check__burst" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <motion.i
                key={i}
                initial={{ x: 0, y: 0, scale: 1 }}
                animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 22, y: Math.sin((i / 8) * Math.PI * 2) * 22, scale: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function TaskItem({ task, onToggle, onEdit, onDelete, compact = false }) {
  const today = todayKey()
  const overdue = !task.done && task.due < today
  return (
    <motion.li
      layout
      className={`task ${task.done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''} ${compact ? 'task--compact' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.22 } }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className={`task__prio task__prio--${task.priority}`} aria-hidden="true" />
      <CheckBox checked={task.done} onChange={() => onToggle(task.id)} label={`Marquer « ${task.title} » comme ${task.done ? 'non terminée' : 'terminée'}`} />
      <div className="task__main">
        <p className="task__title">{task.title}</p>
        <div className="task__meta">
          <span className={`status ${task.done ? 'status--done' : 'status--open'}`}>{task.done ? 'Terminée' : 'En cours'}</span>
          {task.subject && <span className="task__subject">{task.subject}</span>}
          <span className={`task__due mono ${overdue ? 'is-late' : ''}`}>
            <CalendarDays size={12} /> {relativeDue(task.due)}
          </span>
          {!compact && <span className={`prio prio--${task.priority}`}>{PRIORITIES[task.priority]}</span>}
        </div>
        {!compact && task.notes && <p className="task__notes">{task.notes}</p>}
      </div>
      {!compact && (
        <div className="task__actions">
          <button className="icon-btn icon-btn--sm" onClick={() => onEdit(task)} aria-label={`Modifier « ${task.title} »`} title="Modifier">
            <Pencil size={14} />
          </button>
          <button className="icon-btn icon-btn--sm task__delete" onClick={() => onDelete(task)} aria-label={`Supprimer « ${task.title} »`} title="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </motion.li>
  )
}

const EMPTY = { title: '', subject: '', due: '', priority: 'medium', notes: '' }

/** Modale d'ajout / modification avec validation. */
export function TaskModal({ open, task, defaultDue, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(task ? { ...EMPTY, ...task } : { ...EMPTY, due: defaultDue || todayKey() })
      setErrors({})
    }
  }, [open, task, defaultDue])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (form.title.trim().length < 2) errs.title = 'Donnez un titre (2 caractères minimum).'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.due)) errs.due = 'Choisissez une date valide.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const clean = { ...form, title: form.title.trim(), subject: form.subject.trim(), notes: form.notes.trim() }
    onSave(task ? clean : { ...clean, id: uid(), done: false, createdAt: new Date().toISOString() })
  }

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.form
            className="modal"
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            initial={{ opacity: 0, y: 40, scale: 0.95, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ transformPerspective: 1000 }}
            noValidate
          >
            <div className="modal__head">
              <div>
                <span className="eyebrow">{task ? 'Modifier' : 'Nouvelle tâche'}</span>
                <h2 id="task-modal-title" className="modal__title">
                  {task ? 'Ajuster la tâche' : 'Planifier une tâche'}
                </h2>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <label className="field span-2">
                <span className="field__label">Titre *</span>
                <input className="input" value={form.title} onChange={set('title')} placeholder="Ex. Réviser le chapitre 4" autoFocus maxLength={90} aria-invalid={!!errors.title} />
                {errors.title && <span className="field__error">{errors.title}</span>}
              </label>
              <label className="field">
                <span className="field__label">Matière</span>
                <input className="input" value={form.subject} onChange={set('subject')} placeholder="Ex. Mathématiques" maxLength={40} list="subjects" />
                <datalist id="subjects">
                  {['Mathématiques', 'Développement web', 'Algorithmique', 'Bases de données', 'Data', 'Anglais', 'Outils'].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span className="field__label">Échéance *</span>
                <input className="input" type="date" value={form.due} onChange={set('due')} aria-invalid={!!errors.due} />
                {errors.due && <span className="field__error">{errors.due}</span>}
              </label>
              <fieldset className="field span-2 prio-pick">
                <legend className="field__label">Priorité</legend>
                <div className="row">
                  {Object.entries(PRIORITIES).map(([k, v]) => (
                    <label key={k} className={`prio-opt prio--${k} ${form.priority === k ? 'is-active' : ''}`}>
                      <input type="radio" name="priority" value={k} checked={form.priority === k} onChange={set('priority')} className="sr-only" />
                      <span className={`prio prio--${k}`}>{v}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field span-2">
                <span className="field__label">Description (facultative)</span>
                <textarea className="textarea" value={form.notes} onChange={set('notes')} placeholder="Détails, pages, exercices…" maxLength={300} />
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn--primary">
                {task ? 'Enregistrer' : 'Ajouter la tâche'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  )
}
