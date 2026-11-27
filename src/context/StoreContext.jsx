/* eslint-disable react-refresh/only-export-components */
// Store global de l'application : un seul useReducer, persisté dans le LocalStorage.
// Toutes les pages lisent et modifient les données via le hook useStore().

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { addDays, toKey, todayKey } from '../utils/date.js'
// v2 : les ressources viennent de l'API Open Library (cache local dans "library")
const STORAGE_KEY = 'skillup:v2'
const OLD_STORAGE_KEY = 'skillup:v1'
const MAX_ACTIVITY = 40

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

// ---------- Données de démonstration (premier lancement uniquement) ----------
function createSeed() {
  const now = new Date()
  const day = (n) => toKey(addDays(now, n))
  const ago = (hours) => new Date(now.getTime() - hours * 3600000).toISOString()

  return {
    version: 2,
    theme: 'light',
    user: { name: 'Fatma', weeklyGoal: 300 },
    // Copie locale des ressources Open Library déjà utilisées (favoris, progression) :
    // elles restent affichables même hors connexion.
    library: {
      OL17192141W: { id: 'OL17192141W', title: 'Automate the Boring Stuff with Python', author: 'Al Sweigart', categoryId: 'programming', coverId: 7363640, year: 2015 },
      OL4781294W: { id: 'OL4781294W', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest', categoryId: 'algo', coverId: 2341462, year: 1990 },
      OL2945002W: { id: 'OL2945002W', title: 'Database Design for Mere Mortals', author: 'Michael J. Hernandez', categoryId: 'db', coverId: 135738, year: 1996 },
      OL20709638W: { id: 'OL20709638W', title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', author: 'Aurélien Géron', categoryId: 'ml', coverId: 9388208, year: 2019 },
    },
    favorites: [
      { id: 'OL4781294W', collection: 'En cours', note: 'Chapitres 6 à 8 pour l’examen.', addedAt: ago(30) },
      { id: 'OL20709638W', collection: 'À voir', note: '', addedAt: ago(52) },
      { id: 'OL2945002W', collection: 'Terminé', note: 'Très utile pour le TP BD.', addedAt: ago(80) },
    ],
    progress: { OL4781294W: 45, OL2945002W: 100, OL20709638W: 20, OL17192141W: 70 },
    tasks: [
      { id: uid(), title: 'Réviser les jointures SQL', subject: 'Bases de données', due: day(0), priority: 'high', done: false, notes: 'INNER, LEFT, RIGHT + exercices du TD 4', createdAt: ago(20) },
      { id: uid(), title: 'Projet React : page Favoris', subject: 'Développement web', due: day(2), priority: 'high', done: false, notes: '', createdAt: ago(40) },
      { id: uid(), title: 'Fiche résumé — valeurs propres', subject: 'Mathématiques', due: day(4), priority: 'medium', done: false, notes: '', createdAt: ago(44) },
      { id: uid(), title: 'Lire le chapitre 3 de Pro Git', subject: 'Outils', due: day(6), priority: 'low', done: false, notes: '', createdAt: ago(60) },
      { id: uid(), title: 'Exercices sur les tris (VisuAlgo)', subject: 'Algorithmique', due: day(-1), priority: 'medium', done: true, notes: '', createdAt: ago(70) },
      { id: uid(), title: 'Quiz Kaggle Python — leçon 4', subject: 'Data', due: day(-2), priority: 'low', done: true, notes: '', createdAt: ago(90) },
    ],
    focus: [
      { at: ago(2), minutes: 25 },
      { at: ago(26), minutes: 50 },
      { at: ago(28), minutes: 25 },
      { at: ago(50), minutes: 45 },
      { at: ago(75), minutes: 25 },
      { at: ago(98), minutes: 60 },
      { at: ago(122), minutes: 30 },
    ],
    activity: [
      { id: uid(), type: 'focus', text: 'Session focus de 25 min terminée', at: ago(2) },
      { id: uid(), type: 'progress', text: 'Progression « Introduction to Algorithms » → 45 %', at: ago(5) },
      { id: uid(), type: 'task', text: 'Tâche terminée : Exercices sur les tris', at: ago(22) },
      { id: uid(), type: 'favorite', text: 'Ajouté aux favoris : Introduction to Algorithms', at: ago(30) },
      { id: uid(), type: 'task', text: 'Tâche terminée : Quiz Kaggle Python', at: ago(49) },
    ],
    chat: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && data.version === 2) return { ...createSeed(), ...data }
    }
    // Ancienne version (catalogue local) : on garde seulement le thème et le profil
    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) || 'null')
    if (old) return { ...createSeed(), theme: old.theme ?? 'light', user: old.user ?? createSeed().user }
  } catch {
    /* données corrompues : on repart de la démo */
  }
  return createSeed()
}

// Ajoute (ou met à jour) une ressource dans le cache local, sans muter l'état
const remember = (state, resource) =>
  resource ? { ...state, library: { ...state.library, [resource.id]: { ...state.library[resource.id], ...resource } } } : state

const log = (state, type, text) => ({
  ...state,
  activity: [{ id: uid(), type, text, at: new Date().toISOString() }, ...state.activity].slice(0, MAX_ACTIVITY),
})

function reducer(state, action) {
  switch (action.type) {
    case 'theme/set':
      return { ...state, theme: action.theme }

    case 'user/update':
      return { ...state, user: { ...state.user, ...action.patch } }

    // action.resource : { id, title, author, categoryId, coverId, year }
    case 'fav/toggle': {
      const { resource } = action
      const exists = state.favorites.some((f) => f.id === resource.id)
      if (exists) {
        return log({ ...state, favorites: state.favorites.filter((f) => f.id !== resource.id) }, 'favorite', `Retiré des favoris : ${resource.title}`)
      }
      // Dédoublonnage : on n'ajoute que si l'id n'est pas déjà présent (vérifié ci-dessus)
      const item = { id: resource.id, collection: 'À voir', note: '', addedAt: new Date().toISOString() }
      return log(remember({ ...state, favorites: [item, ...state.favorites] }, resource), 'favorite', `Ajouté aux favoris : ${resource.title}`)
    }
    case 'fav/restore': {
      if (state.favorites.some((f) => f.id === action.item.id)) return state
      const at = Math.min(action.index, state.favorites.length)
      // Insertion immuable (sans splice) : avant + élément + après
      return { ...state, favorites: [...state.favorites.slice(0, at), action.item, ...state.favorites.slice(at)] }
    }
    case 'fav/reorder':
      return { ...state, favorites: action.list }
    case 'fav/update':
      return {
        ...state,
        favorites: state.favorites.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f)),
      }

    case 'progress/set': {
      const value = Math.max(0, Math.min(100, Math.round(action.value)))
      const id = action.resource.id
      const title = action.resource.title ?? state.library[id]?.title ?? ''
      const next = remember({ ...state, progress: { ...state.progress, [id]: value } }, action.resource)
      return log(next, 'progress', value === 100 ? `Ressource terminée : ${title}` : `Progression « ${title} » → ${value} %`)
    }

    case 'task/add':
      return log({ ...state, tasks: [action.task, ...state.tasks] }, 'task', `Nouvelle tâche : ${action.task.title}`)
    case 'task/update':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) }
    case 'task/toggle': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state
      const next = { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) }
      return task.done ? next : log(next, 'task', `Tâche terminée : ${task.title}`)
    }
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }
    case 'task/restore':
      return { ...state, tasks: [action.task, ...state.tasks.filter((t) => t.id !== action.task.id)] }

    case 'focus/log':
      return log(
        { ...state, focus: [{ at: new Date().toISOString(), minutes: action.minutes }, ...state.focus].slice(0, 200) },
        'focus',
        `Session focus de ${action.minutes} min terminée`,
      )

    case 'chat/add':
      return { ...state, chat: [...state.chat, action.message].slice(-80) }
    case 'chat/clear':
      return { ...state, chat: [] }

    case 'reset':
      return { ...createSeed(), theme: state.theme }

    default:
      return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  // Persistance automatique à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota dépassé ou navigation privée : on ignore */
    }
  }, [state])

  // Applique le thème sur <html>
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#04060f' : '#eef2fb')
  }, [state.theme])

  const isFavorite = useCallback((id) => state.favorites.some((f) => f.id === id), [state.favorites])
  const getResource = useCallback((id) => state.library[id] ?? null, [state.library])

  const stats = useMemo(() => computeStats(state), [state])

  const value = useMemo(() => ({ state, dispatch, isFavorite, getResource, stats }), [state, isFavorite, getResource, stats])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}

// ---------- Statistiques dérivées (jamais stockées) ----------
function computeStats(state) {
  const today = todayKey()
  const tasksDone = state.tasks.filter((t) => t.done).length
  const tasksOpen = state.tasks.length - tasksDone
  const overdue = state.tasks.filter((t) => !t.done && t.due < today).length
  const dueToday = state.tasks.filter((t) => !t.done && t.due === today).length

  const progressValues = Object.values(state.progress)
  const completed = progressValues.filter((v) => v >= 100).length
  const started = progressValues.filter((v) => v > 0 && v < 100).length
  const avgProgress = progressValues.length ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : 0

  // Minutes de focus sur les 7 derniers jours, jour par jour
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6)
    const key = toKey(d)
    const minutes = state.focus.filter((f) => toKey(new Date(f.at)) === key).reduce((a, f) => a + f.minutes, 0)
    return { key, label: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()], minutes }
  })
  const weekMinutes = week.reduce((a, d) => a + d.minutes, 0)

  // Série : jours consécutifs avec une activité (aujourd'hui ou hier inclus)
  const days = new Set(state.activity.map((a) => toKey(new Date(a.at))))
  state.focus.forEach((f) => days.add(toKey(new Date(f.at))))
  let streak = 0
  let cursor = days.has(today) ? new Date() : addDays(new Date(), -1)
  while (days.has(toKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return {
    tasksDone,
    tasksOpen,
    tasksTotal: state.tasks.length,
    taskRate: state.tasks.length ? Math.round((tasksDone / state.tasks.length) * 100) : 0,
    overdue,
    dueToday,
    completed,
    started,
    avgProgress,
    week,
    weekMinutes,
    goalRate: Math.min(100, Math.round((weekMinutes / Math.max(1, state.user.weeklyGoal)) * 100)),
    streak,
  }
}
