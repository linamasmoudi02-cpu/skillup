// Hook personnalisé : lecture des favoris + ajout / retrait avec notification « Annuler ».
// Les pages le passent ensuite aux cartes par props (onToggleFavorite).
import { useCallback } from 'react'
import { useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function useFavorites() {
  const { isFavorite, dispatch } = useStore()
  const toast = useToast()

  const toggleFavorite = useCallback(
    (resource) => {
      const wasFavorite = isFavorite(resource.id)
      dispatch({ type: 'fav/toggle', resource })
      toast(wasFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris', {
        action: { label: 'Annuler', onClick: () => dispatch({ type: 'fav/toggle', resource }) },
      })
    },
    [isFavorite, dispatch, toast],
  )

  return { isFavorite, toggleFavorite }
}
