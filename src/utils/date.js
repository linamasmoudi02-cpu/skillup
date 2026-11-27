// Petites fonctions de dates (sans dépendance externe).
// Les dates de tâches sont stockées en "YYYY-MM-DD" (heure locale).

export const pad = (n) => String(n).padStart(2, '0')

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export const addDays = (date, n) => {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Nombre de jours entre aujourd'hui et la date (négatif = en retard). */
export const daysUntil = (key) => {
  const t = fromKey(todayKey())
  return Math.round((fromKey(key) - t) / 86400000)
}

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export const formatShort = (key) => {
  const d = fromKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4).replace(/\.$/, '')}.`
}

export const relativeDue = (key) => {
  const n = daysUntil(key)
  if (n === 0) return "Aujourd'hui"
  if (n === 1) return 'Demain'
  if (n === -1) return 'Hier'
  if (n < 0) return `En retard de ${-n} j`
  if (n < 7) return `Dans ${n} jours`
  return formatShort(key)
}

export const timeAgo = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  const m = Math.round(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}

/** Grille de 42 cases (6 semaines) commençant un lundi. */
export const monthGrid = (year, month) => {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}
