import { CalendarCheck2, Heart, LayoutDashboard, Library, Sparkles } from 'lucide-react'

// Les cinq pages de l'application (utilisé par la sidebar, la barre mobile et la palette).
export const NAV = [
  { to: '/', label: 'Accueil', short: 'Accueil', icon: LayoutDashboard, title: 'Tableau de bord', index: '01' },
  { to: '/ressources', label: 'Ressources', short: 'Ressources', icon: Library, title: 'Ressources', index: '02' },
  { to: '/favoris', label: 'Favoris', short: 'Favoris', icon: Heart, title: 'Favoris', index: '03' },
  { to: '/revisions', label: 'Révisions', short: 'Révisions', icon: CalendarCheck2, title: 'Révisions', index: '04' },
  { to: '/assistant', label: 'Assistant IA', short: 'Assistant', icon: Sparkles, title: 'Assistant', index: '05' },
]

export const navFor = (pathname) =>
  NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))) ?? NAV[0]
