// Service d'appel à l'Intelligence Artificielle (Module 4 — Questions / Réponses).
// La clé n'est JAMAIS écrite dans le code : elle est lue depuis le fichier .env.local
// grâce à import.meta.env (seules les variables préfixées par VITE_ sont exposées par Vite).

const API_KEY = import.meta.env.VITE_AI_API_KEY

// Fournisseur : "gemini" (par défaut) ou "groq". Modifiable dans .env.local.
const PROVIDER = (import.meta.env.VITE_AI_PROVIDER || 'gemini').toLowerCase()

// Modèle utilisé (modifiable dans .env.local si un modèle n'est plus disponible).
const MODEL = import.meta.env.VITE_AI_MODEL || (PROVIDER === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-3.6-flash')

// Consigne donnée à l'IA pour obtenir des réponses pédagogiques, en français.
const INSTRUCTIONS =
  "Tu es l'assistant pédagogique de SkillUp. Réponds en français, de façon claire, simple et concise, " +
  'comme à un étudiant en informatique. Donne un petit exemple si c’est utile. Réponds en texte simple, ' +
  'avec au plus quelques listes à puces.'

/** Vrai si une clé est configurée dans .env.local. */
export const isAIConfigured = Boolean(API_KEY && API_KEY !== 'votre_cle_ici')
export const AI_PROVIDER_LABEL = PROVIDER === 'groq' ? `Groq · ${MODEL}` : `Google Gemini · ${MODEL}`

// Traduit le code HTTP d'erreur en message convivial pour l'utilisateur.
function errorMessage(status) {
  if (status === 400 || status === 401 || status === 403) {
    return 'Clé API invalide ou non autorisée. Vérifiez VITE_AI_API_KEY dans le fichier .env.local.'
  }
  if (status === 404) return 'Modèle IA introuvable. Vérifiez VITE_AI_MODEL dans le fichier .env.local.'
  if (status === 429) return 'Trop de questions en peu de temps. Patientez un moment puis réessayez.'
  if (status >= 500) return 'Le service IA est momentanément indisponible. Réessayez plus tard.'
  return `Erreur du service IA (code ${status}).`
}

// Appel à Google Gemini (endpoint REST generateContent).
async function askGemini(question, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
    }),
  })
  if (!response.ok) throw new Error(errorMessage(response.status))
  const data = await response.json()
  // Le texte se trouve dans candidates[0].content.parts[].text
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.map((p) => p.text ?? '').join('')
}

// Appel à Groq (API compatible OpenAI : /chat/completions).
async function askGroq(question, signal) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: INSTRUCTIONS },
        { role: 'user', content: question },
      ],
    }),
  })
  if (!response.ok) throw new Error(errorMessage(response.status))
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/**
 * Envoie la question au service IA et retourne le texte brut de la réponse.
 * Lève une Error avec un message convivial en cas de problème.
 */
export async function askAI(question, signal) {
  if (!isAIConfigured) {
    throw new Error('Clé API manquante : ajoutez VITE_AI_API_KEY dans le fichier .env.local, puis relancez « npm run dev ».')
  }
  let answer
  try {
    answer = PROVIDER === 'groq' ? await askGroq(question, signal) : await askGemini(question, signal)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error instanceof TypeError) throw new Error('Impossible de joindre le service IA. Vérifiez votre connexion internet.')
    throw error
  }
  if (!answer.trim()) throw new Error("L'assistant n'a renvoyé aucune réponse. Reformulez votre question.")
  return answer.trim()
}
