import { ArrowLeft } from 'lucide-react'
import HoloOrb from '../components/HoloOrb.jsx'
import { Magnetic, MotionLink } from '../components/Motion.jsx'

export default function NotFound() {
  return (
    <section className="notfound">
      <HoloOrb size={220}>
        <strong className="notfound__code mono">404</strong>
      </HoloOrb>
      <h1 className="display">
        Cette page s'est <span className="serif gradient-text">perdue en orbite.</span>
      </h1>
      <p className="muted">L'adresse demandée n'existe pas dans SkillUp.</p>
      <Magnetic as={MotionLink} to="/" className="btn btn--primary btn--lg">
        <ArrowLeft size={17} /> Retour à l'accueil
      </Magnetic>
    </section>
  )
}
