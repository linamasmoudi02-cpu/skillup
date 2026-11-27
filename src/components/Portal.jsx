// Rend les superpositions (modales, panneaux) directement dans <body>,
// hors des conteneurs animés (transform/filter) qui casseraient position: fixed.
import { createPortal } from 'react-dom'

export default function Portal({ children }) {
  return createPortal(children, document.body)
}
