// Service d'accès à l'API publique Open Library (Module 1).
// Toute la logique réseau est ici : les composants n'appellent que ces fonctions.
// Documentation : https://openlibrary.org/developers/api

const BASE_URL = 'https://openlibrary.org'
const COVER_URL = 'https://covers.openlibrary.org/b/id'

// Catégories du filtre : "subject" = sujet Open Library, "hue" = teinte de la couverture de secours
export const CATEGORIES = [
  { id: 'programming', subject: 'programming', label: 'Programmation', hue: 215 },
  { id: 'web', subject: 'web development', label: 'Développement web', hue: 190 },
  { id: 'algo', subject: 'algorithms', label: 'Algorithmique', hue: 232 },
  { id: 'ml', subject: 'machine learning', label: 'IA & Data', hue: 262 },
  { id: 'db', subject: 'databases', label: 'Bases de données', hue: 200 },
  { id: 'math', subject: 'mathematics', label: 'Mathématiques', hue: 175 },
]

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? null

// Requête par défaut quand ni mot-clé ni catégorie ne sont choisis
const DEFAULT_QUERY = 'computer programming'

/** URL de la couverture (taille S, M ou L) à partir de son identifiant. */
export function getCoverUrl(coverId, size = 'M') {
  return coverId ? `${COVER_URL}/${coverId}-${size}.jpg` : null
}

/** Lien vers la fiche de l'œuvre sur le site Open Library. */
export const getOpenLibraryUrl = (id) => `${BASE_URL}/works/${id}`

/** Message lisible à partir d'une erreur réseau ou HTTP. */
export function toErrorMessage(error) {
  if (error instanceof TypeError) return 'Impossible de contacter Open Library. Vérifiez votre connexion internet.'
  return error.message || 'Une erreur inattendue est survenue.'
}

// Transforme un document brut de la recherche en objet « ressource » simple
function toResource(doc, categoryId) {
  return {
    id: doc.key.replace('/works/', ''), // ex. "OL17192141W"
    title: doc.title,
    author: doc.author_name?.slice(0, 3).join(', ') ?? 'Auteur inconnu',
    categoryId: categoryId || null,
    coverId: doc.cover_i ?? null,
    year: doc.first_publish_year ?? null,
    editions: doc.edition_count ?? null,
    pages: doc.number_of_pages_median ?? null,
  }
}

/**
 * Recherche de livres par mot-clé et/ou catégorie.
 * @param {string} query   mot-clé saisi (peut être vide)
 * @param {string} categoryId  id de CATEGORIES ou '' pour toutes
 * @param {AbortSignal} [signal] pour annuler la requête si l'utilisateur retape
 */
export async function searchBooks(query, categoryId, signal) {
  const params = new URLSearchParams({
    fields: 'key,title,author_name,cover_i,first_publish_year,edition_count,number_of_pages_median',
    limit: '24',
  })
  const q = query.trim()
  const category = getCategory(categoryId)
  if (q) params.set('q', q)
  if (category) params.set('subject', category.subject)
  if (!q && !category) params.set('q', DEFAULT_QUERY)

  const response = await fetch(`${BASE_URL}/search.json?${params}`, { signal })
  if (!response.ok) throw new Error(`Le serveur Open Library a répondu avec une erreur (${response.status}).`)
  const data = await response.json()
  return data.docs.filter((doc) => doc.key && doc.title).map((doc) => toResource(doc, category?.id))
}

/** Détails complets d'une œuvre : description, sujets, auteurs, couverture. */
export async function getBookDetails(id, signal) {
  const response = await fetch(`${BASE_URL}/works/${encodeURIComponent(id)}.json`, { signal })
  if (response.status === 404) throw new Error('Cette ressource est introuvable sur Open Library.')
  if (!response.ok) throw new Error(`Le serveur Open Library a répondu avec une erreur (${response.status}).`)
  const work = await response.json()

  // Les auteurs ne sont donnés que par leur clé : on récupère leurs noms en parallèle
  const authorKeys = (work.authors ?? []).map((a) => a.author?.key).filter(Boolean).slice(0, 4)
  const names = await Promise.all(
    authorKeys.map(async (key) => {
      try {
        const r = await fetch(`${BASE_URL}${key}.json`, { signal })
        return r.ok ? (await r.json()).name : null
      } catch {
        return null
      }
    }),
  )

  // La description peut être une chaîne ou un objet { value: "..." }
  const description = typeof work.description === 'string' ? work.description : work.description?.value
  const year = Number.parseInt(String(work.first_publish_date ?? '').match(/\d{4}/)?.[0], 10)

  return {
    id,
    title: work.title,
    author: names.filter(Boolean).join(', ') || 'Auteur inconnu',
    // Nettoie les références Markdown d'Open Library : « [texte][1] » et lignes « [1]: http… »
    description:
      description
        ?.replace(/\r\n/g, '\n')
        .replace(/\(?\[([^\]]*)\]\[\d+\]\)?/g, '$1')
        .replace(/^\s*\[\d+\]:.*$/gm, '')
        .replace(/^-{3,}$/gm, '')
        .trim() || null,
    subjects: (work.subjects ?? []).slice(0, 14),
    coverId: work.covers?.find((c) => c > 0) ?? null,
    year: Number.isNaN(year) ? null : year,
  }
}
